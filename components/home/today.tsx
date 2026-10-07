"use client";

import { useMemo, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { GameCardPreview } from "@/components/daily/game-card-preview";
import { GameCard } from "@/components/home/game-card";
import { GameTitle } from "@/components/ui/game-title";
import { track } from "@/lib/analytics/track";
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import {
  buildTodayView,
  formatCountdown,
  msUntilNextUtcDay,
  utcDayNumber,
} from "@/lib/games/today";
import { useStreak } from "@/lib/streak/context";

function subscribeToClock(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinuteOnServer = () => null;

export function Today({ dayNumber }: { dayNumber: number }) {
  const { streaks } = useStreak();

  // The server-rendered page can be cached across midnight UTC. Hydrate with the server's
  // day, then trust the browser's clock.
  const day = useSyncExternalStore(subscribeToClock, utcDayNumber, () => dayNumber);
  const minute = useSyncExternalStore(subscribeToClock, currentMinute, noMinuteOnServer);
  const now = minute === null ? null : minute * 60_000;

  const played = useMemo(
    () => new Set<DailyGameId>(streaks.filter((s) => s.playedToday).map((s) => s.id)),
    [streaks],
  );
  const streakFor = useMemo(
    () => new Map<DailyGameId, number>(streaks.map((s) => [s.id, s.currentStreak])),
    [streaks],
  );

  const view = buildTodayView(day, played);
  const featured = view.featured ? getGame(view.featured) : null;

  return (
    <>
      {featured && view.featured ? (
        <section
          className="home-featured"
          data-testid="home-featured"
          style={{ "--accent": featured.theme.accent, "--brand": featured.brand.color } as CSSProperties}
        >
          <div className="home-featured-copy">
            <p className="home-kicker">
              {view.isUpNext ? "Up next" : "Today's featured game"} · {featured.category}
            </p>
            <GameTitle game={featured.id} as="h2" className="home-featured-title" />
            <p className="home-featured-pitch">{featured.pitch}</p>
            <Link
              href={featured.playHref}
              className="home-cta"
              onClick={() =>
                track("home_game_clicked", {
                  game: featured.id,
                  slot: "featured",
                  position: 0,
                  played_today: false,
                })
              }
            >
              Play today&apos;s {featured.name} →
            </Link>
          </div>
          <div className="home-featured-preview">
            <GameCardPreview gameId={view.featured} size="lg" />
          </div>
        </section>
      ) : (
        <section className="home-featured is-all-done" data-testid="home-all-done">
          <div className="home-featured-copy">
            <p className="home-kicker">Today</p>
            <h2 className="home-featured-title">All seven done.</h2>
            <p className="home-featured-pitch">
              {now === null
                ? "New puzzles arrive at midnight UTC."
                : `New puzzles in ${formatCountdown(msUntilNextUtcDay(now))}.`}{" "}
              Until then, grab some friends for a round of Draft Anything.
            </p>
            <Link
              href="/draft-anything"
              className="home-cta"
              onClick={() =>
                track("home_game_clicked", {
                  game: "draft-anything",
                  slot: "featured",
                  position: 0,
                  played_today: false,
                })
              }
            >
              Create a Draft room →
            </Link>
          </div>
          <ul className="home-streaks">
            {DAILY_GAMES.map((id) => (
              <li key={id}>
                {getGame(id).name} 🔥 {streakFor.get(id) ?? 0}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="home-section-head">
        <h2 className="home-section-label">Today&apos;s lineup</h2>
        <span className="home-section-rule" aria-hidden />
        <span className="home-progress" data-testid="home-progress">
          {view.doneCount === 0 ? "7 new puzzles today" : `${view.doneCount} of 7 done today`}
        </span>
      </div>

      <div className="home-lineup" data-testid="home-lineup">
        {view.lineup.map((id, index) => (
          <GameCard
            key={id}
            gameId={id}
            played={played.has(id)}
            streak={streakFor.get(id) ?? 0}
            event="home_game_clicked"
            eventProps={{
              game: id,
              slot: "lineup",
              position: index + 1,
              played_today: played.has(id),
            }}
          />
        ))}
      </div>
    </>
  );
}
