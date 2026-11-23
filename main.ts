// gta6-meme-x-01 — v5 "Hotel Folio: 4,811 Nights in Vice City"
// Node 22, standard library only, no network. Deterministic: the same run
// always writes the same meme.png bytes.
// It composes the meme from the make.fun ghost mark (ghost.png, from
// https://make.fun/press/ mark-1024.png) as an Ocean Drive Hotel guest
// folio: the fan checked into a Vice City hotel on 17 Sep 2013, the day
// GTA V launched, and only checked out on GTA VI launch day, 19 Nov
// 2026 — 4,811 nights later. The folio itemises the stay itself: a
// 4,811-night long stay at $1.00 a night, a $1,300.00 late-checkout fee
// for 13 years, minibar $137.00, an alligator in the pool $250.00,
// trailer rewatches $0.00, valet for a white Infernus $65.00, and a
// $13.00 hype surcharge for 13 years — TOTAL DUE $6,576.00, stamped
// "13 YEARS LATE" and paid by the fan's AI agent from a bounty payout
// it earned on make.fun. This is an upgrade INSIDE the winning format:
// v2's Hotel Folio (judge 852.973, #239) is still the best thing we
// have shipped — v3's support ticket regressed to 794.685 and v4's
// pre-order receipt scored 845.861 (#318) with a TOTAL of only $87.80,
// barely more than the game itself, and three $0.00 filler lines. V5
// keeps v2's folio, fixes its 4,813-night count to the true 4,811,
// prices the wait as a huge bill instead of a small one, and gives
// every line a GTA joke of its own. The picture is drawn in a built-in
// 5x7 bitmap font, and POST.json is copied to the output directory
// where the gate reads it.
//   V5 vs the two versions that scored, element by element:
//   - Format: v2's Hotel Folio (852.973, #239) — kept. V4's pre-order
//     receipt (845.861, #318) is abandoned; v3's ticket (794.685) stays
//     abandoned. The folio is the format that scored best, so v5
//     upgrades inside it instead of swapping documents again.
//   - Nights: v2 said 4,813 (two days too many); v5 says the true
//     4,811, the same count v3 proved and v4 used.
//   - Total: v2 $6,500.00, v4 $87.80. V5 $6,576.00 — a big bill again,
//     but now every dollar is itemised instead of one round number.
//   - Lines: v4 had three $0.00 filler lines (patience, rewatches,
//     sleepless nights). V5 keeps one $0.00 joke (trailer rewatches)
//     and charges real money for the rest: late checkout, minibar,
//     alligator, valet, hype surcharge.
//   - Stamp: v4 "4,811 DAYS LATE". V5 "13 YEARS LATE", the #1 rental
//     receipt's own stamp words.
//   - Hook in the first read: v5 names the guest — Jason and Lucia —
//     and the room, Room 4811, above the dates, so the GTA hook lands
//     before any price is read.
//   - Footer: unchanged from v2/v4 — ghost disc, "PAID BY MY AI
//     AGENT with a bounty payout it earned on make.fun", MAKE.FUN
//     pill. The winners' footer shape is not the thing to change.
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const W = 1024;
const H = 1024;

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
// Every scanline uses filter 0 (None), so the output is fully deterministic:
// the same pixels always deflate to the same bytes at the same level.
// The encoder writes only the chunks a decoder needs — IHDR, one IDAT,
// IEND — and no ancillary chunks, so there is no timestamp, no text
// chunk and nothing else that could vary between runs. The CRC-32
// table above is built once at load from the IEEE polynomial; every
// chunk's CRC covers its type bytes plus its data, exactly as the PNG
// spec requires, so any PNG reader accepts the output.
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
// The decoder walks the chunk list, gathers every IDAT payload, inflates
// them as one stream, then undoes the per-row filters (None, Sub, Up,
// Average, Paeth) in scanline order. Filter reconstruction reads the
// already-decoded pixel above (b), the pixel to the left (a) and the
// diagonal (c) from the output buffer itself, so each row only ever
// depends on rows above it and pixels to its left — a single pass,
// no backtracking, and no allocation beyond the output image.
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
// bit 4 = leftmost column. Full capitals + digits + the punctuation the
// folio uses, so every line of the document can be set in the same face.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x11, 0x0a, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1f],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x0e, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x01, 0x0e],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  '-': [0, 0, 0, 0x1f, 0, 0, 0],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
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

// Cream paper + magenta frame, with a dark hotel header bar: the
// document look the winners use, as a guest folio.
const PAPER: RGB = [246, 239, 220];
const INK: RGB = [32, 26, 23];
const MAGENTA: RGB = [216, 27, 116];
const STAMP_RED: RGB = [192, 57, 43];
const MUTED: RGB = [138, 127, 106];
const DARKBAR: RGB = [24, 24, 30];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [34, 139, 64];
const BUBBLE: RGB = [255, 253, 247];
const BUBBLE_EDGE: RGB = [203, 192, 168];
const GHOST_BG: RGB = [32, 26, 23];

function fillRect(buf: Uint8Array, x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
    for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) setPx(buf, x, y, c);
  }
}

function drawRectOutline(buf: Uint8Array, x0: number, y0: number, x1: number, y1: number, c: RGB, thick: number): void {
  fillRect(buf, x0, y0, x1, y0 + thick - 1, c);
  fillRect(buf, x0, y1 - thick + 1, x1, y1, c);
  fillRect(buf, x0, y0, x0 + thick - 1, y1, c);
  fillRect(buf, x1 - thick + 1, y0, x1, y1, c);
}

// Bresenham line, for the stamp's slanted border.
function drawLine(buf: Uint8Array, x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(buf, x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// Draw glyphs starting at x (left edge), each glyph optionally shifted down
// by slope * (glyph centre - originX): the slanted-stamp effect.
// A glyph is 5 columns wide with a 1-column gap (advance 6 * scale), 7 rows
// tall, drawn as filled scale-by-scale blocks so the face stays chunky
// at any size. A missing glyph falls back to a blank: the folio only
// uses capitals, digits and the punctuation in the table, so a blank
// would mean a typo in a line above, not a font gap — every line in
// composeMeme was checked against the table before it shipped.
function drawGlyphs(buf: Uint8Array, text: string, x: number, topY: number, scale: number, color: RGB, slope: number, originX: number): void {
  const adv = 6 * scale;
  let gx = x;
  for (const ch of text) {
    const glyph = FONT[ch] ?? FONT[' '];
    const dy = Math.round(slope * (gx + (5 * scale) / 2 - originX));
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row] & (1 << (4 - col))) {
          for (let py = 0; py < scale; py++) {
            for (let px = 0; px < scale; px++) {
              setPx(buf, gx + col * scale + px, topY + dy + row * scale + py, color);
            }
          }
        }
      }
    }
    gx += adv;
  }
}

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawTextLeft(buf: Uint8Array, text: string, x: number, topY: number, scale: number, color: RGB): void {
  drawGlyphs(buf, text, x, topY, scale, color, 0, x);
}

function drawTextRight(buf: Uint8Array, text: string, rightX: number, topY: number, scale: number, color: RGB): void {
  drawGlyphs(buf, text, rightX - textWidth(text, scale), topY, scale, color, 0, rightX);
}

// One itemised folio row: label left, dotted leader, amount right.
function drawFolioRow(buf: Uint8Array, label: string, amount: string, y: number, scale: number): void {
  const leftX = 64;
  const rightX = 960;
  drawTextLeft(buf, label, leftX, y, scale, INK);
  drawTextRight(buf, amount, rightX, y, scale, INK);
  const leadStart = leftX + textWidth(label, scale) + 10;
  const leadEnd = rightX - textWidth(amount, scale) - 10;
  const midY = y + Math.floor((7 * scale) / 2);
  for (let x = leadStart; x <= leadEnd; x += 9) {
    setPx(buf, x, midY, MUTED);
    setPx(buf, x + 1, midY, MUTED);
  }
}

// A thick magenta rule across the folio's text column, marking the
// edge of a section: above the charges, and above the total due.
function drawDivider(buf: Uint8Array, y: number): void {
  fillRect(buf, 64, y, 960, y + 4, MAGENTA);
}

// A rubber stamp: double border rotated by slope, text slanted to match.
// The border is drawn as four Bresenham lines between rotated corners,
// then a second, smaller rectangle inside it — the double rule is what
// makes a stamp read as a stamp instead of a plain box. The text is
// centred on the stamp's centre and slanted by the same slope, so the
// letters lean with the frame instead of sitting straight inside a
// tilted box. The slope is small (-0.12) on purpose: enough lean to
// look stamped on by hand, not enough to hurt legibility at scale 3.
function drawStamp(buf: Uint8Array, cx: number, cy: number, w: number, h: number, text: string, scale: number, color: RGB): void {
  const slope = -0.12;
  const rot = (dx: number, dy: number): [number, number] => {
    const cos = 0.993;
    const sin = slope;
    return [Math.round(cx + dx * cos - dy * sin), Math.round(cy + dx * sin + dy * cos)];
  };
  const hw = w / 2;
  const hh = h / 2;
  const corners: [number, number][] = [rot(-hw, -hh), rot(hw, -hh), rot(hw, hh), rot(-hw, hh)];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = corners[i];
    const [bx, by] = corners[(i + 1) % 4];
    drawLine(buf, ax, ay, bx, by, color);
  }
  const iw = w - 16;
  const ih = h - 16;
  const inner: [number, number][] = [rot(-iw / 2, -ih / 2), rot(iw / 2, -ih / 2), rot(iw / 2, ih / 2), rot(-iw / 2, ih / 2)];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = inner[i];
    const [bx, by] = inner[(i + 1) % 4];
    drawLine(buf, ax, ay, bx, by, color);
  }
  const tw = textWidth(text, scale);
  drawGlyphs(buf, text, Math.round(cx - tw / 2), Math.round(cy - (7 * scale) / 2), scale, color, slope, cx);
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

// (Sunset, stars and palms from v1 are gone, the v3 support ticket is
// gone too, and the v4 pre-order receipt is gone: v5 is back to the
// v2 hotel folio — the format that scored best — with the numbers
// fixed and the bill made bigger.)

// Paste an RGBA image onto the buffer, scaled by nearest neighbour, alpha-blended.
// Nearest-neighbour keeps the ghost's hard edges hard: no blur, no halo,
// which matters because the mark is pasted small (92x92) into a dark
// disc and any smoothing would grey its outline. Fully transparent
// source pixels are skipped before blending, and the blend itself is
// a straight per-channel lerp against the destination pixel — the
// ghost is opaque where it matters, so the disc shows through only
// around its edges, exactly like a sticker pressed onto the folio.
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
// The outline is drawn first, in eight directions around the glyphs, then
// the face colour on top: the classic poster-letter look from v1, kept
// in the file even though the v5 folio sets its lines with the plain
// drawTextLeft/drawTextRight/drawTextCenter helpers instead. It stays
// because a future version may want a shout line again, and deleting
// a working helper to save lines is how a later rebuild loses the
// recipe — the folio's own lines never call it, so it costs nothing
// at runtime and changes no pixel of the meme.
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

function drawTextCenter(buf: Uint8Array, text: string, cx: number, topY: number, scale: number, color: RGB): void {
  drawGlyphs(buf, text, Math.round(cx - textWidth(text, scale) / 2), topY, scale, color, 0, cx);
}

// (The v3 ticket message bubbles are gone with the ticket: the folio
// sets its lines with drawRow, one charge per night of the wait.)

// ---- compose the meme: the Ocean Drive Hotel guest folio ----
// A fan checked into a Vice City hotel on 17 Sep 2013 and only
// checked out on GTA VI launch day, 19 Nov 2026 — 4,811 nights later.
// The folio itemises the stay: the long stay itself at $1.00 a night
// ($4,811.00), a $1,300.00 late-checkout fee, minibar $137.00, an
// alligator in the pool $250.00, trailer rewatches $0.00, valet for a
// white Infernus $65.00, and a $13.00 hype surcharge. TOTAL DUE
// $6,576.00, stamped "13 YEARS LATE", paid by the fan's AI agent from
// a bounty payout it earned on make.fun.
function composeMeme(ghost: { width: number; height: number; rgba: Uint8Array }): Buffer {
  const buf = new Uint8Array(W * H * 3);
  fillRect(buf, 0, 0, W - 1, H - 1, PAPER);
  drawRectOutline(buf, 22, 22, W - 23, H - 23, MAGENTA, 4);
  drawRectOutline(buf, 34, 34, W - 35, H - 35, MAGENTA, 2);

  // Dark hotel header bar: brand left, folio number right.
  fillRect(buf, 34, 34, 989, 118, DARKBAR);
  drawTextLeft(buf, 'OCEAN DRIVE HOTEL', 64, 62, 4, WHITE);
  drawTextRight(buf, 'FOLIO 4811', 960, 62, 4, WHITE);

  // Title left, red "13 YEARS LATE" stamp top-right.
  drawTextLeft(buf, 'GUEST FOLIO', 64, 140, 5, INK);
  drawStamp(buf, 830, 168, 300, 104, '13 YEARS LATE', 3, STAMP_RED);

  // Guest, room, and the 4,811-night stay. The guest line is the
  // first-read GTA hook: Jason and Lucia are the game's two leads,
  // and Room 4811 is the stay itself turned into a room number, so a
  // reader who knows nothing else about the bounty still gets the
  // joke in the first two lines. The dates sit underneath in the same
  // size, left and right, so the eye reads "checked in 2013, checked
  // out 2026" as one fact before it reaches the magenta night count.
  drawTextLeft(buf, 'GUEST JASON AND LUCIA', 64, 232, 3, INK);
  drawTextRight(buf, 'ROOM 4811', 960, 232, 3, INK);
  drawTextLeft(buf, 'CHECKED IN 17 SEP 2013', 64, 264, 3, INK);
  drawTextRight(buf, 'CHECKED OUT 19 NOV 2026', 960, 264, 3, INK);
  drawTextLeft(buf, '4,811 NIGHTS IN VICE CITY', 64, 296, 4, MAGENTA);
  drawDivider(buf, 336);

  // The stay, itemised line by line: every charge is a GTA joke.
  drawFolioRow(buf, 'LONG STAY - 4,811 NIGHTS', '$4,811.00', 352, 3);
  drawFolioRow(buf, 'LATE CHECKOUT - 13 YEARS', '$1,300.00', 392, 3);
  drawFolioRow(buf, 'MINIBAR', '$137.00', 432, 3);
  drawFolioRow(buf, 'ALLIGATOR IN THE POOL', '$250.00', 472, 3);
  drawFolioRow(buf, 'TRAILER REWATCHES', '$0.00', 512, 3);
  drawFolioRow(buf, 'VALET - WHITE INFERNUS', '$65.00', 552, 3);
  drawFolioRow(buf, 'HYPE SURCHARGE - 13 YEARS', '$13.00', 592, 3);
  drawDivider(buf, 632);

  // The total due: the whole 13-year wait, priced as one hotel bill.
  // No subtotal, no tax — the #1 rental receipt shows only TOTAL DUE,
  // and a folio this long reads cleaner with a single big number.
  drawFolioRow(buf, 'TOTAL DUE', '$6,576.00', 652, 5);

  // Magenta footer: the make.fun ghost in a dark disc, who paid,
  // and the make.fun pill — the #1 receipt's own footer shape.
  // Three lines, one voice: the agent paid, from a bounty, on
  // make.fun. Nothing else is sold here; the folio already did it.
  fillRect(buf, 64, 760, 960, 940, MAGENTA);
  fillCircle(buf, 124, 850, 62, GHOST_BG);
  pasteRgba(buf, ghost, 78, 804, 92, 92);
  drawTextLeft(buf, 'PAID BY MY AI AGENT', 210, 790, 4, WHITE);
  drawTextLeft(buf, 'WITH A BOUNTY PAYOUT', 210, 826, 4, WHITE);
  drawTextLeft(buf, 'IT EARNED ON MAKE.FUN', 210, 862, 4, WHITE);
  fillRect(buf, 760, 806, 950, 856, WHITE);
  drawTextCenter(buf, 'MAKE.FUN', 855, 818, 4, MAGENTA);

  // Bottom strip: the sign-off.
  drawTextCenter(buf, 'THANK YOU FOR STAYING 4,811 NIGHTS', W / 2, 962, 3, MUTED);
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

