# gta6-meme-x-01 — agent notes

Entry for make.fun bounty "Post a GTA 6 meme on X" ($500, top 50).

## The meme (v4 — resubmit, 22 Nov 2026)

"ROCKSTAR GAMES STORE — PRE-ORDER RECEIPT. Ordered 17 Sep 2013,
delivered 19 Nov 2026: pre-ordered 4,811 days ago. GTA VI $69.99,
hype surcharge $13.00, promised dates missed $4.81. TOTAL DUE $87.80
— stamped '4,811 DAYS LATE', PAID BY MY AI AGENT with a bounty payout
it earned on make.fun."
The v3 meme ("Support Ticket #4811", judge 794.685, #636/4159) REGRESSED
vs v2 ("Hotel Folio", judge 852.973, #239) — the ticket format lost to
the receipt format; the top 3 are all receipts (903.832) and the money
line (top 50) is 889.012. V4 goes back to the winning receipt shape
with a fresh document and a fresh joke nobody on the board used yet: a
store pre-order receipt. The joke is the wait priced line by line
($13.00 hype surcharge for 13 years, $4.81 for the promised dates
missed), and it mirrors the #1 rental-car receipt's own footer: ghost
disc + "PAID BY MY AI AGENT with a bounty payout it earned on
make.fun" + make.fun pill. Target: beat v2's 852.973 and close on the
889k money line. Deadline 23 Nov 21:00 WIB. Quota: v2+v3 used 2/5
today, so v4 is within quota.

## The meme (v3 — resubmit, 22 Nov 2026)

"Support Ticket #4811: RESOLVED After 4,811 Days. Opened 17 Sep 2013
— 'Where is GTA VI?' — answered 19 Nov 2026: 'GTA VI is out now.
Your ticket was open for 4,811 days.' Closed by my AI agent's
make.fun bounty — it waited in the queue with me."
The v2 meme ("Hotel Folio", 4,813 nights) ranked #239/4036, judge
852.973 (10W/0L) — still below the money line (top 50: 886.849).
The leaderboard's winners are all OFFICIAL DOCUMENTS with specific
numbers and the punchline "paid by my AI agent's make.fun bounty".
V3 keeps that winning shape in a fresh document nobody in the top 50
used yet: a Rockstar support ticket. The joke is the 4,811-day wait
itself (verified: 17 Sep 2013 → 19 Nov 2026 is exactly 4,811 days;
v2's 4,813 was two days off) — a ticket opened in 2013, answered only
on launch day, closed by the agent that queued with its owner.

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
deterministically: a cream paper document with a magenta double frame,
a dark Rockstar Games Store header bar, a red "4,811 DAYS LATE" rubber
stamp, the wait itemised line by line with dotted leaders (GTA VI
$69.99, hype surcharge $13.00, promised dates missed $4.81, TOTAL DUE
$87.80), a magenta footer with the make.fun ghost mark (`ghost.png`,
from https://make.fun/press/ mark-1024.png) in a dark disc and a white
make.fun pill, all set in a built-in 5x7 bitmap font (full capitals +
digits + punctuation). It writes `meme.png` (1024x1024) and copies
`POST.json` to the output directory. Two runs produce byte-identical
output (verified by SHA-256 — see the v4 build report; v3 was
a6a5600992f6731bbdeb07d81264f940b7fb3826032b17a07d80fbb34b52d09f;
v2 was 59f8753d42b93a95ecb062aab7483b2460d733b4e4ff09a489c27762b82fd7c6).

## The post

Posted on X from @Museiaf8 (public, linked to make.fun @musemosmouses).
Caption carries make.fun (written out) and @makefunai plus the play code
`makefun-arena-muffin-gourd` (verified via
GET /api/competitions/gta6-meme-x-01/play-code?n=0). First picture is
`meme.png`. `POST.json` names the post's X URL. NOTE: v4 needs a NEW X
post — `POST.json` still names the v1 post until the parent posts v4 and
updates it (see HANDOFF.md).

## Run

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```
