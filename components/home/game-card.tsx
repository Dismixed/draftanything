"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { GameCardPreview } from "@/components/daily/game-card-preview";
import { GameTitle } from "@/components/ui/game-title";
import { track } from "@/lib/analytics/track";
import { requestDirectPlay } from "@/lib/daily-intro/direct-play";
import { getGame, isDailyGame, type GameId } from "@/lib/games/registry";

export interface GameCardProps {
  gameId: GameId;
  played?: boolean;
  streak?: number;
  /** Action label when the game is not played. Defaults to "Play". */
  cta?: string;
  /** Defaults to the game's `playHref`. */
  href?: string;
  /** Open a daily game straight into play, without its intro. */
  skipIntro?: boolean;
  event: "home_game_clicked" | "game_about_link_clicked";
  eventProps: Record<string, string | number | boolean>;
}

export function GameCard({
  gameId,
  played = false,
  streak = 0,
  cta = "Play",
  href,
  skipIntro = false,
  event,
  eventProps,
}: GameCardProps) {
  const game = getGame(gameId);

  return (
    <Link
      href={href ?? game.playHref}
      className={`home-card${played ? " is-done" : ""}`}
      style={{ "--accent": game.theme.accent, "--brand": game.brand.color } as CSSProperties}
      onClick={() => {
        if (skipIntro && isDailyGame(gameId)) requestDirectPlay(gameId);
        track(event, eventProps);
      }}
    >
      <div className="home-card-body">
        <div className="home-card-row">
          <span className="home-card-kind">{game.category}</span>
          {streak > 0 ? (
            <span className="home-card-streak" aria-label={`${streak} day streak`}>
              🔥 {streak}
            </span>
          ) : null}
        </div>
        <GameTitle game={gameId} as="div" className="home-card-title" />
        <div className="home-card-blurb">{game.blurb}</div>
        <div className="home-card-act">{played ? "✓ Done today" : `${cta} →`}</div>
      </div>
      {isDailyGame(gameId) ? (
        <div className="home-card-preview">
          <GameCardPreview gameId={gameId} />
        </div>
      ) : null}
    </Link>
  );
}
