"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTodayLeaderboard } from "@/lib/brain-dead/storage";
import type { LeaderboardEntry } from "@/lib/brain-dead/types";

const ACCENT = "#ff3c3c";

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

  return (
    <div style={{ width: "100%", maxWidth: "580px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2
          className="bd-leaderboard-title"
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: "2.5rem",
            margin: "0 0 8px",
            color: "var(--text)",
          }}
        >
          Daily{" "}
          <em style={{ fontStyle: "italic", color: ACCENT }}>Board</em>
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: "0.88rem", margin: 0 }}>
          {dateLabel}
        </p>
      </div>

      <div
        style={{
          border: "1px solid var(--border-hi)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <table className="bd-leaderboard-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border-hi)",
                background: "var(--panel)",
              }}
            >
              {["#", "Player", "Score", "Correct"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontSize: "0.72rem",
                    color: "var(--text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    color: "var(--text-dim)",
                    padding: "40px 16px",
                    fontSize: "0.9rem",
                  }}
                >
                  Loading scores...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    color: "var(--text-dim)",
                    padding: "40px 16px",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                  }}
                >
                  No scores yet today.
                  <br />
                  Play the Daily Challenge to get on the board.
                </td>
              </tr>
            ) : (
              entries.slice(0, 20).map((e, i) => {
                const rankColor =
                  i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "#cd7f32" : "var(--text-dim)";
                return (
                  <tr
                    key={e.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: e.you ? "rgba(255,60,60,0.05)" : undefined,
                      borderLeft: e.you ? `2px solid ${ACCENT}` : undefined,
                    }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ color: rankColor, fontWeight: i < 3 ? 700 : 500 }}>
                        {i + 1}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ fontWeight: 600, color: "var(--text)" }}>
                        {e.name}
                      </span>
                      {e.you && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: ACCENT,
                            marginLeft: "6px",
                            fontWeight: 600,
                          }}
                        >
                          you
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontWeight: 700,
                        color: ACCENT,
                      }}
                    >
                      {e.score}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--text-dim)" }}>
                      {e.correct}{" "}
                      <span style={{ fontSize: "0.75rem" }}>q&apos;s</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: "center", marginTop: "48px", fontSize: "10px", color: "var(--text-dim)", opacity: 0.4 }}>
        &larr;{" "}
        <Link href="/brain-dead" style={{ color: "inherit", textDecoration: "none" }}>
          Back to Brain Dead
        </Link>
      </p>
    </div>
  );
}
