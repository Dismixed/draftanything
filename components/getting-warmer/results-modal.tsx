"use client";

import { OtherDailies } from "@/components/daily/other-dailies";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import type { LeaderboardEntry } from "@/lib/getting-warmer/types";

interface GettingWarmerResultsModalProps {
  won: boolean;
  gaveUp?: boolean;
  answer: string;
  attempts: number;
  guesses: string[];
  shareEmojis: string;
  countdown?: string;
  alreadyPlayed?: boolean;
  leaderboard: LeaderboardEntry[];
  lbLoading: boolean;
  submittedEntryId: string | null;
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onJoinLeaderboard: () => void;
  lbSubmitting: boolean;
  lbSubmitted: boolean;
}

export function GettingWarmerResultsModal({
  won,
  gaveUp,
  answer,
  attempts,
  guesses,
  shareEmojis,
  countdown,
  alreadyPlayed,
  leaderboard,
  lbLoading,
  submittedEntryId,
  nameInput,
  onNameInputChange,
  onJoinLeaderboard,
  lbSubmitting,
  lbSubmitted,
}: GettingWarmerResultsModalProps) {
  const statusLabel = alreadyPlayed
    ? "ALREADY PLAYED TODAY"
    : won
      ? "YOU GOT IT"
      : "TODAY'S WORD WAS";

  const summaryLabel = won
    ? `${attempts} ${attempts === 1 ? "guess" : "guesses"}`
    : gaveUp
      ? `${attempts} ${attempts === 1 ? "guess" : "guesses"} before giving up`
      : `${attempts} ${attempts === 1 ? "guess" : "guesses"}`;

  return (
    <div className="gw-results-modal">
      <div className="gw-results-modal-card">
        <div className="gw-results-eyebrow">Daily Complete</div>

        <div className="gw-result">
          <div className="gw-sub">{statusLabel}</div>
          {answer ? (
            <div className="gw-result-answer">{answer}</div>
          ) : null}
          <div className="gw-result-score">
            {won ? (
              <>
                <b>{attempts}</b>
                {attempts === 1 ? "guess" : "guesses"}
              </>
            ) : (
              summaryLabel
            )}
          </div>
          <div className="gw-share-emoji">{shareEmojis}</div>
        </div>

        {guesses.length > 0 && (
          <div className="gw-guess-recap">
            <div className="gw-section-label">Your Guesses</div>
            <div className="gw-guess-recap-list">
              {guesses.map((guess, i) => {
                const isWinningGuess = won && i === guesses.length - 1;
                return (
                  <div
                    key={`${i}-${guess}`}
                    className={`gw-guess-recap-item${isWinningGuess ? " correct" : ""}`}
                  >
                    <span className="gw-guess-recap-num">{i + 1}</span>
                    <span>{guess}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {won && (
          <>
            <div className="gw-section-label" style={{ marginTop: 20 }}>
              Join Today&apos;s Leaderboard
            </div>
            {!lbSubmitted ? (
              <div className="gw-join-row">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => onNameInputChange(e.target.value)}
                  placeholder="Your name"
                  maxLength={18}
                />
                <button
                  type="button"
                  onClick={onJoinLeaderboard}
                  disabled={lbSubmitting}
                >
                  {lbSubmitting ? "…" : "Join"}
                </button>
              </div>
            ) : (
              <div className="gw-empty-note">You&apos;re on the board!</div>
            )}
          </>
        )}

        <div className="gw-leaderboard">
          <div className="gw-lb-head">
            <h2>Today&apos;s Leaderboard</h2>
            <span>{lbLoading ? "…" : `${leaderboard.length} players`}</span>
          </div>
          {lbLoading ? (
            <div className="gw-empty-note">Loading…</div>
          ) : leaderboard.length === 0 ? (
            <div className="gw-empty-note">No entries yet — be the first.</div>
          ) : (
            leaderboard.slice(0, 10).map((row, i) => (
              <div
                key={row.id}
                className={`gw-lb-row${row.id === submittedEntryId ? " me" : ""}`}
              >
                <div className="gw-lb-rank">{i + 1}</div>
                <div className="gw-lb-name">{row.name}</div>
                <div className="gw-lb-score">
                  {row.guesses}
                  <span
                    style={{ opacity: 0.6, fontSize: "10px", marginLeft: "3px" }}
                  >
                    {row.guesses === 1 ? "guess" : "guesses"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {won && (
          <div className="gw-streak-line">
            <WinStreakLine gameId="getting-warmer" />
          </div>
        )}

        <OtherDailies currentGameId="getting-warmer" />

        {countdown ? (
          <p className="gw-countdown">Next puzzle in {countdown}</p>
        ) : null}
      </div>
    </div>
  );
}
