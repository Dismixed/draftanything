"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/browser";
import { AdminShell } from "@/components/admin/admin-shell";
import { ROUNDS } from "@/lib/freezeframes/rounds";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SeedEntry {
  id: string;
  round_key: string;
  query_title: string;
  answer: string | null;
  hint: string | null;
  artist: string | null;
  album_name: string | null;
  img: string | null;
  audio: string | null;
  status: string;
  resolve_notes: string | null;
  notes: string | null;
  external_source: string | null;
}

interface Puzzle {
  id: string;
  movie: Record<string, string>;
  song: Record<string, string>;
  show: Record<string, string>;
  album: Record<string, string>;
  status: string;
  created_at: string;
}

interface ScheduleRow {
  puzzle_id: string;
  publish_date: string;
}

type Tab = "seed" | "puzzles" | "ops";

const STATUS_COLORS: Record<string, string> = {
  draft: "#787c7e",
  needs_media: "#c9b458",
  needs_review: "#5bc0de",
  approved: "#6aaa64",
  rejected: "#ff6b6b",
  used: "#a855f7",
  archived: "#565758",
};

const ROUND_ICONS: Record<string, string> = {
  movie: "🎬",
  song: "🎵",
  show: "📺",
  album: "💿",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminFreezeFramesPage() {
  const [tab, setTab] = useState<Tab>("seed");
  const [entries, setEntries] = useState<SeedEntry[]>([]);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [roundFilter, setRoundFilter] = useState("");
  const [puzzleStatusFilter, setPuzzleStatusFilter] = useState("");

  const [selected, setSelected] = useState<SeedEntry | null>(null);
  const [schedulePuzzle, setSchedulePuzzle] = useState<Puzzle | null>(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [usedDates, setUsedDates] = useState<Set<string>>(new Set());
  const [scheduleByPuzzle, setScheduleByPuzzle] = useState<Map<string, string[]>>(new Map());

  const [newRound, setNewRound] = useState("movie");
  const [newTitle, setNewTitle] = useState("");

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (roundFilter) params.set("round_key", roundFilter);
      const res = await fetch(`/api/admin/freezeframes/seed?${params}`);
      if (res.status === 403) {
        setError("Session expired — refresh or sign in again.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load seed entries");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seed");
    }
  }, [statusFilter, roundFilter]);

  const fetchPuzzles = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (puzzleStatusFilter) params.set("status", puzzleStatusFilter);
      const res = await fetch(`/api/admin/freezeframes/puzzles?${params}`);
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
  }, [puzzleStatusFilter]);

  const fetchSchedule = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("daily_freezeframes_puzzles")
        .select("puzzle_id, publish_date")
        .order("publish_date", { ascending: false })
        .limit(500);

      if (data) {
        const dates = new Set<string>();
        const byPuzzle = new Map<string, string[]>();
        for (const row of data as ScheduleRow[]) {
          dates.add(row.publish_date);
          const list = byPuzzle.get(row.puzzle_id) ?? [];
          list.push(row.publish_date);
          byPuzzle.set(row.puzzle_id, list);
        }
        setUsedDates(dates);
        setScheduleByPuzzle(byPuzzle);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEntries(), fetchPuzzles(), fetchSchedule()]).finally(() =>
      setLoading(false),
    );
  }, [fetchEntries, fetchPuzzles, fetchSchedule]);

  async function runImport() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/freezeframes/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setMessage(
        data.skipped
          ? `Imported ${data.imported} seed rows (${data.skipped} already existed)`
          : `Imported ${data.imported} seed rows from seed.ts`,
      );
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolveAllDraft() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/freezeframes/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_all_draft" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resolve failed");
      setMessage(
        data.skipped
          ? `Resolved ${data.resolved} of ${data.total} draft entries (${data.skipped} skipped)`
          : `Resolved ${data.resolved} of ${data.total} draft entries`,
      );
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolveEntry(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/freezeframes/seed/${id}/resolve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resolve failed");
      setSelected(data.entry);
      await fetchEntries();
      setMessage(
        `Resolved: ${data.entry.answer ?? data.entry.query_title}` +
          (data.entry.skippedResolve ? " (already resolved — skipped)" : ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchEntry(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/freezeframes/seed/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setSelected(data.entry);
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addSeedEntry() {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/freezeframes/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round_key: newRound, query_title: newTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      setNewTitle("");
      setMessage(`Added ${newRound} seed: ${data.entry.query_title}`);
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateBundles() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/freezeframes/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generate failed");
      setMessage(
        `Created ${data.bundlesCreated} puzzle bundle(s)` +
          (data.gaps?.length ? ` — gaps: ${data.gaps.map((g: { round_key: string }) => g.round_key).join(", ")}` : "") +
          (data.daily?.puzzleId
            ? data.daily.alreadyScheduled
              ? " — today already scheduled"
              : " — scheduled today's daily"
            : ""),
      );
      await Promise.all([fetchEntries(), fetchPuzzles()]);
      setTab("puzzles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function updatePuzzleStatus(id: string, status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/freezeframes/puzzles/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Status update failed");
      setMessage(`Puzzle ${status}`);
      await fetchPuzzles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function schedulePuzzleAction() {
    if (!schedulePuzzle) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/freezeframes/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzleId: schedulePuzzle.id, date: scheduleDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Schedule failed");
      setMessage(`Scheduled for ${scheduleDate}`);
      setSchedulePuzzle(null);
      await fetchSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  }

  async function autoSchedule() {
    const startDate = new Date().toISOString().slice(0, 10);
    if (!confirm(`Auto-schedule approved puzzles starting ${startDate}?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/freezeframes/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Auto-schedule failed");
      setMessage(`Scheduled ${data.scheduled} puzzle(s)`);
      await fetchSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-schedule failed");
    } finally {
      setBusy(false);
    }
  }

  const approvedCounts = ROUNDS.map((r) => ({
    key: r.key,
    count: entries.filter((e) => e.round_key === r.key && e.status === "approved").length,
  }));

  return (
    <AdminShell
      title="FreezeFrames"
      subtitle="Source movie, song, TV, and album rounds — bundle into daily puzzles and schedule."
    >
      {message && <Notice tone="ok" text={message} onDismiss={() => setMessage(null)} />}
      {error && <Notice tone="err" text={error} onDismiss={() => setError(null)} />}

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["seed", "puzzles", "ops"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>
            {t === "seed" ? "Seed queue" : t === "puzzles" ? "Puzzles" : "Ops"}
          </button>
        ))}
      </div>

      {tab === "seed" && (
        <>
          <div style={toolbarStyle}>
            <select value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)} style={selectStyle}>
              <option value="">All rounds</option>
              {ROUNDS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.icon} {r.title}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="needs_media">Needs media</option>
              <option value="needs_review">Needs review</option>
              <option value="approved">Approved</option>
              <option value="used">Used</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={resolveAllDraft} disabled={busy} style={btnStyle("#5bc0de")}>
              Resolve all drafts
            </button>
          </div>

          <div style={{ ...toolbarStyle, marginBottom: "16px" }}>
            <select value={newRound} onChange={(e) => setNewRound(e.target.value)} style={selectStyle}>
              {ROUNDS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.title}
                </option>
              ))}
            </select>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Search title, e.g. Inception"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={addSeedEntry} disabled={busy || !newTitle.trim()} style={btnStyle("#a855f7")}>
              Add
            </button>
          </div>

          <div style={splitStyle}>
            <div style={tableWrapStyle}>
              {loading ? (
                <Empty>Loading…</Empty>
              ) : entries.length === 0 ? (
                <Empty>No seed entries — import from Ops or add one above.</Empty>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelected(entry)}
                    style={{
                      ...rowStyle,
                      background: selected?.id === entry.id ? "#2a2a2e" : "transparent",
                    }}
                  >
                    <span>{ROUND_ICONS[entry.round_key] ?? "•"}</span>
                    <span style={{ flex: 1, color: "#fff", fontWeight: 600 }}>
                      {entry.answer ?? entry.query_title}
                    </span>
                    <StatusBadge status={entry.status} />
                  </div>
                ))
              )}
            </div>

            {selected && (
              <div style={detailStyle}>
                <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>
                  {ROUND_ICONS[selected.round_key]} {selected.query_title}
                </h3>
                <DetailRow label="Answer" value={selected.answer ?? "—"} />
                <DetailRow label="Hint" value={selected.hint ?? "—"} />
                {selected.round_key === "song" && (
                  <DetailRow label="Artist" value={selected.artist ?? "—"} />
                )}
                {selected.round_key === "album" && (
                  <DetailRow label="Album" value={selected.album_name ?? "—"} />
                )}
                <DetailRow label="Source" value={selected.external_source ?? "—"} />
                {selected.resolve_notes && (
                  <p style={{ fontSize: "11px", color: "#c9b458", margin: "8px 0" }}>
                    {selected.resolve_notes}
                  </p>
                )}

                {selected.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.img}
                    alt=""
                    style={{ width: "100%", borderRadius: "6px", marginTop: "8px" }}
                  />
                )}
                {selected.audio && (
                  <audio controls src={selected.audio} style={{ width: "100%", marginTop: "8px" }} />
                )}

                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                  <button onClick={() => resolveEntry(selected.id)} disabled={busy} style={btnStyle("#5bc0de")}>
                    Resolve media
                  </button>
                  {selected.status === "needs_review" && (
                    <button onClick={() => patchEntry(selected.id, { status: "approved" })} disabled={busy} style={btnStyle("#6aaa64")}>
                      Approve
                    </button>
                  )}
                  {selected.status !== "rejected" && selected.status !== "used" && (
                    <button onClick={() => patchEntry(selected.id, { status: "rejected" })} disabled={busy} style={btnStyle("#ff6b6b")}>
                      Reject
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "puzzles" && (
        <>
          <div style={toolbarStyle}>
            <select value={puzzleStatusFilter} onChange={(e) => setPuzzleStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
            <button onClick={autoSchedule} disabled={busy} style={btnStyle("#6aaa64")}>
              Auto-schedule approved
            </button>
          </div>

          <div style={tableWrapStyle}>
            {puzzles.length === 0 ? (
              <Empty>No puzzles yet — generate bundles from approved seed entries.</Empty>
            ) : (
              puzzles.map((puzzle) => {
                const dates = scheduleByPuzzle.get(puzzle.id) ?? [];
                return (
                  <div key={puzzle.id} style={rowStyle}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontWeight: 600, fontSize: "12px" }}>
                        🎬 {puzzle.movie.answer} · 🎵 {puzzle.song.answer} · 📺 {puzzle.show.answer} · 💿 {puzzle.album.answer}
                      </div>
                      {dates.length > 0 && (
                        <div style={{ fontSize: "10px", color: "#565758", marginTop: "2px" }}>
                          Scheduled: {dates.sort().join(", ")}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={puzzle.status} />
                    <div style={{ display: "flex", gap: "4px" }}>
                      {puzzle.status === "draft" && (
                        <button onClick={() => updatePuzzleStatus(puzzle.id, "approved")} disabled={busy} style={miniBtn("#6aaa64")}>
                          Approve
                        </button>
                      )}
                      {puzzle.status === "approved" && (
                        <button
                          onClick={() => {
                            setSchedulePuzzle(puzzle);
                            setScheduleDate(new Date().toISOString().slice(0, 10));
                          }}
                          disabled={busy}
                          style={miniBtn("#6aaa64")}
                        >
                          Schedule
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {tab === "ops" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "520px" }}>
          <OpsCard
            title="1. Import seed catalog"
            body="Loads starter titles from lib/freezeframes/seed.ts into the seed queue."
            action="Import seed.ts"
            onAction={runImport}
            busy={busy}
          />
          <OpsCard
            title="2. Resolve media"
            body="TMDB episode stills for TV, scene backdrops for movies (TMDB_API_KEY). TVMaze fallback for shows. iTunes for songs/albums."
            action="Resolve all drafts"
            onAction={resolveAllDraft}
            busy={busy}
          />
          <OpsCard
            title="3. Review & approve"
            body="Approve resolved entries in the Seed queue tab — one approved entry per round is needed per bundle."
            action="Go to seed"
            onAction={() => setTab("seed")}
            busy={false}
          />
          <div style={cardStyle}>
            <strong style={{ fontSize: "13px" }}>Approved inventory</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: "#9aa0a6" }}>
              {approvedCounts.map((c) => (
                <li key={c.key}>
                  {ROUND_ICONS[c.key]} {c.key}: {c.count} available
                </li>
              ))}
            </ul>
          </div>
          <OpsCard
            title="4. Bundle puzzles"
            body="Pairs the oldest approved entry from each round into draft puzzles."
            action="Generate bundles"
            onAction={generateBundles}
            busy={busy}
          />
          <OpsCard
            title="5. Schedule dailies"
            body="Approve puzzles, then schedule manually or auto-fill open dates."
            action="Auto-schedule"
            onAction={autoSchedule}
            busy={busy}
          />
        </div>
      )}

      {schedulePuzzle && (
        <div style={modalOverlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>Schedule daily puzzle</h2>
            <p style={{ fontSize: "12px", color: "#787c7e", marginBottom: "12px" }}>
              🎬 {schedulePuzzle.movie.answer} · 🎵 {schedulePuzzle.song.answer}
            </p>
            <label style={labelStyle}>Publish date</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              style={inputStyle}
            />
            {usedDates.has(scheduleDate) && (
              <p style={{ fontSize: "11px", color: "#ff6b6b", marginTop: "8px" }}>
                A puzzle is already scheduled for this date.
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
              <button onClick={() => setSchedulePuzzle(null)} style={btnStyle("#3a3a3c")}>
                Cancel
              </button>
              <button
                onClick={schedulePuzzleAction}
                disabled={busy || usedDates.has(scheduleDate)}
                style={btnStyle("#6aaa64")}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */

function Notice({ tone, text, onDismiss }: { tone: "ok" | "err"; text: string; onDismiss: () => void }) {
  const color = tone === "ok" ? "#6aaa64" : "#ff6b6b";
  return (
    <div style={{ padding: "8px 16px", background: `${color}18`, border: `1px solid ${color}50`, borderRadius: "6px", fontSize: "12px", color, marginBottom: "16px" }}>
      {text}
      <button onClick={onDismiss} style={{ marginLeft: "12px", background: "none", border: "none", color, cursor: "pointer" }}>
        ×
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#787c7e";
  return (
    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, background: `${color}20`, color }}>
      {status}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ fontSize: "12px", marginBottom: "4px" }}>
      <span style={{ color: "#787c7e" }}>{label}: </span>
      <span style={{ color: "#e8e8e8" }}>{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "32px", textAlign: "center", color: "#787c7e", fontSize: "12px" }}>{children}</div>;
}

function OpsCard({
  title,
  body,
  action,
  onAction,
  busy,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  busy: boolean;
}) {
  return (
    <div style={cardStyle}>
      <strong style={{ fontSize: "13px" }}>{title}</strong>
      <p style={{ fontSize: "12px", color: "#9aa0a6", margin: "6px 0 12px", lineHeight: 1.45 }}>{body}</p>
      <button onClick={onAction} disabled={busy} style={btnStyle("#a855f7")}>
        {action}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const toolbarStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "12px",
  flexWrap: "wrap",
  alignItems: "center",
};

const splitStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 320px",
  gap: "16px",
};

const tableWrapStyle: CSSProperties = {
  background: "#1a1a1b",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  overflow: "hidden",
};

const rowStyle: CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid #2a2a2c",
  fontSize: "12px",
  cursor: "pointer",
};

const detailStyle: CSSProperties = {
  background: "#1a1a1b",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "16px",
  alignSelf: "start",
  position: "sticky",
  top: "16px",
};

const cardStyle: CSSProperties = {
  background: "#1a1a1b",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "16px",
};

const selectStyle: CSSProperties = {
  padding: "8px 12px",
  background: "#1a1a1b",
  color: "#fff",
  border: "1px solid #3a3a3c",
  borderRadius: "6px",
  fontSize: "12px",
};

const inputStyle: CSSProperties = {
  padding: "8px 12px",
  background: "#121213",
  color: "#fff",
  border: "1px solid #3a3a3c",
  borderRadius: "6px",
  fontSize: "13px",
  outline: "none",
};

function btnStyle(bg: string): CSSProperties {
  return {
    padding: "8px 14px",
    background: bg,
    color: bg === "#3a3a3c" ? "#fff" : "#121213",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  };
}

function miniBtn(color: string): CSSProperties {
  return {
    padding: "4px 8px",
    fontSize: "10px",
    fontWeight: 600,
    background: `${color}18`,
    color,
    border: `1px solid ${color}40`,
    borderRadius: "4px",
    cursor: "pointer",
  };
}

function tabBtn(active: boolean): CSSProperties {
  return {
    padding: "8px 14px",
    background: active ? "#a855f7" : "#1a1a1b",
    color: active ? "#121213" : "#9aa0a6",
    border: "1px solid #3a3a3c",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  };
}

const modalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const modalStyle: CSSProperties = {
  background: "#1a1a1b",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "24px",
  width: "90%",
  maxWidth: "420px",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 600,
  color: "#787c7e",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};
