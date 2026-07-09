"use client";

import Link from "next/link";
import { useStreak } from "@/lib/streak/context";
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
    return streaks.filter((game) => game.id !== currentGameId);
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
    <div
      style={{
        marginTop: "24px",
        width: "100%",
        maxWidth: "380px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-dim, #787c7e)",
          marginBottom: "10px",
        }}
      >
        More dailies
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {others.map((game) => {
          const theme = GAME_META[game.id].theme;

          return (
            <Link
              key={game.id}
              href={game.href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: `1px solid ${theme.border}`,
                background: theme.background,
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: theme.text,
                }}
              >
                {game.label}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: game.playedToday ? "var(--text-dim, #787c7e)" : theme.accent,
                  whiteSpace: "nowrap",
                }}
              >
                {game.playedToday ? "Done" : "Play →"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
