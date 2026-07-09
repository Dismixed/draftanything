"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getDisplayDate } from "@/lib/frames/game-logic";
import { fetchTodayLeaderboard, getSubmittedEntryId } from "@/lib/frames/storage";
import type { LeaderboardEntry } from "@/lib/frames/types";
import { GameBackLink } from "@/components/ui/game-back-link";

export default function FramesLeaderboard() {
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
    <div className="frames-app">
      <nav className="frames-nav">
        <Link href="/frames" className="frames-logo">
          <span className="frames-logo-f">F</span>rames
        </Link>
        <div className="frames-nav-right">
          <span className="frames-date-chip">{getDisplayDate()}</span>
          <Link href="/frames/daily" className="frames-nav-btn">
            Play
          </Link>
        </div>
      </nav>

      <div className="frames-screen frames-lb-screen active">
        <header style={{ width: "100%", maxWidth: 480, marginBottom: "0.5rem" }}>
          <GameBackLink href="/frames" color="var(--fr-muted)" />
        </header>
        <div className="frames-lb-header">
          <div className="frames-lb-title">
            <span className="hl">Fra</span>mes — Daily Board
          </div>
          <div className="frames-lb-date">{getDisplayDate()}</div>
        </div>

        <div className="frames-lb-wrap">
          <table className="frames-lb-table">
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
                  <td colSpan={3} className="frames-lb-empty">
                    Loading…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="frames-lb-empty">
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
                      className={`${i === 0 ? "frames-rank-1" : i === 1 ? "frames-rank-2" : i === 2 ? "frames-rank-3" : ""}${isYou ? " frames-lb-you" : ""}`}
                    >
                      <td className="frames-lb-rank">
                        {["🥇", "🥈", "🥉"][i] ?? i + 1}
                      </td>
                      <td className="frames-lb-name">
                        {entry.name}
                        {isYou ? (
                          <span className="frames-you-tag">you</span>
                        ) : null}
                      </td>
                      <td className="frames-lb-score">{entry.score}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/frames" className="frames-btn frames-btn-ghost frames-btn-sm">
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}
