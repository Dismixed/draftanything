"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";
import { requestDirectPlayFromFinish } from "@/lib/daily-intro/direct-play";
import { nextDaily } from "@/lib/games/next";
import { DEBATE_GAME, PUZZLE_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";

/** On a puzzle's finish screen: Hot Takes, offered apart from the puzzle run. */
export function FinishDebate({ gameId }: { gameId: DailyGameId }) {
  const game = getGame(DEBATE_GAME);

  return (
    <section className="fin-debate" data-testid="finish-debate" style={{ "--nx": game.theme.accent } as CSSProperties}>
      <div>
        <span className="fin-label">Today&apos;s debate</span>
        <p className="fin-debate-line">A 15-item tier list. No right answers. {game.duration}</p>
      </div>
      <Link
        href={game.playHref}
        className="fin-debate-cta"
        onClick={() => {
          requestDirectPlayFromFinish(DEBATE_GAME);
          track("finish_next_clicked", { from: gameId, game: DEBATE_GAME, slot: "debate" });
        }}
      >
        Rank it →
      </Link>
    </section>
  );
}

/** On Hot Takes' finish screen: one quiet way back into the puzzles, in place of the run. */
export function FinishBackToPuzzles({ played }: { played: ReadonlySet<DailyGameId> }) {
  const next = nextDaily(played);

  if (!next) {
    return (
      <p className="fin-back" data-testid="finish-back-to-puzzles">
        All six puzzles done today.
      </p>
    );
  }

  const left = PUZZLE_GAMES.filter((id) => !played.has(id)).length;
  return (
    <p className="fin-back" data-testid="finish-back-to-puzzles">
      <Link
        href={getGame(next).playHref}
        onClick={() => {
          requestDirectPlayFromFinish(next);
          track("finish_next_clicked", { from: DEBATE_GAME, game: next, slot: "back_to_puzzles" });
        }}
      >
        Back to the puzzles · {left} left →
      </Link>
    </p>
  );
}
