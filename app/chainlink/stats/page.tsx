"use client";

import { useEffect, useState } from "react";
import { SHOW_AUTH_UI } from "@/lib/auth/config";
import { GameTitle } from "@/components/ui/game-title";

interface Stats {
  totalAttempts: number;
  dailyCompleted: number;
  currentStreak: number;
  bestScore: number;
  avgDifficulty: string | null;
  dailyHistory: string[];
}

export default function ChainlinkStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chain/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--cl-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 64px",
        color: "var(--cl-text)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <GameTitle
          game="chainlink"
          as="h1"
          suffix=" Stats"
          style={{
            fontSize: "clamp(24px, 5vw, 32px)",
            fontWeight: 700,
            color: "var(--cl-text)",
            margin: "0 0 32px",
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        />

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--cl-gray-dim)", padding: "40px 0" }}>
            Loading stats...
          </div>
        ) : stats ? (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                marginBottom: "32px",
              }}
            >
              <StatCard label="Total Attempts" value={stats.totalAttempts} />
              <StatCard label="Daily Completed" value={stats.dailyCompleted} />
              <StatCard
                label="Current Streak"
                value={`${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`}
              />
              <StatCard label="Best Score" value={stats.bestScore} />
            </div>

            <section style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--cl-gray)",
                  margin: "0 0 12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Activity
              </h2>
              <Heatmap dates={stats.dailyHistory} />
            </section>

            {SHOW_AUTH_UI ? (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "12px",
                  color: "var(--cl-gray)",
                  padding: "16px",
                  borderTop: "1px solid var(--cl-border)",
                }}
              >
                <a
                  href="/auth"
                  style={{ color: "var(--cl-yellow)", textDecoration: "underline" }}
                >
                  Sign in
                </a>{" "}
                to track your stats across devices
              </div>
            ) : null}
          </>
        ) : (
          <div style={{ textAlign: "center", color: "var(--cl-gray-dim)", padding: "40px 0" }}>
            No stats available yet. Play a game to get started!
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: "var(--cl-card)",
        border: "1px solid var(--cl-border)",
        borderRadius: "8px",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "var(--cl-yellow)",
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "var(--cl-gray-dim)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
    </div>
  );
}

function Heatmap({ dates }: { dates: string[] }) {
  const dateSet = new Set(dates);
  const today = new Date();
  const cells: { date: string; filled: boolean; dayOfWeek: number }[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: dateStr, filled: dateSet.has(dateStr), dayOfWeek: d.getDay() });
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(14, 1fr)",
        gap: "3px",
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.date}
          title={cell.date}
          style={{
            width: "100%",
            aspectRatio: "1",
            backgroundColor: cell.filled ? "var(--cl-yellow)" : "var(--cl-border)",
            borderRadius: "2px",
            transition: "background-color 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}
