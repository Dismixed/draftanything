"use client";

import { useEffect, useState } from "react";

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
        background: "#121213",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 64px",
        color: "#ffffff",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <h1
          style={{
            fontSize: "clamp(24px, 5vw, 32px)",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 32px",
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        >
          Chainlink Stats
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", color: "#787c7e", padding: "40px 0" }}>
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
                  color: "#565758",
                  margin: "0 0 12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Activity
              </h2>
              <Heatmap dates={stats.dailyHistory} />
            </section>

            <div
              style={{
                textAlign: "center",
                fontSize: "12px",
                color: "#565758",
                padding: "16px",
                borderTop: "1px solid #3a3a3c",
              }}
            >
              <a
                href="/login"
                style={{ color: "#c9b458", textDecoration: "underline" }}
              >
                Sign in
              </a>{" "}
              to track your stats across devices
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "#787c7e", padding: "40px 0" }}>
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
        background: "#1a1a1b",
        border: "1px solid #3a3a3c",
        borderRadius: "8px",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#c9b458",
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "#787c7e", textTransform: "uppercase", letterSpacing: "0.04em" }}>
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
            backgroundColor: cell.filled ? "#c9b458" : "#3a3a3c",
            borderRadius: "2px",
            transition: "background-color 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}
