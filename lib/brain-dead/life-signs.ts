/** The in-run streak drawn as a brain monitor trace: flat at zero, busier with every answer. */

/** Streak needed to reach each tier. Matches the result screen's ranks. */
const TIER_STARTS = [0, 1, 3, 5, 8, 12] as const;

export const LIFE_SIGNS_LABELS = [
  "Flatline",
  "Signs of life",
  "Getting warm",
  "Not bad",
  "Big brain energy",
  "Absolutely cooked it",
] as const;

export function lifeSignsTier(streak: number): number {
  let tier = 0;
  for (let i = 0; i < TIER_STARTS.length; i++) {
    if (streak >= TIER_STARTS[i]) tier = i;
  }
  return tier;
}

export function nextMilestone(streak: number): { at: number; label: string } | null {
  const next = lifeSignsTier(streak) + 1;
  if (next >= TIER_STARTS.length) return null;
  return { at: TIER_STARTS[next], label: LIFE_SIGNS_LABELS[next] };
}

const MID = 48;
/** The path is two identical 1000-unit halves, so sliding it left by half loops seamlessly. */
const HALF = 1000;
/** Free play has no upper limit, so the trace stops growing here. */
const MAX_DRAWN = 16;

const r = (n: number) => Math.round(n * 100) / 100;

/** SVG path for a 2000 x 96 viewBox. */
export function tracePath(streak: number): string {
  if (streak <= 0) return `M0 ${MID} L${HALF * 2} ${MID}`;

  const s = Math.min(streak, MAX_DRAWN);
  const amp = Math.min(44, 6 + s * 3.4);
  const beats = 4 + Math.round(s * 1.5);
  const w = HALF / beats;

  let d = `M0 ${MID}`;
  for (let half = 0; half < 2; half++) {
    for (let i = 0; i < beats; i++) {
      const x = half * HALF + i * w;
      // Vary each beat's height so it reads as a live signal, not a ruler.
      const a = amp * (0.55 + 0.45 * Math.abs(Math.sin(i * 2.3)));
      d +=
        ` L${r(x + w * 0.35)} ${MID}` +
        ` L${r(x + w * 0.45)} ${r(MID - a * 0.35)}` +
        ` L${r(x + w * 0.52)} ${r(MID + a * 0.5)}` +
        ` L${r(x + w * 0.6)} ${r(MID - a)}` +
        ` L${r(x + w * 0.7)} ${r(MID + a * 0.3)}` +
        ` L${r(x + w * 0.8)} ${MID}`;
    }
  }
  return `${d} L${HALF * 2} ${MID}`;
}

/** Seconds for the trace to scroll one loop. */
export function traceSeconds(streak: number): number {
  return Math.max(1.8, 7 - Math.min(streak, MAX_DRAWN) * 0.4);
}
