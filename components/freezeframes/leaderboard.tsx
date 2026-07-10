"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getDisplayDate } from "@/lib/freezeframes/game-logic";
import { fetchTodayLeaderboard, getSubmittedEntryId } from "@/lib/freezeframes/storage";
import type { LeaderboardEntry } from "@/lib/freezeframes/types";
import { GameBackLink } from "@/components/ui/game-back-link";

export default function FreezeFramesLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [youId, setYouId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const rows = await fetchTodayLeaderboard();
    setEntries(rows);
    setYouId(getSubmittedEntryId());
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="freezeframes-app">
      <nav className="freezeframes-nav">
        <Link href="/freezeframes" className="freezeframes-logo">
          Freeze<span className="hl">Frames</span>
        </Link>
        <div className="freezeframes-nav-right">
          <span className="freezeframes-date-chip">{getDisplayDate()}</span>
          <Link href="/freezeframes/daily" className="freezeframes-nav-btn">
            Play
          </Link>
        </div>
      </nav>

      <div className="freezeframes-screen freezeframes-lb-screen active">
        <header style={{ width: "100%", maxWidth: 480, marginBottom: "0.5rem" }}>
          <GameBackLink href="/freezeframes" color="var(--ff-muted)" />
        </header>
        <div className="freezeframes-lb-header">
          <div className="freezeframes-lb-title">
            Freeze<span className="hl">Frames</span> — Daily Board
          </div>
          <div className="freezeframes-lb-date">{getDisplayDate()}</div>
        </div>

        <div className="freezeframes-lb-wrap">
          <table className="freezeframes-lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="freezeframes-lb-empty">
                    Loading…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="freezeframes-lb-empty">
                    No scores yet today.
                    <br />
                    Be the first!
                  </td>
                </tr>
              ) : (
                entries.slice(0, 25).map((entry, i) => {
                  const isYou = youId === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className={`${i === 0 ? "freezeframes-rank-1" : i === 1 ? "freezeframes-rank-2" : i === 2 ? "freezeframes-rank-3" : ""}${isYou ? " freezeframes-lb-you" : ""}`}
                    >
                      <td className="freezeframes-lb-rank">
                        {["🥇", "🥈", "🥉"][i] ?? i + 1}
                      </td>
                      <td className="freezeframes-lb-name">
                        {entry.name}
                        {isYou ? (
                          <span className="freezeframes-you-tag">you</span>
                        ) : null}
                      </td>
                      <td className="freezeframes-lb-score">{entry.score}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/freezeframes" className="freezeframes-btn freezeframes-btn-ghost freezeframes-btn-sm">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}
