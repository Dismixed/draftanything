"use client";

import { ROUNDS } from "@/lib/freezeframes/rounds";

export interface FreezeFramesRound {
  answer: string;
  score: number;
  correct: boolean;
}

export interface FreezeFramesEntry {
  name: string;
  onNameChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

const number = (n: number) => n.toLocaleString("en-US");

/** The day's Freeze Frames result, as shown on the finish screen and on the page under it. */
export function FreezeFramesFinishResult({
  score,
  max,
  rounds,
  entry,
}: {
  score: number;
  max: number;
  /** Null on a return visit, when only the day's total was saved. */
  rounds: readonly FreezeFramesRound[] | null;
  /** Null when there is nothing to save (a return visit). */
  entry: FreezeFramesEntry | null;
}) {
  return (
    <div className="ff-fin">
      <p className="ff-fin-eyebrow">Today&apos;s result</p>
      <div className="ff-fin-score" data-testid="ff-fin-score">
        {number(score)}
        <span>/ {number(max)}</span>
      </div>

      {rounds ? (
        <ul className="ff-fin-rounds">
          {ROUNDS.map((round, i) => {
            const result = rounds[i];
            return (
              <li key={round.key}>
                <span className="ff-fin-icon" aria-hidden="true">
                  {round.icon}
                </span>
                <span className="ff-fin-answer">{result?.answer ?? "—"}</span>
                <span className={`ff-fin-pts${result?.correct ? " is-got" : ""}`}>
                  {result?.correct ? `+${result.score}` : "−"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {entry && !entry.saved ? (
        <div className="ff-fin-save">
          <input
            className="freezeframes-name-inp"
            value={entry.name}
            onChange={(e) => entry.onNameChange(e.target.value)}
            placeholder="Your name"
            aria-label="Your name for the leaderboard"
            maxLength={20}
          />
          <button
            type="button"
            className="freezeframes-btn freezeframes-btn-purple freezeframes-btn-sm"
            onClick={entry.onSave}
            disabled={entry.saving}
          >
            {entry.saving ? "Saving…" : "Save score"}
          </button>
        </div>
      ) : null}
      {entry?.saved ? <p className="ff-fin-saved">Saved to the leaderboard.</p> : null}
    </div>
  );
}
