"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTodayLeaderboard } from "@/lib/brain-dead/storage";
import type { LeaderboardEntry } from "@/lib/brain-dead/types";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchTodayLeaderboard().then((rows) => {
      if (!cancelled) {
        setEntries(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const top3 = entries.slice(0, 3);
  const youEntry = entries.find((e) => e.you);

  return (
    <div style={{ width: "100%", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <p
          style={{
            fontSize: "11px",
            color: "var(--bd-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "2px",
            marginBottom: "4px",
          }}
        >
          Daily
        </p>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 700,
            margin: "0 0 4px",
            color: "var(--bd-text)",
          }}
        >
          Leaderboard
        </h2>
        <p style={{ color: "var(--bd-text-muted)", fontSize: "10px", margin: 0 }}>
          {dateLabel}
        </p>
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: "8px",
            marginBottom: "24px",
            height: "100px",
          }}
        >
          {top3[1] && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "10px", color: "var(--bd-text-secondary)", marginBottom: "4px", fontWeight: 600 }}>
                {top3[1].name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--bd-text-secondary)", fontWeight: 700, marginBottom: "4px" }}>
                {top3[1].score}
              </div>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  background: "var(--bd-surface)",
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--bd-border)",
                  borderBottom: "none",
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--bd-text-secondary)" }}>2</span>
              </div>
            </div>
          )}
          {top3[0] && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "10px", color: "var(--bd-primary)", marginBottom: "4px", fontWeight: 600 }}>
                {top3[0].name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--bd-primary)", fontWeight: 700, marginBottom: "4px" }}>
                {top3[0].score}
              </div>
              <div
                style={{
                  width: "60px",
                  height: "80px",
                  background: "var(--bd-surface)",
                  border: "2px solid var(--bd-primary)",
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderBottom: "none",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--bd-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="7"/>
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
                </svg>
              </div>
            </div>
          )}
          {top3[2] && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "10px", color: "#b45309", marginBottom: "4px", fontWeight: 600 }}>
                {top3[2].name}
              </div>
              <div style={{ fontSize: "12px", color: "#b45309", fontWeight: 700, marginBottom: "4px" }}>
                {top3[2].score}
              </div>
              <div
                style={{
                  width: "60px",
                  height: "45px",
                  background: "rgba(180, 83, 9, 0.1)",
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(180, 83, 9, 0.3)",
                  borderBottom: "none",
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#b45309" }}>3</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div
        style={{
          border: "1px solid var(--bd-border)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "30px 1fr 60px 60px",
            gap: "8px",
            padding: "8px 12px",
            borderBottom: "1px solid var(--bd-border)",
            fontSize: "10px",
            color: "var(--bd-text-muted)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            background: "var(--bd-surface)",
          }}
        >
          <div>#</div>
          <div>Name</div>
          <div style={{ textAlign: "right" }}>Score</div>
          <div style={{ textAlign: "right" }}>Time</div>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--bd-text-muted)",
              padding: "40px 16px",
              fontSize: "12px",
            }}
          >
            Loading scores...
          </div>
        ) : entries.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--bd-text-muted)",
              padding: "40px 16px",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            No scores yet today.
            <br />
            Play the Daily Challenge to get on the board.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1px", background: "var(--bd-border)" }}>
            {entries.slice(0, 20).map((e, i) => {
              const isTop3 = i < 3;
              const rankColor =
                i === 0 ? "var(--bd-primary)" : i === 1 ? "var(--bd-text-secondary)" : i === 2 ? "#b45309" : "var(--bd-text-muted)";
              return (
                <div
                  key={e.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "30px 1fr 60px 60px",
                    gap: "8px",
                    padding: "10px 12px",
                    background: isTop3 ? "var(--bd-surface)" : "var(--bd-bg)",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: isTop3 ? 600 : 400, color: rankColor }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--bd-text)", fontWeight: 500 }}>
                    {e.name}
                    {e.you && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--bd-primary)",
                          marginLeft: "6px",
                          fontWeight: 600,
                        }}
                      >
                        you
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: isTop3 ? rankColor : "var(--bd-text)",
                      textAlign: "right",
                      fontWeight: 600,
                    }}
                  >
                    {e.score}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--bd-text-muted)", textAlign: "right" }}>
                    {e.correct} q&apos;s
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* You row */}
      {youEntry && entries.findIndex((e) => e.you) >= 5 && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            background: "var(--bd-surface)",
            border: "1px solid var(--bd-primary)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "30px 1fr 60px 60px",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--bd-primary)" }}>
              {entries.findIndex((e) => e.you) + 1}
            </div>
            <div style={{ fontSize: "12px", color: "var(--bd-text)", fontWeight: 500 }}>
              You
            </div>
            <div style={{ fontSize: "12px", color: "var(--bd-primary)", textAlign: "right", fontWeight: 600 }}>
              {youEntry.score}
            </div>
            <div style={{ fontSize: "11px", color: "var(--bd-text-muted)", textAlign: "right" }}>
              {youEntry.correct} q&apos;s
            </div>
          </div>
        </div>
      )}

      <p style={{ textAlign: "center", marginTop: "48px", fontSize: "10px", color: "var(--bd-text-muted)", opacity: 0.6 }}>
        &larr;{" "}
        <Link href="/brain-dead" style={{ color: "inherit", textDecoration: "none" }}>
          Back to Brain Dead
        </Link>
      </p>
    </div>
  );
}
