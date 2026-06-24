"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { AdminSignIn } from "@/components/admin/admin-sign-in";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Puzzle {
  id: string;
  title: string | null;
  words: string[];
  phrases: string[];
  difficulty: string;
  theme: string | null;
  status: string;
  score: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleEntry {
  id: string;
  publish_date: string;
  puzzle_id: string;
}

interface DailyUsage {
  count: number;
  dates: string[];
  lastUsed: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  draft: "#787c7e",
  approved: "#6aaa64",
  scheduled: "#c9b458",
  published: "#6aaa64",
  rejected: "#ff6b6b",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Main Admin Page                                                    */
/* ------------------------------------------------------------------ */

export default function AdminChainsPage() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingPuzzle, setEditingPuzzle] = useState<Puzzle | null>(null);
  const [schedulePuzzle, setSchedulePuzzle] = useState<Puzzle | null>(null);
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dailyUsage, setDailyUsage] = useState<Map<string, DailyUsage>>(new Map());
  const [usedDates, setUsedDates] = useState<Set<string>>(new Set());

  const [editForm, setEditForm] = useState({
    words: "",
    phrases: "",
    difficulty: "easy",
    theme: "",
    notes: "",
  });

  const fetchPuzzles = useCallback(async () => {
    setLoading(true);
    setUnauthorized(false);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/chains?${params}`);
      if (res.status === 403) {
        setUnauthorized(true);
        setError("Sign in with an admin account to continue.");
        setPuzzles([]);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load puzzles",
        );
      }

      const data = await res.json();
      setPuzzles(data.puzzles ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load puzzles");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchDailyUsage = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_chain_puzzles")
        .select("puzzle_id, publish_date")
        .order("publish_date", { ascending: false })
        .limit(500);

      if (data) {
        const map = new Map<string, DailyUsage>();
        const dateSet = new Set<string>();
        for (const s of data) {
          const existing = map.get(s.puzzle_id) ?? {
            count: 0,
            dates: [],
            lastUsed: null,
          };
          existing.count++;
          existing.dates.push(s.publish_date);
          if (!existing.lastUsed || s.publish_date > existing.lastUsed) {
            existing.lastUsed = s.publish_date;
          }
          map.set(s.puzzle_id, existing);
          dateSet.add(s.publish_date);
        }
        setDailyUsage(map);
        setUsedDates(dateSet);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchPuzzles();
    fetchDailyUsage();
  }, [fetchPuzzles, fetchDailyUsage]);

  /* ---- Status update ---- */
  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/chains/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setSuccessMsg(`Puzzle ${status}`);
      fetchPuzzles();
    } catch (err) {
      setError("Failed to update status");
      console.error(err);
    }
  };

  /* ---- Edit puzzle ---- */
  const openEditor = (puzzle: Puzzle) => {
    setEditingPuzzle(puzzle);
    setEditForm({
      words: (puzzle.words as string[]).join(", "),
      phrases: (puzzle.phrases as string[]).join(", "),
      difficulty: puzzle.difficulty,
      theme: puzzle.theme ?? "",
      notes: puzzle.notes ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingPuzzle) return;
    setSaving(true);
    try {
      const words = editForm.words.split(",").map((w: string) => w.trim()).filter(Boolean);
      const phrases = editForm.phrases.split(",").map((p: string) => p.trim()).filter(Boolean);

      const res = await fetch(`/api/admin/chains/${editingPuzzle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          words,
          phrases,
          difficulty: editForm.difficulty,
          theme: editForm.theme || null,
          notes: editForm.notes || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setSuccessMsg("Puzzle updated");
      setEditingPuzzle(null);
      fetchPuzzles();
    } catch (err) {
      setError("Failed to save puzzle");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Generate chains ---- */
  const generateChains = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/admin/chains/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 25 }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Generation failed");
      }

      const data = await res.json();
      setGenResult(`Generated ${data.generated} chains, saved ${data.saved} as drafts.`);
      fetchPuzzles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  /* ---- Schedule puzzle ---- */
  const schedulePuzzleAction = async () => {
    if (!schedulePuzzle) return;
    setScheduleSaving(true);
    try {
      const res = await fetch("/api/admin/chains/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: schedulePuzzle.id,
          date: scheduleDate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Schedule failed");
      }

      setSuccessMsg(`Scheduled for ${scheduleDate}`);
      setSchedulePuzzle(null);
      fetchPuzzles();
      fetchDailyUsage();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Schedule failed";
      setError(msg);
    } finally {
      setScheduleSaving(false);
    }
  };

  /* ---- Delete puzzle ---- */
  const deletePuzzle = async (id: string) => {
    if (!confirm("Delete this puzzle?")) return;
    try {
      const res = await fetch(`/api/admin/chains/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSuccessMsg("Puzzle deleted");
      fetchPuzzles();
    } catch (err) {
      setError("Failed to delete");
      console.error(err);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#121213", color: "#ffffff", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <header style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: "0 0 4px" }}>
            Chain Puzzle Admin
          </h1>
          <p style={{ fontSize: "12px", color: "#787c7e", margin: 0 }}>
            Manage, approve, generate, and schedule word chain puzzles.
          </p>
        </header>

        {/* ---- Notifications ---- */}
        {successMsg && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(106,170,100,0.1)",
              border: "1px solid rgba(106,170,100,0.3)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#6aaa64",
              marginBottom: "16px",
            }}
          >
            {successMsg}
            <button
              onClick={() => setSuccessMsg(null)}
              style={{
                marginLeft: "12px",
                background: "none",
                border: "none",
                color: "#6aaa64",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              &times;
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(255,107,107,0.1)",
              border: "1px solid rgba(255,107,107,0.3)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#ff6b6b",
              marginBottom: "16px",
            }}
          >
            {error}
            <button
              onClick={() => setError(null)}
              style={{
                marginLeft: "12px",
                background: "none",
                border: "none",
                color: "#ff6b6b",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              &times;
            </button>
          </div>
        )}

        {unauthorized ? (
          <AdminSignIn />
        ) : (
          <>
        {/* ---- Action bar ---- */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#1a1a1b",
              color: "#ffffff",
              border: "1px solid #3a3a3c",
              borderRadius: "6px",
              fontSize: "12px",
            }}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={generateChains}
            disabled={generating}
            style={{
              padding: "8px 16px",
              background: "#c9b458",
              color: "#121213",
              border: "none",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: generating ? "not-allowed" : "pointer",
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? "Generating..." : "Generate 25 Draft Chains"}
          </button>

          {genResult && (
            <span style={{ fontSize: "12px", color: "#6aaa64" }}>{genResult}</span>
          )}
        </div>

        {/* ---- Puzzle table ---- */}
        <div style={{
          background: "#1a1a1b",
          border: "1px solid #3a3a3c",
          borderRadius: "8px",
          overflow: "hidden",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 80px 80px 80px 80px 120px 140px",
            gap: "8px",
            padding: "12px 16px",
            borderBottom: "1px solid #3a3a3c",
            fontSize: "10px",
            fontWeight: 600,
            color: "#787c7e",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}>
            <span>Chain</span>
            <span>Status</span>
            <span>Diff</span>
            <span>Score</span>
            <span>Daily</span>
            <span>Theme</span>
            <span>Actions</span>
          </div>

          {loading ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#787c7e", fontSize: "12px" }}>
              Loading puzzles...
            </div>
          ) : puzzles.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#787c7e", fontSize: "12px" }}>
              No puzzles found. Generate some draft chains to get started.
            </div>
          ) : (
            puzzles.map((puzzle) => {
              const words = puzzle.words as string[];
              const usage = dailyUsage.get(puzzle.id);

              return (
                <div
                  key={puzzle.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 80px 80px 80px 120px 140px",
                    gap: "8px",
                    padding: "12px 16px",
                    borderBottom: "1px solid #2a2a2c",
                    fontSize: "12px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>
                      {words.join(" → ")}
                    </span>
                    <div style={{ fontSize: "10px", color: "#565758", marginTop: "2px" }}>
                      Created {formatDate(puzzle.created_at)}
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 600,
                      background: `${STATUS_COLORS[puzzle.status] ?? "#787c7e"}20`,
                      color: STATUS_COLORS[puzzle.status] ?? "#787c7e",
                      textAlign: "center",
                    }}
                  >
                    {puzzle.status}
                  </span>

                  <span style={{ color: "#787c7e", fontSize: "11px" }}>
                    {puzzle.difficulty}
                  </span>

                  <span style={{ color: "#c9b458", fontWeight: 600 }}>
                    {puzzle.score}
                  </span>

                  <span style={{ color: "#787c7e", fontSize: "11px", textAlign: "center" }}>
                    {usage ? (
                      <span title={usage.dates.sort().reverse().slice(0, 10).join(", ")}>
                        {usage.count}x{usage.lastUsed && <span style={{ display: "block", fontSize: "9px", color: "#565758" }}>{usage.lastUsed}</span>}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>

                  <span style={{ color: "#787c7e", fontSize: "11px" }}>
                    {puzzle.theme ?? "—"}
                  </span>

                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {puzzle.status === "draft" && (
                      <button
                        onClick={() => updateStatus(puzzle.id, "approved")}
                        style={actionBtnStyle("#6aaa64")}
                      >
                        Approve
      </button>
                    )}
                    {puzzle.status !== "scheduled" && puzzle.status !== "published" && (
                      <>
                        <button
                          onClick={() => updateStatus(puzzle.id, "rejected")}
                          style={actionBtnStyle("#ff6b6b")}
                        >
                          Reject
                        </button>
                        <button onClick={() => openEditor(puzzle)} style={actionBtnStyle("#c9b458")}>
                          Edit
                        </button>
                      </>
                    )}
                    {puzzle.status === "approved" && (
                      <button
                        onClick={() => { setSchedulePuzzle(puzzle); setScheduleDate(new Date().toISOString().slice(0, 10)); }}
                        style={actionBtnStyle("#6aaa64")}
                      >
                        Schedule
                      </button>
                    )}
                    <button
                      onClick={() => deletePuzzle(puzzle.id)}
                      style={{ ...actionBtnStyle("#ff6b6b"), opacity: 0.6 }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ---- Usage count ---- */}
        <div style={{ marginTop: "16px", fontSize: "11px", color: "#565758" }}>
          {dailyUsage.size > 0
            ? `${dailyUsage.size} puzzle(s) have been used as daily puzzles`
            : "No puzzles have been used as daily puzzles yet"}
        </div>
          </>
        )}
      </div>

      {/* ---- Edit Modal ---- */}
      {editingPuzzle && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>
              Edit Puzzle
            </h2>

            <label style={labelStyle}>Words (comma-separated)</label>
            <input
              value={editForm.words}
              onChange={(e) => setEditForm({ ...editForm, words: e.target.value })}
              style={inputStyle}
            />

            <label style={labelStyle}>Phrases (comma-separated)</label>
            <input
              value={editForm.phrases}
              onChange={(e) => setEditForm({ ...editForm, phrases: e.target.value })}
              style={inputStyle}
            />

            <label style={labelStyle}>Difficulty</label>
            <select
              value={editForm.difficulty}
              onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
              style={inputStyle}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <label style={labelStyle}>Theme</label>
            <input
              value={editForm.theme}
              onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}
              style={inputStyle}
              placeholder="e.g. food, animals, everyday"
            />

            <label style={labelStyle}>Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
            />

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingPuzzle(null)}
                style={{
                  padding: "8px 16px",
                  background: "#3a3a3c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  background: "#6aaa64",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Schedule Modal ---- */}
      {schedulePuzzle && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>
              Schedule Daily Puzzle
            </h2>

            <p style={{ fontSize: "12px", color: "#787c7e", marginBottom: "16px" }}>
              Puzzle: <strong style={{ color: "#ffffff" }}>{(schedulePuzzle.words as string[]).join(" → ")}</strong>
            </p>

            <label style={labelStyle}>Publish Date</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              style={inputStyle}
              min={new Date().toISOString().slice(0, 10)}
            />

            {usedDates.has(scheduleDate) && (
              <p style={{ fontSize: "11px", color: "#ff6b6b", marginTop: "8px" }}>
                A puzzle is already scheduled for this date.
              </p>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSchedulePuzzle(null)}
                style={{
                  padding: "8px 16px",
                  background: "#3a3a3c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={schedulePuzzleAction}
                disabled={scheduleSaving || usedDates.has(scheduleDate)}
                style={{
                  padding: "8px 16px",
                  background: "#6aaa64",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: scheduleSaving ? "not-allowed" : "pointer",
                  opacity: scheduleSaving ? 0.6 : 1,
                }}
              >
                {scheduleSaving ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ---- Shared styles ---- */

const actionBtnStyle = (color: string): React.CSSProperties => ({
  padding: "4px 8px",
  fontSize: "10px",
  fontWeight: 600,
  background: `${color}18`,
  color,
  border: `1px solid ${color}40`,
  borderRadius: "4px",
  cursor: "pointer",
  whiteSpace: "nowrap",
});

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const modalStyle: React.CSSProperties = {
  background: "#1a1a1b",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "24px",
  width: "90%",
  maxWidth: "520px",
  maxHeight: "80vh",
  overflow: "auto",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#787c7e",
  marginBottom: "4px",
  marginTop: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "#121213",
  color: "#ffffff",
  border: "1px solid #3a3a3c",
  borderRadius: "6px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};
