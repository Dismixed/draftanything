"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

interface ReviewPuzzle {
  id: string;
  answer: string;
  clues: string[];
  status: string;
}

const STATUSES = ["draft", "approved", "archived"];

const STATUS_COLORS: Record<string, string> = {
  draft: "#5bc0de",
  approved: "#6aaa64",
  archived: "#ff6b6b",
};

const PAGE_SIZE = 30;

export default function GettingWarmerReviewPage() {
  const [puzzles, setPuzzles] = useState<ReviewPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [bulkArmed, setBulkArmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/getting-warmer/puzzles?limit=1000")
      .then((res) => {
        if (res.status === 403) throw new Error("Not signed in as an admin.");
        if (!res.ok) throw new Error("Failed to load puzzles");
        return res.json();
      })
      .then((data) => {
        // The API lists newest first; puzzles run oldest first, so show them that way.
        if (!cancelled) setPuzzles([...(data.puzzles ?? [])].reverse());
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

  /** Changes the cards at once and saves in the background; a failed save puts them back. */
  async function setStatuses(ids: string[], next: string) {
    const before = puzzles;
    setPuzzles((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, status: next } : p)));
    try {
      const res = await fetch("/api/admin/getting-warmer/puzzles/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: next }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch (err) {
      setPuzzles(before);
      setError(err instanceof Error ? `${err.message}; the change was undone.` : "Failed to save");
    }
  }

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const p of puzzles) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    return byStatus;
  }, [puzzles]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return puzzles
      .filter((p) => !status || p.status === status)
      .filter((p) => !needle || `${p.answer} ${p.clues.join(" ")}`.toLowerCase().includes(needle));
  }, [puzzles, status, search]);

  /** Any filter change returns to the first page and disarms bulk approve. */
  function filterBy(apply: () => void) {
    apply();
    setPage(0);
    setBulkArmed(false);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const bulkTargets = shown.filter((p) => p.status === "draft");

  function approveShown() {
    if (!bulkArmed) {
      setBulkArmed(true);
      return;
    }
    setBulkArmed(false);
    void setStatuses(bulkTargets.map((p) => p.id), "approved");
  }

  return (
    <AdminShell
      title="Getting Warmer review"
      subtitle="Each puzzle is an answer and five clues, vaguest first. Approved puzzles run in the order shown, before any old puzzle repeats."
      maxWidth={1280}
    >
      {error && (
        <div style={{ background: "#3b1f1f", color: "#ff6b6b", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => filterBy(() => setStatus(status === s ? "" : s))}
            style={{ ...chip, borderColor: status === s ? STATUS_COLORS[s] : "#3a3a3c", color: status === s ? STATUS_COLORS[s] : "#e8e8e8" }}
          >
            {s} · {counts[s] ?? 0}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => filterBy(() => setSearch(e.target.value))}
          placeholder="Search answer or clue"
          style={{ ...control, minWidth: "220px" }}
          aria-label="Search"
        />
        <span style={{ marginLeft: "auto", fontSize: "13px", color: "#9aa0a6" }}>
          {filtered.length} puzzle{filtered.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          disabled={bulkTargets.length === 0}
          onClick={approveShown}
          style={{ ...button, borderColor: bulkArmed ? "#6aaa64" : "#3a3a3c", opacity: bulkTargets.length === 0 ? 0.5 : 1 }}
        >
          {bulkArmed ? `Click again to approve ${bulkTargets.length}` : `Approve the ${bulkTargets.length} drafts on this page`}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#9aa0a6" }}>Loading puzzles…</p>
      ) : shown.length === 0 ? (
        <p style={{ color: "#9aa0a6" }}>Nothing matches these filters.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
          {shown.map((puzzle) => (
            <article key={puzzle.id} style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: "12px", padding: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
                <strong style={{ fontSize: "16px", letterSpacing: "0.04em" }}>{puzzle.answer}</strong>
                <span style={{ fontSize: "12px", color: STATUS_COLORS[puzzle.status] }}>{puzzle.status}</span>
              </div>
              <ol style={{ margin: "8px 0 10px", paddingLeft: "20px", fontSize: "14px", color: "#c7c7cc", lineHeight: 1.5 }}>
                {puzzle.clues.map((clue) => (
                  <li key={clue}>{clue}</li>
                ))}
              </ol>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  disabled={puzzle.status === "approved"}
                  onClick={() => void setStatuses([puzzle.id], "approved")}
                  style={{ ...button, flex: 1, borderColor: "#6aaa64", color: "#6aaa64" }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={puzzle.status === "archived"}
                  onClick={() => void setStatuses([puzzle.id], "archived")}
                  style={{ ...button, flex: 1, borderColor: "#5a2c2c", color: "#ff6b6b" }}
                >
                  Reject
                </button>
              </div>
            </article>
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
