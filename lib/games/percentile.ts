export const COMPETITIVE_GAMES = [
  "brain-dead",
  "anyguessr",
  "freezeframes",
  "ball-knowledge",
  "getting-warmer",
] as const;

export type CompetitiveGameId = (typeof COMPETITIVE_GAMES)[number];

/** Whether a bigger or a smaller score is the better one. */
export type Direction = "higher" | "lower";

export const DIRECTION: Record<CompetitiveGameId, Direction> = {
  "brain-dead": "higher",
  anyguessr: "higher",
  freezeframes: "higher",
  "ball-knowledge": "higher",
  "getting-warmer": "lower",
};

/** Finishes a game needs on a day before the real distribution replaces the assumed one. */
export const MIN_SAMPLE = 30;

/**
 * The assumed spread of scores, used until a day has MIN_SAMPLE finishes. These are guesses
 * to tune against real data. `relative` curves are fractions of the day's maximum score.
 */
const CURVES: Record<CompetitiveGameId, { mean: number; sd: number; relative: boolean }> = {
  "brain-dead": { mean: 0.45, sd: 0.2, relative: true },
  anyguessr: { mean: 0.55, sd: 0.2, relative: true },
  freezeframes: { mean: 0.55, sd: 0.22, relative: true },
  "ball-knowledge": { mean: 12, sd: 6, relative: false },
  "getting-warmer": { mean: 14, sd: 8, relative: false },
};

export function clampPercentile(value: number): number {
  return Math.min(99, Math.max(1, Math.round(value)));
}

/** Abramowitz and Stegun 7.1.26. Accurate to about 1e-7, which is far more than a whole percent needs. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Share of the other players who did strictly worse. `others` leaves the player out. */
export function measuredPercentile(worse: number, others: number): number {
  if (others <= 0) return 50;
  return clampPercentile((100 * worse) / others);
}

export function estimatedPercentile(game: CompetitiveGameId, score: number, max: number): number {
  const curve = CURVES[game];
  if (curve.relative && max <= 0) return 50;
  const mean = curve.relative ? curve.mean * max : curve.mean;
  const sd = curve.relative ? curve.sd * max : curve.sd;
  const below = normalCdf((score - mean) / sd);
  return clampPercentile(100 * (DIRECTION[game] === "higher" ? below : 1 - below));
}

export interface PercentileInput {
  game: CompetitiveGameId;
  score: number;
  /** The day's highest possible score. Only the relative curves use it. */
  max: number;
  /** Finishes recorded for this game today. */
  total: number;
  /** How many of them are strictly worse than `score`. */
  worse: number;
  /** Whether the player's own finish is one of `total`. */
  ownCounted: boolean;
}

export interface PercentileResult {
  percentile: number;
  source: "estimated" | "measured";
  sample: number;
}

export function percentileFor(input: PercentileInput): PercentileResult {
  if (input.total >= MIN_SAMPLE) {
    const others = input.total - (input.ownCounted ? 1 : 0);
    return { percentile: measuredPercentile(input.worse, others), source: "measured", sample: input.total };
  }
  return {
    percentile: estimatedPercentile(input.game, input.score, input.max),
    source: "estimated",
    sample: input.total,
  };
}

/**
 * Standard deviations from the mean at which `percentile` percent of a normal curve lies to
 * the left (Acklam's approximation). Input is held to 0.5–99.5 so the result stays within
 * about ±2.6 and the marker stays on the plot.
 */
export function zForPercentile(percentile: number): number {
  const p = Math.min(0.995, Math.max(0.005, percentile / 100));
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;

  const tail = (q: number) =>
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);

  if (p < low) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - low) return -tail(Math.sqrt(-2 * Math.log(1 - p)));

  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/** What to print at the two ends of the bell curve's axis. */
export function axisLabels(game: CompetitiveGameId, max: number | null): { lowLabel: string; highLabel: string } {
  if (game === "getting-warmer") return { lowLabel: "most guesses", highLabel: "fewest" };
  if (game === "ball-knowledge") return { lowLabel: "0", highLabel: "most named" };
  return { lowLabel: "0", highLabel: max ? max.toLocaleString("en-US") : "top score" };
}
