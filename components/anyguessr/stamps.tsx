import type { CSSProperties } from "react";
import type { DailyRoundResult } from "@/lib/anyguessr/types";

/** How close a round was, which sets the stamp's ink colour. */
export function stampTone(result: Pick<DailyRoundResult, "exact" | "roundScore" | "surrendered">): "exact" | "close" | "far" {
  if (result.exact) return "exact";
  if (result.surrendered) return "far";
  return result.roundScore >= 50 ? "close" : "far";
}

// A fixed tilt per slot, so stamps look hand-pressed but do not jump between renders.
const TILTS = [-8, 6, -4, 9, -7, 5, -9, 4, -5, 8];

/**
 * The run so far as a row of passport stamps: one slot per round, stamped with the answer's
 * flag and the points scored once the round is played.
 */
export function Stamps({
  total,
  results,
  current,
}: {
  total: number;
  results: readonly DailyRoundResult[];
  /** Index of the round being played, or -1 when the run is over. */
  current: number;
}) {
  return (
    <ol className="ag-stamps" aria-label="Rounds">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        if (!result) {
          return (
            <li key={i} className={`ag-stamp${i === current ? " is-now" : ""}`} aria-current={i === current ? "step" : undefined}>
              {i + 1}
            </li>
          );
        }
        return (
          <li
            key={i}
            className={`ag-stamp is-got is-${stampTone(result)}`}
            style={{ "--tilt": `${TILTS[i % TILTS.length]}deg` } as CSSProperties}
            aria-label={`Round ${i + 1}: ${result.answer}, ${result.roundScore} points`}
          >
            {result.flagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.flagUrl} alt="" />
            ) : (
              <span className="ag-stamp-code">{result.answer.slice(0, 3)}</span>
            )}
            <b>{result.roundScore}</b>
          </li>
        );
      })}
    </ol>
  );
}
