"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";
import { requestDirectPlay } from "@/lib/daily-intro/direct-play";
import { DEBATE_GAME, getGame } from "@/lib/games/registry";
import { TIERS } from "@/lib/hot-takes/hottest";

interface TodayDebateProps {
  /** Today's category, or null when it is unknown or the cached page is from an earlier day. */
  category: string | null;
  played: boolean;
  streak: number;
}

/** Hot Takes on the home page: an opinion to settle, kept apart from the puzzle lineup. */
export function TodayDebate({ category, played, streak }: TodayDebateProps) {
  const game = getGame(DEBATE_GAME);

  return (
    <section
      className={`home-debate${played ? " is-done" : ""}`}
      data-testid="home-debate"
      style={{ "--brand": game.brand.color } as CSSProperties}
    >
      <ol className="home-debate-tiers" aria-hidden>
        {TIERS.map((tier) => (
          <li key={tier} style={{ "--heat": `var(--ht-heat-${tier.toLowerCase()})` } as CSSProperties}>
            {tier}
          </li>
        ))}
      </ol>
      <div className="home-debate-copy">
        <div className="home-card-row">
          <p className="home-kicker">Today&apos;s debate · {game.name}</p>
          {streak > 0 ? (
            <span className="home-card-streak" aria-label={`${streak} day streak`}>
              🔥 {streak}
            </span>
          ) : null}
        </div>
        <h2 className="home-debate-title">{category ?? "Today's debate is ready"}</h2>
        <p className="home-debate-line">
          {played
            ? "You've ranked it. See where you split from the crowd."
            : "Fifteen items. Rank them S to D, then see where you split from the crowd."}
        </p>
      </div>
      <Link
        href={game.playHref}
        className="home-debate-cta"
        onClick={() => {
          if (!played) requestDirectPlay(DEBATE_GAME);
          track("home_game_clicked", { game: DEBATE_GAME, slot: "debate", position: 0, played_today: played });
        }}
      >
        {played ? "See your takes →" : "Rank it →"}
      </Link>
    </section>
  );
}
