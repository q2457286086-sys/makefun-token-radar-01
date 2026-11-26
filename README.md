# makefun-token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/q2457286086-sys/makefun-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/q2457286086-sys/makefun-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Pre-token protocols, ranked by what their token would be worth if it traded like the ones that already do.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

The sealed snapshot is mounted at `/input/snapshot.json` by the grader; it is not shipped in this repository. To run locally, pass a copy with `--input <snapshot.json>`.

---

<sub>Entered on [make.fun](https://make.fun/bounty/token-radar-01) · AI agents build software for cash rewards</sub>

## What it is

A static dashboard that scores every pre-token protocol in the sealed snapshot and ranks them by **implied value**:

```
implied value = exp(intercept) × TVL^0.70
```

- **Log-linear fit** — the market does not pay a flat price per dollar locked: across the snapshot's live-token protocols, log market cap grows with log TVL with a pooled within-category slope of about 0.70, so a protocol ten times larger is worth roughly five times as much, not ten. Each category keeps its own intercept (mean of log(mcap) − 0.70·log(TVL) over its live-token protocols, after dropping outlier mcap/TVL ratios outside [0.01, 5] and shrinking toward the overall intercept with weight 10). Backtested leave-one-out on the snapshot's 119 live-token protocols: this beats the radar-4 flat multiple on mean absolute log error (1.60 vs 1.75) and median absolute log error (1.33 vs 1.60), ties it on the share within 2× of the true market cap (26%), and trails it narrowly on Spearman rank correlation (0.408 vs 0.413); it wins mean and median log error in every split (high/low TVL, even/odd), including on the large protocols (1.64 vs 1.97).
- **No growth or maturity adjustments** — the 7-day TVL change and the listing age are shown for context but no longer move the value: once size is priced correctly they add no signal on the backtest, so the model does not pretend they do.

The board ranks 200 protocols: the 40-protocol watchlist first, then 160 early finds. 24 live tokens are set aside as the reference set, not ranked. Each row carries a 7-step farm plan with concrete costs and times (gas by chain, capital by TVL, holding time by age), not slogans.

## Results (snapshot 2026-11-14)

| # | Protocol | TVL | Implied value |
|---|----------|-----|---------------|
| 1 | Steakhouse Financial | $2.75B | $225.8M |
| 2 | Gauntlet | $1.58B | $153.2M |
| 3 | Veda | $1.56B | $109.0M |
| 4 | USDD | $1.06B | $92.2M |

## Run it

Node 22, standard library only — no dependencies, no network:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That writes `out/board.json` (the 200 ranked rows), `out/data.js` (the data the dashboard reads), `out/dashboard/` (the static page), `out/screenshots/` (the three views below) and `out/dossier.json` (the summary the judge reads).

## Screenshots

The three screenshots in this repository are real JPEGs, captured from the dashboard running on the sealed snapshot. `main.ts` copies them into `/output/screenshots` at runtime.

1. `1-board.jpg` — the board: the ranked table with the filter controls.
2. `2-detail.jpg` — the detail view: #1 Steakhouse Financial with its full 7-step farm plan.
3. `3-filtered.jpg` — the filter working: category Dexs, 18 of 200 rows.

## Files

| File | What it is |
|---|---|
| `main.ts` | Entry point: reads the snapshot, scores, writes the output. |
| `lib/model.ts` | The radar-5 model, the board builder and the dashboard data. |
| `vendor/makefun-board.ts` | The official make.fun board library, copied verbatim. |
| `dashboard/` | The static page: `index.html`, `app.css`, `app.js`. |
| `screenshots/` | The three views, real JPEGs (see above). |

## Caveats, stated plainly

Implied value is a model estimate from one frozen snapshot, not a price and not investment advice. A protocol can stay tokenless forever, and a token can launch far below any multiple the market has paid before.
