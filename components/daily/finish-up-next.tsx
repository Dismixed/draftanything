"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";
import { requestDirectPlay } from "@/lib/daily-intro/direct-play";
import { nextDaily, remainingDailies } from "@/lib/games/next";
import { getGame, type DailyGameId } from "@/lib/games/registry";

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

interface FinishUpNextProps {
  gameId: DailyGameId;
  played: ReadonlySet<DailyGameId>;
  /** How many Sweeps the player has, including today's. */
  sweeps: number;
  /** "3h 12m" */
  countdown: string;
}

export function FinishUpNext({ gameId, played, sweeps, countdown }: FinishUpNextProps) {
  const next = nextDaily(played);

  if (!next) {
    return (
      <section className="fin-sweep" data-testid="finish-sweep">
        <h3>Sweep. All seven done today.</h3>
        <p>
          Your {ordinal(Math.max(1, sweeps))} Sweep. New puzzles in {countdown}.
        </p>
        <Link href="/draft-anything" className="fin-play">
          Create a Draft room →
        </Link>
      </section>
    );
  }

  const game = getGame(next);
  const others = remainingDailies(played);

  return (
    <>
      <section className="fin-up" data-testid="finish-up-next" style={{ "--nx": game.theme.accent } as CSSProperties}>
        <div className="fin-up-top">
          <span className="fin-label">Up next</span>
          <span className="fin-time">{game.duration}</span>
        </div>
        <div className="fin-up-name">{game.name}</div>
        <p className="fin-up-blurb">{game.blurb}</p>
        <Link
          href={game.playHref}
          className="fin-play"
          data-game={next}
          onClick={() => {
            requestDirectPlay(next);
            track("finish_next_clicked", { from: gameId, game: next, slot: "up_next" });
          }}
        >
          Play {game.name} →
        </Link>
      </section>

      {others.length > 0 ? (
        <section className="fin-others" data-testid="finish-others">
          <span className="fin-label">Or pick another</span>
          <div className="fin-grid">
            {others.map((id) => {
              const other = getGame(id);
              return (
                <Link
                  key={id}
                  href={other.playHref}
                  className="fin-other"
                  style={{ "--c": other.theme.accent } as CSSProperties}
                  onClick={() => {
                    requestDirectPlay(id);
                    track("finish_next_clicked", { from: gameId, game: id, slot: "other" });
                  }}
                >
                  <span className="fin-other-name">{other.name}</span>
                  <span className="fin-other-blurb">{other.blurb}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
