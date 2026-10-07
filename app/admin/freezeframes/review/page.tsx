"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { reviewWarnings } from "@/lib/freezeframes/review";

interface ReviewEntry {
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
  metadata?: { text_clue?: string };
}

const ROUND_LABELS: Record<string, string> = {
  movie: "Movie",
  show: "TV show",
  song: "Song",
  album: "Album cover",
};

const STATUSES = ["needs_review", "needs_media", "draft", "approved", "rejected", "used"];

const STATUS_COLORS: Record<string, string> = {
  draft: "#787c7e",
  needs_media: "#c9b458",
  needs_review: "#5bc0de",
  approved: "#6aaa64",
  rejected: "#ff6b6b",
  used: "#9aa0a6",
};

const PAGE_SIZE = 24;

export default function FreezeFramesReviewPage() {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("needs_review");
  const [round, setRound] = useState("");
  const [search, setSearch] = useState("");
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [bulkArmed, setBulkArmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/freezeframes/seed")
      .then((res) => {
        if (res.status === 403) throw new Error("Not signed in as an admin.");
        if (!res.ok) throw new Error("Failed to load entries");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEntries(data.entries ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Changes the card at once and saves in the background, so reviewing is
   * not paced by the network. A failed save puts the card back.
   */
  const setEntryStatus = useCallback(async (id: string, next: string) => {
    let previous: string | undefined;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        previous = e.status;
        return { ...e, status: next };
      }),
    );
    try {
      const res = await fetch(`/api/admin/freezeframes/seed/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      setEntries((prev) => prev.map((e) => (e.id === id && previous ? { ...e, status: previous } : e)));
      setError(err instanceof Error ? `${err.message}; the change was undone.` : "Failed to save");
    }
  }, []);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const e of entries) byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    return byStatus;
  }, [entries]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries
      .filter((e) => !status || e.status === status)
      .filter((e) => !round || e.round_key === round)
      .filter((e) => !needle || `${e.query_title} ${e.answer ?? ""} ${e.artist ?? ""}`.toLowerCase().includes(needle))
      .filter((e) => !warningsOnly || reviewWarnings(e).length > 0);
  }, [entries, status, round, search, warningsOnly]);

  /** Any filter change returns to the first page and disarms bulk approve. */
  function filterBy(apply: () => void) {
    apply();
    setPage(0);
    setBulkArmed(false);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  // Bulk approve skips anything with a warning; those need a decision each.
  const bulkTargets = shown.filter((e) => e.status === "needs_review" && reviewWarnings(e).length === 0);

  async function approveShown() {
    if (!bulkArmed) {
      setBulkArmed(true);
      return;
    }
    setBulkArmed(false);
    const ids = bulkTargets.map((e) => e.id);
    const before = entries;
    setEntries((prev) => prev.map((e) => (ids.includes(e.id) ? { ...e, status: "approved" } : e)));
    try {
      const res = await fetch("/api/admin/freezeframes/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", ids, status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
    } catch (err) {
      setEntries(before);
      setError(err instanceof Error ? `${err.message}; nothing was changed.` : "Failed to approve");
    }
  }

  return (
    <AdminShell
      title="FreezeFrames review"
      subtitle="Approve or reject each clip. Approved clips are grouped into puzzles automatically each morning, one movie, song, show and album per puzzle."
      maxWidth={1280}
    >
      {error && (
        <div style={{ background: "#3b1f1f", color: "#ff6b6b", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => filterBy(() => setStatus(status === s ? "" : s))}
            style={{ ...chip, borderColor: status === s ? STATUS_COLORS[s] : "#3a3a3c", color: status === s ? STATUS_COLORS[s] : "#e8e8e8" }}
          >
            {s.replace("_", " ")} · {counts[s] ?? 0}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
        <select value={round} onChange={(e) => filterBy(() => setRound(e.target.value))} style={control} aria-label="Round">
          <option value="">All rounds</option>
          {Object.entries(ROUND_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => filterBy(() => setSearch(e.target.value))}
          placeholder="Search title or artist"
          style={{ ...control, minWidth: "220px" }}
          aria-label="Search"
        />
        <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "13px", color: "#c7c7cc" }}>
          <input type="checkbox" checked={warningsOnly} onChange={(e) => filterBy(() => setWarningsOnly(e.target.checked))} />
          Only entries with warnings
        </label>
        <span style={{ marginLeft: "auto", fontSize: "13px", color: "#9aa0a6" }}>
          {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
        </span>
        <button
          type="button"
          disabled={bulkTargets.length === 0}
          onClick={() => void approveShown()}
          style={{ ...button, borderColor: bulkArmed ? "#6aaa64" : "#3a3a3c", opacity: bulkTargets.length === 0 ? 0.5 : 1 }}
        >
          {bulkArmed ? `Click again to approve ${bulkTargets.length}` : `Approve ${bulkTargets.length} on this page without warnings`}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#9aa0a6" }}>Loading entries…</p>
      ) : shown.length === 0 ? (
        <p style={{ color: "#9aa0a6" }}>Nothing matches these filters.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {shown.map((entry) => (
            <EntryCard key={entry.id} entry={entry} onStatus={setEntryStatus} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center", marginTop: "20px" }}>
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} style={button}>
            Previous
          </button>
          <span style={{ fontSize: "13px", color: "#9aa0a6" }}>
            Page {page + 1} of {pageCount}
          </span>
          <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)} style={button}>
            Next
          </button>
        </div>
      )}
    </AdminShell>
  );
}

function EntryCard({
  entry,
  onStatus,
}: {
  entry: ReviewEntry;
  onStatus: (id: string, status: string) => Promise<void>;
}) {
  const warnings = reviewWarnings(entry);
  const isSong = entry.round_key === "song";
  // What the player must type: the title, or the artist for an album cover.
  const answer = entry.answer ?? entry.query_title;
  const detail =
    entry.round_key === "album" ? entry.album_name : isSong ? entry.artist : entry.hint;
  // Notes that are not match doubts explain why an entry was held back.
  const otherNotes = (entry.resolve_notes ?? "").split("\n").filter((line) => line && !line.startsWith("CHECK:"));

  return (
    <article style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: "12px", overflow: "hidden" }}>
      <div style={{ height: "190px", background: "#121213", display: "flex", alignItems: "center", justifyContent: "center", padding: isSong ? "0 12px" : 0 }}>
        {isSong ? (
          entry.audio ? (
            <audio controls preload="none" src={entry.audio} style={{ width: "100%" }} />
          ) : (
            <span style={{ color: "#787c7e", fontSize: "13px" }}>No audio</span>
          )
        ) : entry.img ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote review images from several hosts
          <img src={entry.img} alt="" style={{ maxWidth: "100%", maxHeight: "190px", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "#787c7e", fontSize: "13px" }}>No image</span>
        )}
      </div>

      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px", color: "#9aa0a6" }}>
          <span>{ROUND_LABELS[entry.round_key] ?? entry.round_key}</span>
          <span style={{ color: STATUS_COLORS[entry.status] }}>{entry.status.replace("_", " ")}</span>
        </div>

        <p style={{ margin: "6px 0 2px", fontSize: "15px", fontWeight: 600 }}>{answer}</p>
        {detail && <p style={{ margin: 0, fontSize: "12px", color: "#c7c7cc" }}>{detail}</p>}
        {isSong && (
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: entry.metadata?.text_clue ? "#c7c7cc" : "#787c7e" }}>
            {entry.metadata?.text_clue ? `Written clue: ${entry.metadata.text_clue}` : "No written clue yet"}
          </p>
        )}

        {warnings.map((warning) => (
          <p key={warning} style={{ margin: "6px 0 0", fontSize: "12px", color: "#c9b458" }}>
            ⚠ {warning}
          </p>
        ))}
        {entry.status === "needs_media" &&
          otherNotes.map((note) => (
            <p key={note} style={{ margin: "6px 0 0", fontSize: "12px", color: "#9aa0a6" }}>
              {note}
            </p>
          ))}

        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
          <button
            type="button"
            disabled={entry.status === "approved" || entry.status === "used"}
            onClick={() => void onStatus(entry.id, "approved")}
            style={{ ...button, flex: 1, borderColor: "#6aaa64", color: "#6aaa64" }}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={entry.status === "rejected" || entry.status === "used"}
            onClick={() => void onStatus(entry.id, "rejected")}
            style={{ ...button, flex: 1, borderColor: "#5a2c2c", color: "#ff6b6b" }}
          >
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

const control: CSSProperties = {
  background: "#1c1c1e",
  color: "#e8e8e8",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "8px 10px",
};

const button: CSSProperties = {
  background: "#2c2c2e",
  color: "#e8e8e8",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
};

const chip: CSSProperties = {
  background: "#1c1c1e",
  border: "1px solid #3a3a3c",
  borderRadius: "999px",
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "13px",
  textTransform: "capitalize",
};
