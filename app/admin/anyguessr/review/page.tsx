"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { reviewWarnings } from "@/lib/anyguessr/review";
import { CLUE_DIFFICULTIES, type ClueDifficulty } from "@/lib/anyguessr/seed-types";

interface ReviewEntry {
  id: string;
  cca3: string;
  country_common: string;
  clue_type: string;
  wiki_title: string | null;
  text_content: string | null;
  status: string;
  difficulty: ClueDifficulty | null;
  image_candidates: Array<{ image_url: string; thumb_url?: string }>;
  selected_candidate_index: number;
  notes: string | null;
}

/** Clue types the game is keeping; currency and jersey are being retired. */
const REVIEW_TYPES = ["landmark", "environment", "food", "person", "brand", "wildlife", "written_language", "flag"];

const TYPE_LABELS: Record<string, string> = {
  landmark: "Place",
  environment: "Place (second)",
  food: "Food",
  person: "Person",
  brand: "Brand",
  wildlife: "Wildlife",
  written_language: "Language",
  flag: "Flag",
};

const STATUSES = ["needs_review", "needs_image", "draft", "approved", "rejected"];

const STATUS_COLORS: Record<string, string> = {
  draft: "#787c7e",
  needs_image: "#c9b458",
  needs_review: "#5bc0de",
  approved: "#6aaa64",
  rejected: "#ff6b6b",
};

const PAGE_SIZE = 24;

export default function AnyGuessrReviewPage() {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("needs_review");
  const [clueType, setClueType] = useState("");
  const [search, setSearch] = useState("");
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkArmed, setBulkArmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/anyguessr/seed?view=review")
      .then((res) => {
        if (res.status === 403) throw new Error("Not signed in as an admin.");
        if (!res.ok) throw new Error("Failed to load clues");
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

  const patch = useCallback(async (id: string, change: Partial<ReviewEntry>) => {
    setBusyIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/admin/anyguessr/seed/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(change),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...change } : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const inScope = useMemo(() => entries.filter((e) => REVIEW_TYPES.includes(e.clue_type)), [entries]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const e of inScope) byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    return byStatus;
  }, [inScope]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return inScope
      .filter((e) => !status || e.status === status)
      .filter((e) => !clueType || e.clue_type === clueType)
      .filter((e) => !needle || `${e.country_common} ${e.wiki_title ?? ""} ${e.text_content ?? ""}`.toLowerCase().includes(needle))
      .filter((e) => !warningsOnly || reviewWarnings(e).length > 0)
      .sort(
        (a, b) =>
          REVIEW_TYPES.indexOf(a.clue_type) - REVIEW_TYPES.indexOf(b.clue_type) ||
          a.country_common.localeCompare(b.country_common),
      );
  }, [inScope, status, clueType, search, warningsOnly]);

  /** Any filter change returns to the first page and disarms bulk approve. */
  function filterBy(apply: () => void) {
    apply();
    setPage(0);
    setBulkArmed(false);
  }

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  // Bulk approve skips anything with a warning; those need a decision each.
  const bulkTargets = shown.filter((e) => e.status !== "approved" && reviewWarnings(e).length === 0);

  async function approveShown() {
    if (!bulkArmed) {
      setBulkArmed(true);
      return;
    }
    setBulkArmed(false);
    for (const e of bulkTargets) await patch(e.id, { status: "approved" });
  }

  return (
    <AdminShell
      title="AnyGuessr clue review"
      subtitle="Approve, reject or re-rate each clue. Approved clues enter the game from the day after tomorrow; days already stored are not changed."
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
        <select value={clueType} onChange={(e) => filterBy(() => setClueType(e.target.value))} style={control} aria-label="Clue type">
          <option value="">All types</option>
          {REVIEW_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => filterBy(() => setSearch(e.target.value))}
          placeholder="Search country or clue"
          style={{ ...control, minWidth: "220px" }}
          aria-label="Search"
        />
        <label style={{ display: "flex", gap: "6px", alignItems: "center", fontSize: "13px", color: "#c7c7cc" }}>
          <input type="checkbox" checked={warningsOnly} onChange={(e) => filterBy(() => setWarningsOnly(e.target.checked))} />
          Only clues with warnings
        </label>
        <span style={{ marginLeft: "auto", fontSize: "13px", color: "#9aa0a6" }}>
          {filtered.length} clue{filtered.length === 1 ? "" : "s"}
        </span>
        <button type="button" disabled={bulkTargets.length === 0} onClick={() => void approveShown()} style={{ ...button, borderColor: bulkArmed ? "#6aaa64" : "#3a3a3c", opacity: bulkTargets.length === 0 ? 0.5 : 1 }}>
          {bulkArmed ? `Click again to approve ${bulkTargets.length}` : `Approve ${bulkTargets.length} on this page without warnings`}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#9aa0a6" }}>Loading clues…</p>
      ) : shown.length === 0 ? (
        <p style={{ color: "#9aa0a6" }}>Nothing matches these filters.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
          {shown.map((entry) => (
            <ClueCard key={entry.id} entry={entry} busy={busyIds.has(entry.id)} onPatch={patch} />
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

function ClueCard({
  entry,
  busy,
  onPatch,
}: {
  entry: ReviewEntry;
  busy: boolean;
  onPatch: (id: string, change: Partial<ReviewEntry>) => Promise<void>;
}) {
  const warnings = reviewWarnings(entry);
  const selected = entry.image_candidates[entry.selected_candidate_index] ?? entry.image_candidates[0];
  const isLanguage = entry.clue_type === "written_language";
  const title = isLanguage ? entry.text_content : entry.wiki_title;

  return (
    <article style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: "12px", overflow: "hidden", opacity: busy ? 0.6 : 1 }}>
      <div style={{ height: "190px", background: "#121213", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isLanguage ? (
          <p style={{ fontSize: "24px", textAlign: "center", padding: "0 16px", margin: 0 }}>{entry.text_content}</p>
        ) : selected ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote review thumbnails from arbitrary hosts
          <img src={selected.thumb_url ?? selected.image_url} alt="" loading="lazy" decoding="async" style={{ maxWidth: "100%", maxHeight: "190px", objectFit: "contain" }} />
        ) : (
          <span style={{ color: "#787c7e", fontSize: "13px" }}>No image</span>
        )}
      </div>

      {entry.image_candidates.length > 1 && (
        <div style={{ display: "flex", gap: "4px", padding: "6px 8px", background: "#161617", overflowX: "auto" }}>
          {entry.image_candidates.map((candidate, index) => (
            <button
              key={candidate.image_url}
              type="button"
              onClick={() => void onPatch(entry.id, { selected_candidate_index: index })}
              aria-label={`Use image ${index + 1}`}
              style={{ padding: 0, border: `2px solid ${index === entry.selected_candidate_index ? "#5bc0de" : "transparent"}`, borderRadius: "6px", background: "none", cursor: "pointer", flex: "0 0 auto" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote review thumbnails from arbitrary hosts */}
              <img src={candidate.thumb_url ?? candidate.image_url} alt="" loading="lazy" decoding="async" style={{ width: "48px", height: "36px", objectFit: "cover", borderRadius: "4px", display: "block" }} />
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px", color: "#9aa0a6" }}>
          <span>
            {entry.country_common} · {TYPE_LABELS[entry.clue_type] ?? entry.clue_type}
          </span>
          <span style={{ color: STATUS_COLORS[entry.status] }}>{entry.status.replace("_", " ")}</span>
        </div>

        <p style={{ margin: "6px 0 2px", fontSize: "15px", fontWeight: 600 }}>
          {!isLanguage && entry.wiki_title ? (
            <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(entry.wiki_title.replace(/ /g, "_"))}`} target="_blank" rel="noreferrer" style={{ color: "#e8e8e8" }}>
              {title}
            </a>
          ) : (
            title
          )}
        </p>
        {entry.clue_type === "person" && entry.text_content && (
          <p style={{ margin: "0 0 2px", fontSize: "12px", color: "#c7c7cc" }}>Shown to players as: {entry.text_content}</p>
        )}
        {entry.notes && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#9aa0a6" }}>{entry.notes}</p>}

        {warnings.map((warning) => (
          <p key={warning} style={{ margin: "6px 0 0", fontSize: "12px", color: "#c9b458" }}>
            ⚠ {warning}
          </p>
        ))}

        <div style={{ display: "flex", gap: "4px", marginTop: "10px" }}>
          {CLUE_DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              disabled={busy}
              onClick={() => void onPatch(entry.id, { difficulty })}
              style={{ ...chip, flex: 1, padding: "5px 0", borderColor: entry.difficulty === difficulty ? "#5bc0de" : "#3a3a3c", color: entry.difficulty === difficulty ? "#5bc0de" : "#c7c7cc" }}
            >
              {difficulty}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
          <button type="button" disabled={busy || entry.status === "approved"} onClick={() => void onPatch(entry.id, { status: "approved" })} style={{ ...button, flex: 1, borderColor: "#6aaa64", color: "#6aaa64" }}>
            Approve
          </button>
          <button type="button" disabled={busy || entry.status === "rejected"} onClick={() => void onPatch(entry.id, { status: "rejected" })} style={{ ...button, flex: 1, borderColor: "#5a2c2c", color: "#ff6b6b" }}>
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
