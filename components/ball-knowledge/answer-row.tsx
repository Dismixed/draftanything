import type { AnswerEntry } from "@/lib/ball-knowledge/types";

/** One answer as a chip on the wall, during the round and on the result. */
export function AnswerChip({ entry }: { entry: AnswerEntry }) {
  const icon =
    entry.status === "pending" ? (
      <span className="bk-spin" />
    ) : entry.status === "ok" ? (
      "✓"
    ) : (
      "✕"
    );

  return (
    <li className={`bk-chip ${entry.status}`} data-id={entry.id}>
      <span className="bk-chip-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="bk-chip-text">{entry.displayText}</span>
      {entry.status === "bad" && entry.reason ? (
        <span className="bk-chip-reason">{entry.reason}</span>
      ) : null}
    </li>
  );
}
