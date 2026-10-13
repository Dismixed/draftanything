"use client";

import { useEffect, useState } from "react";
import { axisLabels, type CompetitiveGameId } from "@/lib/games/percentile";

export interface DailyPercentile {
  percentile: number;
  /** The day's highest possible score, for the curve's axis. */
  max: number | null;
}

/**
 * How the player did against everyone who finished this game today.
 *
 * `record: true` is for a game that has just ended: it stores the finish, then reads.
 * `record: false` is for a return visit, where the score comes from local storage.
 * Returns null while loading and whenever the request fails; the finish screen then
 * shows the result without the curve.
 */
export function useDailyPercentile(
  game: CompetitiveGameId,
  score: number,
  { enabled, record }: { enabled: boolean; record: boolean },
): DailyPercentile | null {
  // The answer is stored with the request it belongs to, so a stale answer is never
  // returned for a different game or score and the effect never has to reset state.
  const [state, setState] = useState<{ key: string; value: DailyPercentile } | null>(null);
  const key = `${game}:${score}:${record}`;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const request = record
      ? fetch("/api/daily-finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ game, score }),
        })
      : fetch(`/api/daily-finish?game=${game}&score=${score}`, { credentials: "same-origin" });

    request
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { percentile?: unknown; max?: unknown } | null) => {
        if (cancelled || !data || typeof data.percentile !== "number") return;
        setState({ key, value: { percentile: data.percentile, max: typeof data.max === "number" ? data.max : null } });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [game, score, enabled, record, key]);

  return enabled && state?.key === key ? state.value : null;
}

/** The `curve` prop for `FinishScreen`, or null when there is nothing to draw. */
export function finishCurve(
  game: CompetitiveGameId,
  result: DailyPercentile | null,
): { percentile: number; lowLabel: string; highLabel: string } | null {
  if (!result) return null;
  return { percentile: result.percentile, ...axisLabels(game, result.max) };
}
