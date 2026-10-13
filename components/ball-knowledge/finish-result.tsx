"use client";

import { useState } from "react";
import type { AnswerEntry, LeaderboardEntry } from "@/lib/ball-knowledge/types";
import { AnswerChip } from "./answer-row";

export interface BallKnowledgeJoin {
  name: string;
  onNameChange: (value: string) => void;
  onJoin: () => void;
  joining: boolean;
}

type Tab = "ok" | "bad" | "missed";

const MISSED_PREVIEW = 30;

/** The answers on our list that the player never named. */
function MissedList({ missed, bankSize }: { missed: readonly string[]; bankSize: number }) {
  const [showAll, setShowAll] = useState(false);

  if (missed.length === 0) {
    return <div className="bk-empty-note">You named everything on our list.</div>;
  }

  // The list runs best-known first, so the cut keeps the answers a player kicks themselves over.
  const shown = showAll ? missed : missed.slice(0, MISSED_PREVIEW);

  return (
    <>
      <div className="bk-missed-note">
        Missed {missed.length} of {bankSize} on our list. Other correct answers count too.
      </div>
      <ul className="bk-wall bk-wall--end">
        {shown.map((answer) => (
          <li key={answer} className="bk-chip missed">
            <span className="bk-chip-icon" aria-hidden="true">
              –
            </span>
            <span className="bk-chip-text">{answer}</span>
          </li>
        ))}
      </ul>
      {shown.length < missed.length && (
        <button type="button" className="bk-missed-more" onClick={() => setShowAll(true)}>
          Show all {missed.length}
        </button>
      )}
    </>
  );
}

/** The day's Ball Knowledge result, as shown on the finish screen and on the page under it. */
export function BallKnowledgeFinishResult({
  score,
  category,
  entries,
  missed = null,
  bankSize = 0,
  join,
  leaderboard,
  leaderboardLoading,
  myEntryId,
}: {
  score: number;
  category: string;
  /** This round's answers. Null on a return visit, when they were not kept. */
  entries: readonly AnswerEntry[] | null;
  /** Answers on our list the player never named. Null when the category has no list. */
  missed?: readonly string[] | null;
  bankSize?: number;
  /** Null on a return visit. */
  join: BallKnowledgeJoin | null;
  leaderboard: readonly LeaderboardEntry[];
  leaderboardLoading: boolean;
  myEntryId: string | null;
}) {
  const [tab, setTab] = useState<Tab>("ok");
  const shown = entries ? entries.filter((entry) => entry.status === tab) : [];

  return (
    <div className="bk-finish">
      <div className="bk-end-score">
        <div className="bk-end-call">Final buzzer</div>
        <div className="bk-end-num" data-testid="bk-fin-score">
          {score}
        </div>
        <div className="bk-end-lbl">Named in 60 seconds</div>
      </div>
      <p className="bk-finish-category">
        Category: <strong>{category}</strong>
      </p>

      {entries ? (
        <>
          <div className="bk-tabs">
            <button type="button" className={`bk-tab${tab === "ok" ? " active" : ""}`} onClick={() => setTab("ok")}>
              Accepted
            </button>
            <button type="button" className={`bk-tab${tab === "bad" ? " active" : ""}`} onClick={() => setTab("bad")}>
              Wrong
            </button>
            {missed && (
              <button
                type="button"
                className={`bk-tab${tab === "missed" ? " active" : ""}`}
                onClick={() => setTab("missed")}
              >
                Missed
              </button>
            )}
          </div>
          {tab === "missed" && missed ? (
            <MissedList missed={missed} bankSize={bankSize} />
          ) : shown.length === 0 ? (
            <div className="bk-empty-note">
              {tab === "ok" ? "Nothing accepted this round." : "No wrong guesses. Clean round."}
            </div>
          ) : (
            <ul className="bk-wall bk-wall--end">
              {[...shown].reverse().map((entry) => (
                <AnswerChip key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </>
      ) : missed ? (
        <>
          <div className="bk-section-label">What You Missed</div>
          <MissedList missed={missed} bankSize={bankSize} />
        </>
      ) : null}

      <div className="bk-divider" />

      {join ? (
        <>
          <div className="bk-section-label">Join Today&apos;s Leaderboard</div>
          <div className="bk-join-row">
            <input
              type="text"
              value={join.name}
              onChange={(e) => join.onNameChange(e.target.value)}
              placeholder="Your name"
              aria-label="Your name for the leaderboard"
              maxLength={18}
            />
            <button type="button" onClick={join.onJoin} disabled={join.joining}>
              {join.joining ? "…" : "Join"}
            </button>
          </div>
        </>
      ) : (
        <div className="bk-section-label">Today&apos;s Leaderboard</div>
      )}

      {leaderboardLoading ? (
        <div className="bk-empty-note">Loading leaderboard…</div>
      ) : leaderboard.length === 0 ? (
        <div className="bk-empty-note">No scores yet today.</div>
      ) : (
        <ol className="bk-finish-board" data-testid="bk-fin-board">
          {leaderboard.slice(0, 10).map((row, i) => (
            <li key={row.id} className={`bk-lb-row${row.id === myEntryId ? " me" : ""}`}>
              <div className="bk-lb-rank">{i + 1}</div>
              <div className="bk-lb-name">{row.name}</div>
              <div className="bk-lb-score">{row.score}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
