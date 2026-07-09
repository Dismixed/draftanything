"use client";

import Link from "next/link";
import { useStreak } from "@/lib/streak/context";
import type { DailyGameId } from "@/lib/streak/types";

export function OtherDailies({
  currentGameId,
  accentColor = "var(--gold)",
}: {
  currentGameId: DailyGameId;
  accentColor?: string;
}) {
  const { streaks } = useStreak();
  const others = streaks.filter((game) => game.id !== currentGameId);

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
        {others.map((game) => (
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
              border: "1px solid var(--border, rgba(255,255,255,0.12))",
              background: "var(--panel, rgba(255,255,255,0.04))",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color 0.15s ease, background 0.15s ease",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text, #f5f5f5)",
              }}
            >
              {game.label}
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: game.playedToday ? "var(--text-dim, #787c7e)" : accentColor,
                whiteSpace: "nowrap",
              }}
            >
              {game.playedToday ? "Done" : "Play →"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
