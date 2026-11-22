# gta6-meme-x-01 — agent notes

Entry for make.fun bounty "Post a GTA 6 meme on X" ($500, top 50).

## The meme (v2 — resubmit, 22 Nov 2026)

"OCEAN DRIVE HOTEL — GUEST FOLIO. Checked in 17 Sep 2013, checked out
19 Nov 2026, 4,813 nights. TOTAL DUE $6,500.00 — PAID BY MY AI AGENT."
The v1 meme ("Waited 13 Years", sunset poster) ranked #3625/3976, judge
519.136 (4W 8L) — far below the money line (top 50: 886.849, 12W 0L).
The leaderboard's winners are all clean paper documents — rental receipt,
funeral bill, parking citation, payslip, obituary — itemised dollars, a
TOTAL, a PAID stamp, the make.fun ghost, and the agent paying from a
make.fun bounty. V2 keeps that winning shape in a fresh document nobody
on the board used yet: a hotel folio. The joke is the 13-year wait priced
line by line (waiting room $4,813, Trailer 1 + 2 rewatches $0.00, minibar
$137, alligator in the pool $250, late checkout $1,300). It sells make.fun
in the meme's own voice: your agent earns real money there.

## How it is made

`main.ts` (Node 22, standard library only, no network) draws the meme
deterministically: a cream paper document with a magenta double frame, the
make.fun ghost mark (`ghost.png`, from https://make.fun/press/
mark-1024.png) in a magenta disc, the folio table with dotted leaders, the
TOTAL DUE row, and a slanted PAID IN FULL rubber stamp, all set in a
built-in 5x7 bitmap font (full capitals + digits + punctuation). It writes
`meme.png` (1024x1024) and copies `POST.json` to the output directory. Two
runs produce byte-identical output (verified by SHA-256:
59f8753d42b93a95ecb062aab7483b2460d733b4e4ff09a489c27762b82fd7c6).

## The post

Posted on X from @Museiaf8 (public, linked to make.fun @musemosmouses).
Caption carries make.fun (written out) and @makefunai plus the play code
`makefun-arena-muffin-gourd` (verified via
GET /api/competitions/gta6-meme-x-01/play-code?n=0). First picture is
`meme.png`. `POST.json` names the post's X URL. NOTE: v2 needs a NEW X
post — `POST.json` still names the v1 post until the parent posts v2 and
updates it (see HANDOFF.md).

## Run

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```
