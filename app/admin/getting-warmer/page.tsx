"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

interface Puzzle {
  id: string;
  answer: string;
  clues: string[];
  status: string;
  created_at: string;
}

interface ScheduleRow {
  puzzle_id: string;
  publish_date: string;
}

type Tab = "puzzles" | "schedule";

const STATUS_COLORS: Record<string, string> = {
  draft: "#787c7e",
  approved: "#6aaa64",
  archived: "#565758",
};

export default function AdminGettingWarmerPage() {
  const [tab, setTab] = useState<Tab>("puzzles");
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newAnswer, setNewAnswer] = useState("");
  const [newClues, setNewClues] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [schedulePuzzle, setSchedulePuzzle] = useState<Puzzle | null>(null);
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const fetchPuzzles = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/getting-warmer/puzzles?${params}`);
      if (res.status === 403) {
        setError("Session expired — refresh or sign in again.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load puzzles");
      const data = await res.json();
      setPuzzles(data.puzzles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load puzzles");
    }
  }, [statusFilter]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/getting-warmer/schedule");
      if (res.status === 403) {
        setError("Session expired — refresh or sign in again.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load schedule");
      const data = await res.json();
      setSchedule(data.schedule ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPuzzles(), fetchSchedule()]).finally(() =>
      setLoading(false),
    );
  }, [fetchPuzzles, fetchSchedule]);

  const usedDates = new Set(schedule.map((s) => s.publish_date));

  async function createPuzzle() {
    const clues = newClues
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    if (!newAnswer.trim() || clues.length < 2) {
      setMessage("Answer and at least 2 clues required.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/getting-warmer/puzzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: newAnswer.trim(),
          clues,
          status: "approved",
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      setNewAnswer("");
      setNewClues("");
      setMessage("Puzzle created.");
      await fetchPuzzles();
    } catch {
      setMessage("Failed to create puzzle.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(puzzle: Puzzle, status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/getting-warmer/puzzles/${puzzle.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchPuzzles();
    } catch {
      setMessage("Failed to update status.");
    } finally {
      setBusy(false);
    }
  }

  async function assignSchedule() {
    if (!schedulePuzzle) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/getting-warmer/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: schedulePuzzle.id,
          date: scheduleDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Schedule failed");
      setMessage(`Scheduled ${schedulePuzzle.answer} for ${scheduleDate}.`);
      setSchedulePuzzle(null);
      await fetchSchedule();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Schedule failed.");
    } finally {
      setBusy(false);
    }
  }

  async function bulkSchedule() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/getting-warmer/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Bulk schedule failed");
      const data = await res.json();
      setMessage(`Scheduled ${data.scheduled} puzzle(s).`);
      await fetchSchedule();
    } catch {
      setMessage("Bulk schedule failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Getting Warmer Admin">
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["puzzles", "schedule"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #333",
              background: tab === t ? "#ff6b1a" : "transparent",
              color: tab === t ? "#000" : "#ccc",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <p style={{ color: "#ff6b6b", marginBottom: 12 }}>{error}</p>
      )}
      {message && (
        <p style={{ color: "#6aaa64", marginBottom: 12 }}>{message}</p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : tab === "puzzles" ? (
        <div>
          <div
            style={{
              background: "#1a1a1b",
              border: "1px solid #333",
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 14 }}>New Puzzle</h3>
            <input
              type="text"
              placeholder="Answer (e.g. WATERMELON)"
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                marginBottom: 8,
                background: "#111",
                border: "1px solid #333",
                color: "#fff",
                borderRadius: 4,
              }}
            />
            <textarea
              placeholder="Clues (one per line, min 2)"
              value={newClues}
              onChange={(e) => setNewClues(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                padding: 8,
                marginBottom: 8,
                background: "#111",
                border: "1px solid #333",
                color: "#fff",
                borderRadius: 4,
                fontFamily: "monospace",
              }}
            />
            <button
              type="button"
              onClick={createPuzzle}
              disabled={busy}
              style={{
                padding: "8px 16px",
                background: "#ff6b1a",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Create & Approve
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: 6,
                background: "#111",
                border: "1px solid #333",
                color: "#fff",
                borderRadius: 4,
              }}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {puzzles.map((puzzle) => (
            <div
              key={puzzle.id}
              style={{
                border: "1px solid #333",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                background: "#1a1a1b",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <strong style={{ fontSize: 16 }}>{puzzle.answer}</strong>
                <span
                  style={{
                    fontSize: 11,
                    color: STATUS_COLORS[puzzle.status] ?? "#ccc",
                    textTransform: "uppercase",
                  }}
                >
                  {puzzle.status}
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#999",
                  fontFamily: "monospace",
                  marginBottom: 8,
                }}
              >
                {puzzle.clues.map((c, i) => (
                  <div key={i}>
                    {i + 1}. {c}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {puzzle.status !== "approved" && (
                  <button
                    type="button"
                    onClick={() => setStatus(puzzle, "approved")}
                    disabled={busy}
                    style={{ fontSize: 12, cursor: "pointer" }}
                  >
                    Approve
                  </button>
                )}
                {puzzle.status !== "archived" && (
                  <button
                    type="button"
                    onClick={() => setStatus(puzzle, "archived")}
                    disabled={busy}
                    style={{ fontSize: 12, cursor: "pointer" }}
                  >
                    Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSchedulePuzzle(puzzle);
                    setTab("schedule");
                  }}
                  style={{ fontSize: 12, cursor: "pointer" }}
                >
                  Schedule →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={bulkSchedule}
            disabled={busy}
            style={{
              padding: "8px 16px",
              background: "#ff6b1a",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Auto-schedule all approved
          </button>

          {schedulePuzzle && (
            <div
              style={{
                background: "#1a1a1b",
                border: "1px solid #ff6b1a",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <p style={{ margin: "0 0 8px" }}>
                Schedule <strong>{schedulePuzzle.answer}</strong>
              </p>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{
                  padding: 6,
                  background: "#111",
                  border: "1px solid #333",
                  color: "#fff",
                  borderRadius: 4,
                  marginRight: 8,
                }}
              />
              <button
                type="button"
                onClick={assignSchedule}
                disabled={busy || usedDates.has(scheduleDate)}
                style={{ cursor: "pointer" }}
              >
                Assign
              </button>
              {usedDates.has(scheduleDate) && (
                <span style={{ marginLeft: 8, color: "#ff6b6b", fontSize: 12 }}>
                  Date taken
                </span>
              )}
            </div>
          )}

          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Upcoming schedule</h3>
          {schedule.length === 0 ? (
            <p style={{ color: "#999" }}>No puzzles scheduled yet.</p>
          ) : (
            schedule.map((row) => {
              const puzzle = puzzles.find((p) => p.id === row.puzzle_id);
              return (
                <div
                  key={row.publish_date}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #222",
                    fontSize: 13,
                  }}
                >
                  <span>{row.publish_date}</span>
                  <span style={{ color: "#ff6b1a" }}>
                    {puzzle?.answer ?? row.puzzle_id.slice(0, 8)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </AdminShell>
  );
}
