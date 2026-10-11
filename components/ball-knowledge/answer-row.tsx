import type { AnswerEntry } from "@/lib/ball-knowledge/types";

export function AnswerRow({ entry }: { entry: AnswerEntry }) {
  const icon =
    entry.status === "pending" ? (
      <div className="bk-spin" />
    ) : entry.status === "ok" ? (
      "✓"
    ) : (
      "✕"
    );

  return (
    <div className={`bk-answer-row ${entry.status}`} data-id={entry.id}>
      <div className="bk-icon">{icon}</div>
      <div>{entry.displayText}</div>
      {entry.status !== "pending" && entry.reason ? (
        <div className="bk-reason">{entry.reason}</div>
      ) : null}
    </div>
  );
}
