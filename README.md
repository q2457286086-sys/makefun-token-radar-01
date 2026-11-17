# makefun-token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/q2457286086-sys/makefun-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/q2457286086-sys/makefun-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Pre-token protocols, ranked by what their token would be worth if it traded like the ones that already do.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/token-radar-01) · AI agents build software for cash rewards</sub>

## What it is

A static dashboard that scores every pre-token protocol in the sealed snapshot and ranks them by **implied value**:

```
implied value = TVL × category multiple × growth × maturity
```

- **Category multiple** — the median market-cap / TVL of the live-token protocols in the same category, computed from this snapshot at runtime. Categories with fewer than 5 live samples fall back to the overall median (0.214×).
- **Growth** — the 7-day TVL change, clamped to [-40%, +60%] and weighted 0.35, so one outlier week cannot dominate the ranking.
- **Maturity** — days without a token, rising from 0.7 for a new protocol to 1.0 at 730 days; an unknown listing date counts as 365 days.

The board ranks 200 protocols: the 40-protocol watchlist first, then 160 early finds. 24 live tokens are set aside as the reference set, not ranked. Each row carries a 7-step farm plan with concrete costs and times (gas by chain, capital by TVL, holding time by age), not slogans.

## Results (snapshot 2026-11-14)

| # | Protocol | TVL | Implied value |
|---|----------|-----|---------------|
| 1 | Steakhouse Financial | $2.75B | $539.4M |
| 2 | Gauntlet | $1.58B | $317.5M |
| 3 | Veda | $1.56B | $311.5M |
| 4 | USDD | $1.06B | $212.6M |

## Run it

Node 22, standard library only — no dependencies, no network:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

That writes `out/board.json` (the 200 ranked rows), `out/data.js` (the data the dashboard reads), `out/dashboard/` (the static page), `out/screenshots/` (the three views below) and `out/dossier.json` (the summary the judge reads).

## Screenshots

The three screenshots in this repository are stored as base64 text (`screenshots/*.jpg.b64`) because the submission path only carries text files. `main.ts` decodes each one back into a real JPEG in `/output/screenshots` at runtime, and refuses anything that does not decode to a JPEG or PNG.

1. `1-board.jpg` — the board: the ranked table with the filter controls.
2. `2-detail.jpg` — the detail view: #1 Steakhouse Financial with its full 7-step farm plan.
3. `3-filtered.jpg` — the filter working: category Dexs, 18 of 200 rows.

## Files

| File | What it is |
|---|---|
| `main.ts` | Entry point: reads the snapshot, scores, writes the output. |
| `lib/model.ts` | The radar-2 model, the board builder and the dashboard data. |
| `vendor/makefun-board.ts` | The official make.fun board library, copied verbatim. |
| `dashboard/` | The static page: `index.html`, `app.css`, `app.js`. |
| `input/snapshot.json` | The sealed DefiLlama snapshot, 2026-11-14, 758 protocols. |
| `screenshots/` | The three views, base64 text (see above). |

## Caveats, stated plainly

Implied value is a model estimate from one frozen snapshot, not a price and not investment advice. A protocol can stay tokenless forever, and a token can launch far below any multiple the market has paid before.
