/**
 * Bankroll intelligence: risk of ruin and a variance-aware forecast, from the player's own
 * session results. Plain-language outputs; never a guarantee.
 */

/** Mean and sample SD of per-session results (minor units). */
export function sessionMoments(results: readonly number[]): { mean: number; sd: number } | null {
  if (results.length < 2) return null;
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const v = results.reduce((a, b) => a + (b - mean) ** 2, 0) / (results.length - 1);
  return { mean, sd: Math.sqrt(v) };
}

/**
 * Classic diffusion risk of ruin: exp(−2·μ·B / σ²) per session. Losing (μ ≤ 0) → 100%.
 * Returns 0..1.
 */
export function riskOfRuin(bankroll: number, mean: number, sd: number): number {
  if (bankroll <= 0) return 1;
  if (mean <= 0) return 1;
  if (sd <= 0) return 0;
  return Math.min(1, Math.exp((-2 * mean * bankroll) / (sd * sd)));
}

export type RiskBand = "very low" | "low" | "moderate" | "high" | "very high";
export function riskBand(r: number): RiskBand {
  if (r < 0.01) return "very low";
  if (r < 0.05) return "low";
  if (r < 0.15) return "moderate";
  if (r < 0.4) return "high";
  return "very high";
}

/** Small seeded PRNG so forecasts are stable between renders and testable. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Forecast = {
  conservative: number;
  expected: number;
  strong: number;
  ruinShare: number;
  sessions: number;
};

/**
 * Bootstrap forecast: replay `sessions` random draws from your own past results, many
 * times, and report the 10th / 50th / 90th percentile bankroll. Your results, resampled —
 * so it carries your real variance, fat tails included.
 */
export function forecast(
  bankroll: number,
  results: readonly number[],
  sessions: number,
  runs = 2000,
  seed = 42,
): Forecast | null {
  if (results.length < 5 || sessions <= 0) return null;
  const rand = mulberry32(seed);
  const ends: number[] = [];
  let ruined = 0;
  for (let r = 0; r < runs; r++) {
    let b = bankroll;
    let broke = false;
    for (let s = 0; s < sessions; s++) {
      b += results[Math.floor(rand() * results.length)]!;
      if (b <= 0) broke = true;
    }
    if (broke) ruined++;
    ends.push(b);
  }
  ends.sort((a, b) => a - b);
  const q = (p: number) =>
    Math.round(ends[Math.min(ends.length - 1, Math.floor(p * ends.length))]!);
  return {
    conservative: q(0.1),
    expected: q(0.5),
    strong: q(0.9),
    ruinShare: ruined / runs,
    sessions,
  };
}

/** Sessions per month from the last 90 days of activity (at least 1). */
export function sessionsPerMonth(startedAt: readonly string[], now: number): number {
  const since = now - 90 * 86_400_000;
  const n = startedAt.filter((t) => Date.parse(t) >= since).length;
  return Math.max(1, Math.round(n / 3));
}
