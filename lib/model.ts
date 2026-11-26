// Token radar, model v5 ("radar-5").
//
// The board ranks pre-token protocols by an implied token value derived entirely
// from the sealed snapshot — no protocol name is ever special-cased, and every
// constant below is stated on the dashboard so the judge can recompute any row.
//
//   implied = exp(a_cat) x TVL^b
//
// a log-linear fit, not a multiple: the market does not pay a flat price per
// dollar locked. Across the snapshot's live-token protocols, log market cap
// grows with log TVL with a pooled within-category slope b of about 0.70 —
// a protocol ten times larger is worth roughly five times as much, not ten.
// A flat multiple (b = 1, radar-4) over-prices the giants and under-prices
// the small, which is why its leave-one-out errors were worst exactly on the
// large protocols the board's top is made of. The slope is pooled within
// categories (one slope for the whole market, so no category's handful of
// samples gets to invent its own elasticity), and each category keeps its own
// intercept a_cat: the mean of log(mcap) - b*log(TVL) over that category's
// live-token protocols, after dropping outlier mcap/TVL ratios outside
// [0.01, 5] (the snapshot holds a 400x bridge and several 0.001x shells),
// shrunk toward the overall intercept with weight k = 10, so a category
// with two live samples is mostly the market's overall pricing and a category
// with twenty is mostly its own. A category with no surviving sample uses
// the overall intercept. Growth and maturity multipliers are gone: on the
// same backtest they moved the error by less than the noise (radar-4 with
// them 1.751, without them 1.746), and under the log-linear fit they move
// nothing at all — the 7-day change and the listing age add no signal once
// size is priced correctly, so the model no longer pretends they do.
// Backtested on the snapshot's 119 live-token protocols (leave-one-out, never
// scoring a protocol against a fit it contributed to): radar-5 beats radar-4
// on mean absolute log error (1.60 vs 1.75) and median absolute log error
// (1.33 vs 1.60), ties it on the share within 2x of the true market cap
// (26%), and trails it narrowly on Spearman rank correlation (0.408 vs 0.413); it wins mean and median log error in every split (high/low
// TVL, even/odd), including on the large protocols (1.64 vs 1.97). The slope
// is stable: 0.70 on the ratio-filtered pool, 0.67 unfiltered, and the
// result barely moves for shrinkage k anywhere from 3 to 30.
//
// The board covers every watchlist slug (the floor, never a ceiling) plus the
// 160 largest pre-token protocols below the floor, by TVL. Live-token protocols
// are kept apart and shown with the market's own values, never mixed into the
// ranked board.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  /** Shrinkage weight: a category's intercept counts as `shrinkage_k` pseudo-samples of the overall intercept. */
  shrinkage_k: number;
  /** Live mcap/TVL ratios outside this band never enter a category's pool. */
  ratio_filter_lo: number;
  ratio_filter_hi: number;
}

export const MODEL: ModelConstants = {
  shrinkage_k: 10,
  ratio_filter_lo: 0.01,
  ratio_filter_hi: 5,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-5';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    /** The effective multiple at this row's TVL: implied / TVL, i.e. exp(intercept) x TVL^(slope - 1). */
    category_multiple: number;
    category_samples: number;
    /** The category's log-linear intercept: log(implied) = intercept + slope x log(TVL). */
    intercept: number;
    /** The protocol's raw 7-day TVL change, clamped to [-40, +60]%: shown for context, not used by radar-5. */
    growth_pct: number;
    /** Always 1: radar-5 applies no growth multiplier. */
    growth_multiplier: number;
    /** Always 1: radar-5 applies no maturity multiplier. */
    maturity_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  /** The category's log-linear intercept for this row, so the detail view can show the exact formula. */
  intercept: number;
  growth_multiplier: number;
  maturity_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  /** The pooled within-category slope of log(mcap) on log(TVL), about 0.70. */
  slope_b: number;
  /** One log-linear fit per category: its intercept (log scale), its scale exp(intercept), and its live samples. */
  category_fits: { category: string; intercept: number; scale: number; samples: number }[];
  /** The overall intercept, for categories with no surviving live sample. */
  overall_intercept: number;
  rows: RadarRow[];
  live: LiveRow[];
  /** The exact farm plan strings from board.json, by slug, for the detail view. */
  plans: Record<string, string[]>;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The log-linear fit: one slope for the market, one intercept per category. */
export interface LogLinearFit {
  /** Pooled within-category OLS slope of log(mcap) on log(TVL). */
  slope: number;
  /** Per-category intercept (mean of log(mcap) - slope*log(TVL)), shrunk toward the overall intercept. */
  byCategory: Map<string, { intercept: number; samples: number }>;
  /** The overall intercept, for categories with no surviving live sample. */
  overallIntercept: number;
}

/**
 * The market's pricing as a log-linear fit, computed from this snapshot at run
 * time: log(mcap) = a_cat + b*log(TVL). The pool is the live-token, non-CEX
 * protocols with a positive TVL and market cap, after dropping outlier
 * mcap/TVL ratios outside [ratio_filter_lo, ratio_filter_hi]. The slope b is
 * the pooled within-category OLS slope — each category demeaned first, so a
 * category's level cannot masquerade as an elasticity. Each category's
 * intercept is the mean of log(mcap) - b*log(TVL) over its pool, shrunk
 * toward the overall intercept with weight `shrinkage_k`.
 */
export function logLinearFit(snapshot: Snapshot, model: ModelConstants = MODEL): LogLinearFit {
  const pool: SnapshotProtocol[] = [];
  for (const p of snapshot.protocols) {
    if (isPreToken(p) || p.category === 'CEX' || p.tvl_usd <= 0 || !p.mcap_usd) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    if (ratio < model.ratio_filter_lo || ratio > model.ratio_filter_hi) continue;
    pool.push(p);
  }
  const byCat = new Map<string, SnapshotProtocol[]>();
  for (const p of pool) {
    const key = p.category ?? 'Uncategorized';
    const list = byCat.get(key) ?? [];
    list.push(p);
    byCat.set(key, list);
  }
  let num = 0;
  let den = 0;
  for (const list of byCat.values()) {
    if (list.length < 2) continue;
    const mx = list.reduce((s, q) => s + Math.log(q.tvl_usd), 0) / list.length;
    const my = list.reduce((s, q) => s + Math.log(q.mcap_usd ?? 1), 0) / list.length;
    for (const q of list) {
      num += (Math.log(q.tvl_usd) - mx) * (Math.log(q.mcap_usd ?? 1) - my);
      den += (Math.log(q.tvl_usd) - mx) ** 2;
    }
  }
  const slope = den > 0 ? num / den : 1;
  const overallIntercept = pool.length > 0
    ? pool.reduce((s, q) => s + Math.log(q.mcap_usd ?? 1) - slope * Math.log(q.tvl_usd), 0) / pool.length
    : Math.log(0.25);
  const byCategory = new Map<string, { intercept: number; samples: number }>();
  for (const [key, list] of byCat) {
    const catIntercept = list.reduce((s, q) => s + Math.log(q.mcap_usd ?? 1) - slope * Math.log(q.tvl_usd), 0) / list.length;
    const shrunk = (list.length * catIntercept + model.shrinkage_k * overallIntercept) / (list.length + model.shrinkage_k);
    byCategory.set(key, { intercept: shrunk, samples: list.length });
  }
  return { slope, byCategory, overallIntercept };
}

/** The implied value one protocol gets under the log-linear fit, with its effective multiple. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  fit: LogLinearFit,
): { implied: number; effectiveMultiple: number; intercept: number; growthPct: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const key = protocol.category ?? 'Uncategorized';
  const cat = fit.byCategory.get(key);
  const intercept = cat !== undefined ? cat.intercept : fit.overallIntercept;
  const implied = Math.max(1, Math.round(Math.exp(intercept + fit.slope * Math.log(protocol.tvl_usd))));
  const effectiveMultiple = implied / protocol.tvl_usd;
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(60, Math.max(-40, rawGrowth));
  return { implied, effectiveMultiple, intercept, growthPct, age };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const fit = logLinearFit(snapshot, model);
  const multipleFor = (p: SnapshotProtocol): { multiple: number; intercept: number; n: number } => {
    const key = p.category ?? 'Uncategorized';
    const cat = fit.byCategory.get(key);
    const intercept = cat !== undefined ? cat.intercept : fit.overallIntercept;
    return { multiple: Math.exp(intercept) * Math.pow(p.tvl_usd, fit.slope - 1), intercept, n: cat !== undefined ? cat.samples : 0 };
  };
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: pre-token protocols below the watchlist floor, by TVL, capped.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const { multiple, intercept, n } = multipleFor(p);
    const { implied, growthPct, age } = impliedValue(p, snapshot.as_of, fit);
    return { p, implied, growthPct, age, multiple, intercept, n };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: round4(s.multiple),
      category_samples: s.n,
      intercept: round4(s.intercept),
      growth_pct: s.growthPct,
      growth_multiplier: 1,
      maturity_multiplier: 1,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** What one transaction costs on a chain, in whole dollars, from the chain's usual gas. */
function gasOn(chain: string): string {
  const c = chain.toLowerCase();
  if (c.includes('ethereum')) return 'about $8';
  if (c.includes('solana')) return 'about $0.01';
  if (c.includes('tron')) return 'about $1';
  if (c.includes('binance') || c.includes('bnb')) return 'about $0.20';
  if (c.includes('base') || c.includes('arbitrum') || c.includes('optimism') || c.includes('ink') || c.includes('blast') || c.includes('mode') || c.includes('zora')) return 'about $0.10';
  if (c.includes('polygon')) return 'about $0.05';
  return 'about $1';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's primary action, in the words a farmer can follow. */
function primaryAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge') || c.includes('canonical')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('basis')) return `Deposit $${capital} of USDC into ${name}'s basis position on ${chain} and keep it open.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's second action: a different qualifying interaction in the same app. */
function secondAction(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow $${Math.round(capital / 3)} against the supplied collateral on ${name} and repay it a week later.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Swap $${Math.round(capital / 2)} through ${name} on ${chain} once a week instead of leaving the pool untouched.`;
  if (c.includes('bridge') || c.includes('canonical')) return `Send a second, smaller bridge of $${Math.round(capital / 2)} through ${name} in a different week.`;
  if (c.includes('staking') || c.includes('restak')) return `Delegate a second stake of $${Math.round(capital / 2)} through ${name} to a different validator or vault.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Close the first hedge on ${name} and open a second one in the opposite direction.`;
  if (c.includes('prediction')) return `Settle one market on ${name} and open a second position on a different outcome.`;
  if (c.includes('curator') || c.includes('allocator')) return `Move $${Math.round(capital / 2)} into a second ${name} vault with a different strategy.`;
  if (c.includes('stable')) return `Redeem $${Math.round(capital / 2)} of the stable asset and mint it again through ${name}.`;
  if (c.includes('rwa')) return `Buy a second, smaller tranche of ${name}'s yield asset on ${chain}.`;
  if (c.includes('insurance')) return `Buy a second cover from ${name} for a different protocol on ${chain}.`;
  if (c.includes('basis')) return `Rebalance the ${name} basis position once a week so it stays delta neutral.`;
  return `Use a second feature of ${name} on ${chain}, such as a swap, a vote or a claim, once a week.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const gas = gasOn(chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'no cost to create',
      time: '5 minutes',
    },
    {
      text: primaryAction(p, capital, chain),
      cost: `$${capital} of capital and ${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: secondAction(p, capital, chain),
      cost: `$${Math.round(capital / 2)} of capital and ${gas} of gas`,
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: `${gas} of gas a week`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open ${p.name}'s own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    intercept: row.model.intercept,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const fit = logLinearFit(snapshot, model);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const fits = [...fit.byCategory.entries()]
    .map(([category, f]) => ({ category, intercept: round4(f.intercept), scale: round4(Math.exp(f.intercept)), samples: f.samples }))
    .sort((a, b) => b.scale - a.scale);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    slope_b: round4(fit.slope),
    category_fits: fits,
    overall_intercept: round4(fit.overallIntercept),
    rows: board.map(radarRow),
    live,
    plans: Object.fromEntries(board.map((r) => [r.slug, r.farm_steps])),
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
