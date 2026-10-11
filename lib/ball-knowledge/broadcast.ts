export type BroadcastCallKind = "hit" | "big" | "miss";

export interface BroadcastCall {
  kind: BroadcastCallKind;
  headline: string;
  detail: string;
}

const HIT_CALLS = [
  "BUCKET!",
  "COUNT IT!",
  "SPLASH!",
  "MONEY!",
  "CASH!",
  "FROM DOWNTOWN!",
  "AND ONE!",
  "NOTHING BUT NET!",
] as const;

const MISS_CALLS = ["AIRBALL", "OFF THE IRON", "BRICK", "REJECTED"] as const;

/** The call for a run of accepted answers, or null while the run is too short to mention. */
export function streakCall(streak: number): string | null {
  if (streak >= 10) return "CAN'T MISS!";
  if (streak >= 7) return "UNCONSCIOUS!";
  if (streak >= 5) return "ON FIRE!";
  if (streak >= 3) return "HEATING UP!";
  return null;
}

/** `score` and `streak` both include the answer being called. */
export function hitCall(answer: string, score: number, streak: number): BroadcastCall {
  const run = streakCall(streak);
  return {
    kind: run ? "big" : "hit",
    headline: run ?? HIT_CALLS[(Math.max(score, 1) - 1) % HIT_CALLS.length],
    detail: streak > 1 ? `${answer} · ${streak} in a row` : answer,
  };
}

/** `missNumber` is how many answers have been rejected so far, including this one. */
export function missCall(answer: string, reason: string, missNumber: number): BroadcastCall {
  return {
    kind: "miss",
    headline: MISS_CALLS[(Math.max(missNumber, 1) - 1) % MISS_CALLS.length],
    detail: reason ? `${answer} · ${reason}` : answer,
  };
}
