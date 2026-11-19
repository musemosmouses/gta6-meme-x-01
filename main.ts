// gta6-meme-x-01 — "WAITED 13 YEARS FOR GTA 6 / MY make.fun AGENT BOUGHT IT DAY ONE"
// Node 22, standard library only, no network. Deterministic: the same run
// always writes the same meme.png bytes.
// It composes the meme from the make.fun ghost mark (ghost.png, from
// https://make.fun/press/ mark-1024.png) on a Vice City sunset, draws the
// caption in a built-in 5x7 bitmap font, and copies POST.json to the output
// directory where the gate reads it.
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const W = 1200;
const H = 675;

// CRC-32 (IEEE, polynomial 0xEDB88320) for PNG chunks.
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

// Encode an RGB pixel buffer (width w, height h, 3 bytes per pixel) as a PNG.
// Every scanline uses filter 0 (None), so the output is fully deterministic.
function encodePng(w: number, h: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 3)] = 0;
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (1 + w * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type 2 = RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Minimal PNG decoder: 8-bit, non-interlaced, color types 2 (RGB) and 6 (RGBA).
// Enough for the make.fun press mark (1024x1024 RGBA). Throws on anything else.
function decodePng(buf: Buffer): { width: number; height: number; rgba: Uint8Array } {
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error('not a PNG');
  }
  let off = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rgba = new Uint8Array(width * height * 4);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const row = raw.subarray(pos, pos + stride);
    pos += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? row[x - channels] : 0;
      const b = y > 0 ? rgba[(y - 1) * width * 4 + Math.floor(x / channels) * 4 + (x % channels)] : 0;
      const c = x >= channels && y > 0
        ? rgba[(y - 1) * width * 4 + Math.floor((x - channels) / channels) * 4 + ((x - channels) % channels)]
        : 0;
      let v = row[x];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 0xff;
      }
      row[x] = v;
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      rgba[d] = row[s];
      rgba[d + 1] = row[s + 1];
      rgba[d + 2] = row[s + 2];
      rgba[d + 3] = channels === 4 ? row[s + 3] : 255;
    }
  }
  return { width, height, rgba };
}

// Built-in 5x7 bitmap font. Each glyph is 7 rows; each row is 5 bits,
// bit 4 = leftmost column. Only the characters the caption uses.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  Y: [0x11, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '3': [0x1f, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1f],
  '6': [0x0e, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  a: [0, 0, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  e: [0, 0, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x08, 0x08, 0x1e, 0x08, 0x08, 0x08],
  k: [0, 0, 0x11, 0x12, 0x1c, 0x12, 0x11],
  m: [0, 0, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0, 0, 0x1e, 0x11, 0x11, 0x11, 0x11],
  u: [0, 0, 0x11, 0x11, 0x11, 0x13, 0x0d],
};

// ---- drawing on an RGB buffer (3 bytes per pixel) ----
type RGB = [number, number, number];

function setPx(buf: Uint8Array, x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(c1: RGB, c2: RGB, t: number): RGB {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ];
}

// Vice City sunset: deep purple at the top, magenta mid, orange at the horizon.
const SKY: [number, RGB][] = [
  [0.0, [26, 11, 46]],
  [0.35, [94, 28, 84]],
  [0.62, [214, 51, 108]],
  [0.85, [255, 110, 88]],
  [1.0, [255, 176, 66]],
];

function skyColor(y: number): RGB {
  const t = y / (H - 1);
  for (let i = 1; i < SKY.length; i++) {
    if (t <= SKY[i][0]) {
      const [t0, c0] = SKY[i - 1];
      const [t1, c1] = SKY[i];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return SKY[SKY.length - 1][1];
}

function fillSky(buf: Uint8Array): void {
  for (let y = 0; y < H; y++) {
    const c = skyColor(y);
    for (let x = 0; x < W; x++) setPx(buf, x, y, c);
  }
}

function fillCircle(buf: Uint8Array, cx: number, cy: number, r: number, c: RGB): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPx(buf, x, y, c);
    }
  }
}

// Retro synthwave sun: a warm disc with horizontal slats cut from its lower half.
function drawSun(buf: Uint8Array, cx: number, cy: number, r: number): void {
  fillCircle(buf, cx, cy, r, [255, 209, 102]);
  let y = cy + r * 0.15;
  let gap = 4;
  while (y < cy + r) {
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      setPx(buf, x, Math.floor(y), skyColor(Math.floor(y)));
    }
    y += gap;
    gap += 3;
  }
}

function drawStars(buf: Uint8Array): void {
  // Fixed star positions (deterministic): a small pseudo-random set from a seed.
  let s = 1234567;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * 200);
    const b = 150 + Math.floor(rnd() * 105);
    setPx(buf, x, y, [b, b, b]);
  }
}

// A simple palm silhouette at the frame edge: curved trunk + drooping fronds.
function drawPalm(buf: Uint8Array, baseX: number, baseY: number, h: number, lean: number): void {
  const dark: RGB = [16, 8, 32];
  const topX = baseX + lean;
  const topY = baseY - h;
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(baseX + (topX - baseX) * t + Math.sin(t * 2.2) * 6);
    const y = Math.round(baseY - h * t);
    fillCircle(buf, x, y, 5, dark);
  }
  for (let f = 0; f < 7; f++) {
    const ang = Math.PI * (0.08 + (f / 6) * 0.84);
    const len = 52 + ((f * 37) % 30);
    for (let d = 0; d < len; d += 2) {
      const x = Math.round(topX + Math.cos(ang) * d * (lean >= 0 ? 1 : -1));
      const y = Math.round(topY + Math.sin(ang) * d * 0.55 + d * d * 0.004);
      fillCircle(buf, x, y, 3, dark);
    }
  }
}

// Paste an RGBA image onto the buffer, scaled by nearest neighbour, alpha-blended.
function pasteRgba(
  buf: Uint8Array,
  img: { width: number; height: number; rgba: Uint8Array },
  dstX: number,
  dstY: number,
  dstW: number,
  dstH: number,
): void {
  for (let y = 0; y < dstH; y++) {
    const sy = Math.floor((y / dstH) * img.height);
    for (let x = 0; x < dstW; x++) {
      const sx = Math.floor((x / dstW) * img.width);
      const si = (sy * img.width + sx) * 4;
      const a = img.rgba[si + 3] / 255;
      if (a === 0) continue;
      const px = dstX + x;
      const py = dstY + y;
      if (px < 0 || px >= W || py < 0 || py >= H) continue;
      const di = (py * W + px) * 3;
      buf[di] = Math.round(buf[di] * (1 - a) + img.rgba[si] * a);
      buf[di + 1] = Math.round(buf[di + 1] * (1 - a) + img.rgba[si + 1] * a);
      buf[di + 2] = Math.round(buf[di + 2] * (1 - a) + img.rgba[si + 2] * a);
    }
  }
}

// Draw one line of text, centred at cx, with a thick dark outline (meme style).
function drawTextLine(buf: Uint8Array, text: string, cx: number, topY: number, scale: number, color: RGB): void {
  const adv = 6 * scale; // 5px glyph + 1px gap, scaled
  const totalW = text.length * adv - scale;
  let x = Math.round(cx - totalW / 2);
  const draw = (ox: number, oy: number, c: RGB): void => {
    let gx = x;
    for (const ch of text) {
      const glyph = FONT[ch] ?? FONT[' '];
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          if (glyph[row] & (1 << (4 - col))) {
            for (let dy = 0; dy < scale; dy++) {
              for (let dx = 0; dx < scale; dx++) {
                setPx(buf, gx + ox + col * scale + dx, topY + oy + row * scale + dy, c);
              }
            }
          }
        }
      }
      gx += adv;
    }
  };
  const outline: RGB = [10, 5, 20];
  const o = Math.max(2, Math.floor(scale / 3));
  for (const [ox, oy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]] as const) {
    draw(ox, oy, outline);
  }
  draw(0, 0, color);
}

// ---- compose the meme ----
function composeMeme(ghost: { width: number; height: number; rgba: Uint8Array }): Buffer {
  const buf = new Uint8Array(W * H * 3);
  fillSky(buf);
  drawStars(buf);
  // Sun as a halo behind the ghost.
  drawSun(buf, W / 2, 350, 190);
  // Palms framing the scene at the edges.
  drawPalm(buf, 60, 640, 260, 55);
  drawPalm(buf, W - 60, 640, 240, -50);
  // The make.fun ghost, big and centre: it IS the agent in the joke.
  const ghostSize = 300;
  pasteRgba(buf, ghost, Math.round(W / 2 - ghostSize / 2), 200, ghostSize, ghostSize);
  // Caption, large and readable at a glance.
  const white: RGB = [255, 255, 255];
  drawTextLine(buf, 'WAITED 13 YEARS', W / 2, 42, 9, white);
  drawTextLine(buf, 'FOR GTA 6', W / 2, 126, 9, white);
  drawTextLine(buf, 'MY make.fun AGENT', W / 2, 528, 9, white);
  drawTextLine(buf, 'BOUGHT IT DAY ONE', W / 2, 606, 9, white);
  return encodePng(W, H, buf);
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const ghost = decodePng(readFileSync(join(BOT_DIR, 'ghost.png')));
  const meme = composeMeme(ghost);
  writeFileSync(join(OUTPUT_DIR, 'meme.png'), meme);
  try {
    copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
  } catch (err) {
    console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();

