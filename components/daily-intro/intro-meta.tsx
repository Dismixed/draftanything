"use client";

import type { ReactNode } from "react";
import { useIntroCount } from "@/lib/daily-intro/use-intro-count";
import type { DailyGameId } from "@/lib/games/registry";
import { useStreakOptional } from "@/lib/streak/context";

/** "Tue 14 Oct", in UTC to match the day every daily is keyed on. */
export function introDate(date: Date = new Date()): string {
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Today's date and, once the player has one, their streak for this game. */
export function IntroToday({ game, className }: { game: DailyGameId; className?: string }) {
  const streak = useStreakOptional()?.streaks.find((s) => s.id === game)?.currentStreak ?? 0;
  return (
    <span className={className ?? "intro-today"}>
      {/* The server renders a different day than the browser around midnight UTC. */}
      <span suppressHydrationWarning>{introDate()}</span>
      {streak > 0 && (
        <span className="intro-streak">
          <i aria-hidden="true" />
          {streak}-day streak
        </span>
      )}
    </span>
  );
}

/**
 * "1,240 played today" when enough people have played, otherwise `fallback`. The count is only
 * ever a real one, read from the plays the game records.
 */
export function IntroCount({
  game,
  fallback,
  verb = "played",
  className,
}: {
  game: DailyGameId;
  fallback: ReactNode;
  verb?: string;
  className?: string;
}) {
  const count = useIntroCount(game);
  return (
    <span className={className ?? "intro-count"}>
      {count === null ? (
        fallback
      ) : (
        <>
          <b>{count.toLocaleString("en-US")}</b> {verb} today
        </>
      )}
    </span>
  );
}
