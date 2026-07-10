"use client";

import Link from "next/link";
import type { DailyGameId } from "@/lib/streak/types";
import { useStreak } from "@/lib/streak/context";
import { GameTitle } from "@/components/ui/game-title";

function formatStreak(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function GameCardStreak({
  gameId,
  accentColor,
  inline = false,
}: {
  gameId: DailyGameId;
  accentColor: string;
  inline?: boolean;
}) {
  const { streaks } = useStreak();
  const game = streaks.find((s) => s.id === gameId);
  const streak = game?.currentStreak ?? 0;
  const playedToday = game?.playedToday ?? false;
  const active = streak > 0;

  return (
    <div
      style={{
        ...(inline
          ? {}
          : { position: "absolute", top: "12px", right: "12px", zIndex: 2 }),
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: active ? accentColor : "var(--text-dim)",
        background: active
          ? `color-mix(in srgb, ${accentColor} 12%, transparent)`
          : "rgba(0,0,0,0.2)",
        border: active
          ? `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)`
          : "1px solid var(--border)",
        borderRadius: "999px",
        padding: "4px 10px",
        opacity: active ? 1 : 0.7,
        flexShrink: 0,
      }}
      title={
        streak > 0
          ? `${formatStreak(streak)} daily streak${playedToday ? " · played today" : ""}`
          : "No active daily streak"
      }
    >
      <span aria-hidden style={{ fontSize: "11px", lineHeight: 1 }}>
        &#128293;
      </span>
      <span>{streak > 0 ? formatStreak(streak) : "No streak"}</span>
    </div>
  );
}

export function WinStreakLine({
  gameId,
  accentColor = "var(--gold)",
}: {
  gameId: DailyGameId;
  accentColor?: string;
}) {
  const { streaks } = useStreak();
  const game = streaks.find((s) => s.id === gameId);
  const streak = game?.currentStreak ?? 0;

  if (streak <= 0) return null;

  return (
    <div
      className="anim-fade-slide-up"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        marginTop: "14px",
        padding: "8px 14px",
        borderRadius: "999px",
        background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accentColor} 35%, transparent)`,
        fontFamily: "'Outfit', sans-serif",
        fontSize: "12px",
        fontWeight: 600,
        color: accentColor,
        letterSpacing: "0.02em",
      }}
    >
      <span aria-hidden style={{ fontSize: "14px", lineHeight: 1 }}>
        &#128293;
      </span>
      <span>{formatStreak(streak)} daily streak</span>
    </div>
  );
}

export function StreakBadge() {
  const { streaks } = useStreak();
  const activeStreaks = streaks.filter((s) => s.currentStreak > 0);
  const totalStreak = activeStreaks.reduce((sum, s) => sum + s.currentStreak, 0);

  return (
    <details
      className="streak-badge"
      style={{
        position: "relative",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          borderRadius: "999px",
          border: "1px solid rgba(201,168,76,0.28)",
          background: totalStreak > 0 ? "rgba(201,168,76,0.08)" : "var(--panel)",
          color: totalStreak > 0 ? "var(--gold)" : "var(--text-dim)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          userSelect: "none",
        }}
      >
        <span aria-hidden>&#128293;</span>
        <span>{totalStreak > 0 ? totalStreak : "Streaks"}</span>
      </summary>
      <div
        style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          right: 0,
          minWidth: "200px",
          background: "var(--panel)",
          border: "1px solid var(--border-hi)",
          borderRadius: "8px",
          padding: "8px 0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          zIndex: 200,
        }}
      >
        <div
          style={{
            padding: "6px 12px 8px",
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          Daily streaks
        </div>
        {streaks.map((game) => (
          <Link
            key={game.id}
            href={game.href}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "8px 12px",
              textDecoration: "none",
              color: "var(--text-dim)",
              fontSize: "12px",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(124,58,255,0.08)";
              e.currentTarget.style.color = "var(--text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-dim)";
            }}
          >
            <GameTitle game={game.id} />
            <span style={{ color: game.currentStreak > 0 ? "var(--gold)" : "var(--text-dim)" }}>
              {game.currentStreak > 0 ? formatStreak(game.currentStreak) : "—"}
            </span>
          </Link>
        ))}
      </div>
    </details>
  );
}
