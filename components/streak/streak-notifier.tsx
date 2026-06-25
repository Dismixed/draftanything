"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSound } from "@/lib/audio/sound-context";
import type { DailyGameId } from "@/lib/streak/types";
import { useStreak } from "@/lib/streak/context";

function formatStreak(days: number): string {
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function GameCardStreak({
  gameId,
  accentColor,
}: {
  gameId: DailyGameId;
  accentColor: string;
}) {
  const { streaks } = useStreak();
  const game = streaks.find((s) => s.id === gameId);
  const streak = game?.currentStreak ?? 0;
  const playedToday = game?.playedToday ?? false;
  const active = streak > 0;

  return (
    <div
      style={{
        position: "absolute",
        top: "12px",
        right: "12px",
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
        zIndex: 2,
        opacity: active ? 1 : 0.7,
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
      <span>
        {streak > 0 ? formatStreak(streak) : "No streak"}
      </span>
    </div>
  );
}

export function StreakNotifier() {
  const { notification, dismissNotification } = useStreak();
  const { play } = useSound();

  useEffect(() => {
    if (!notification) return;
    play("streak");
    const timer = setTimeout(dismissNotification, 4500);
    return () => clearTimeout(timer);
  }, [notification, dismissNotification, play]);

  if (!notification) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-slide-in-top"
      style={{
        position: "fixed",
        top: "72px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 300,
        background: "var(--panel)",
        border: "1px solid rgba(201,168,76,0.35)",
        borderRadius: "10px",
        padding: "12px 18px",
        boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        maxWidth: "min(92vw, 360px)",
      }}
    >
      <span
        className="anim-streak-pulse"
        style={{ fontSize: "18px", lineHeight: 1 }}
        aria-hidden
      >
        &#128293;
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text)",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {notification.label}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--gold)",
            fontFamily: "'Outfit', sans-serif",
            marginTop: "2px",
          }}
        >
          {formatStreak(notification.streak)} streak
        </div>
      </div>
      <button
        type="button"
        onClick={dismissNotification}
        aria-label="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-dim)",
          cursor: "pointer",
          fontSize: "16px",
          lineHeight: 1,
          padding: "2px 4px",
        }}
      >
        &times;
      </button>
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
            <span>{game.label}</span>
            <span style={{ color: game.currentStreak > 0 ? "var(--gold)" : "var(--text-dim)" }}>
              {game.currentStreak > 0 ? formatStreak(game.currentStreak) : "—"}
            </span>
          </Link>
        ))}
      </div>
    </details>
  );
}
