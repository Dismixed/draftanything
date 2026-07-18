"use client";

import Link from "next/link";
import { useStreak } from "@/lib/streak/context";
import { GameTitle } from "@/components/ui/game-title";
import { GameCardPreview } from "@/components/daily/game-card-preview";
import {
  DAILY_GAMES,
  GAME_META,
  type DailyGameId,
  type GameStreakInfo,
} from "@/lib/streak/types";

function getOtherDailies(
  currentGameId: DailyGameId,
  streaks: GameStreakInfo[],
): GameStreakInfo[] {
  if (streaks.length > 0) {
    return streaks.filter(
      (game) => game.id !== currentGameId && !game.playedToday,
    );
  }

  return DAILY_GAMES.filter((id) => id !== currentGameId).map((id) => ({
    id,
    label: GAME_META[id].label,
    href: GAME_META[id].href,
    currentStreak: 0,
    playedToday: false,
  }));
}

export function OtherDailies({
  currentGameId,
}: {
  currentGameId: DailyGameId;
}) {
  const { streaks } = useStreak();
  const others = getOtherDailies(currentGameId, streaks);

  if (others.length === 0) return null;

  return (
    <div className="od-section">
      <div className="od-label">More dailies</div>
      <div className="od-grid">
        {others.map((game) => {
          const meta = GAME_META[game.id];
          const theme = meta.theme;

          return (
            <Link
              key={game.id}
              href={game.href}
              className="od-card"
              style={{
                borderColor: theme.border,
                background: theme.background,
                color: theme.text,
              }}
            >
              <div className="od-card-visual">
                <GameCardPreview gameId={game.id} />
              </div>
              <div className="od-card-copy">
                <GameTitle
                  game={game.id}
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: theme.text,
                    margin: 0,
                    lineHeight: 1.15,
                  }}
                />
                <p className="od-card-blurb" style={{ color: theme.text }}>
                  {meta.blurb}
                </p>
              </div>
              <span className="od-card-cta" style={{ color: theme.accent }}>
                Play →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
