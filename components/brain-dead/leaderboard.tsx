"use client";

import { useCallback, useEffect, useState } from "react";
import { GameBackLink } from "@/components/ui/game-back-link";
import { fetchTodayLeaderboard } from "@/lib/brain-dead/storage";
import type { AllTimeEntry, LeaderboardEntry } from "@/lib/brain-dead/types";

type Tab = "daily" | "all-time";

export default function Leaderboard() {
  const [tab, setTab] = useState<Tab>("daily");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [allTimeEntries, setAllTimeEntries] = useState<AllTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (t: Tab) => {
    if (t === "daily") {
      const rows = await fetchTodayLeaderboard();
      setEntries(rows);
    } else {
      try {
        const res = await fetch("/api/brain-dead/leaderboard/all-time");
        if (res.ok) {
          const data = (await res.json()) as { entries: AllTimeEntry[] };
          setAllTimeEntries(data.entries ?? []);
        }
      } catch {
        return;
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(tab);
  }, [tab, loadData]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ width: "100%", margin: "0 auto", position: "relative" }}>
      <header style={{ position: "relative", marginBottom: "24px" }}>
        <GameBackLink color="var(--bd-text-muted)" />
      </header>
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

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "20px",
          borderBottom: "1px solid var(--bd-border)",
        }}
      >
        <button
          onClick={() => setTab("daily")}
          style={{
            flex: 1,
            padding: "10px 16px",
            border: "none",
            borderBottom: tab === "daily" ? "2px solid var(--bd-primary)" : "2px solid transparent",
            background: "none",
            color: tab === "daily" ? "var(--bd-primary)" : "var(--bd-text-muted)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "1px",
            textTransform: "uppercase",
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          Daily
        </button>
        <button
          onClick={() => setTab("all-time")}
          style={{
            flex: 1,
            padding: "10px 16px",
            border: "none",
            borderBottom: tab === "all-time" ? "2px solid var(--bd-primary)" : "2px solid transparent",
            background: "none",
            color: tab === "all-time" ? "var(--bd-primary)" : "var(--bd-text-muted)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "1px",
            textTransform: "uppercase",
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          All-Time
        </button>
      </div>

      {tab === "daily" ? (
        <DailyView entries={entries} loading={loading} />
      ) : (
        <AllTimeView entries={allTimeEntries} loading={loading} />
      )}

    </div>
  );
}

function DailyView({ entries, loading }: { entries: LeaderboardEntry[]; loading: boolean }) {
  const top3 = entries.slice(0, 3);
  const youEntry = entries.find((e) => e.you);

  return (
    <>
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
          <LoadingState />
        ) : entries.length === 0 ? (
          <EmptyState />
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
    </>
  );
}

function AllTimeView({ entries, loading }: { entries: AllTimeEntry[]; loading: boolean }) {
  return (
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
        <div style={{ textAlign: "right" }}>Best</div>
        <div style={{ textAlign: "right" }}>Games</div>
      </div>

      {loading ? (
        <LoadingState />
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
          No all-time scores yet.
          <br />
          Play the Daily Challenge and create an account to appear here.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1px", background: "var(--bd-border)" }}>
          {entries.slice(0, 100).map((e, i) => {
            const isTop3 = i < 3;
            const rankColor =
              i === 0 ? "var(--bd-primary)" : i === 1 ? "var(--bd-text-secondary)" : i === 2 ? "#b45309" : "var(--bd-text-muted)";
            return (
              <div
                key={e.playerId}
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
                <div style={{ fontSize: "12px", color: "var(--bd-text)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px" }}>
                  {e.avatarUrl ? (
                    <img
                      src={e.avatarUrl}
                      alt=""
                      width="16"
                      height="16"
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "var(--bd-border)",
                      }}
                    />
                  )}
                  {e.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: isTop3 ? rankColor : "var(--bd-text)",
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                >
                  {e.bestScore}
                </div>
                <div style={{ fontSize: "11px", color: "var(--bd-text-muted)", textAlign: "right" }}>
                  {e.gamesPlayed}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
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
  );
}

function EmptyState() {
  return (
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
  );
}
