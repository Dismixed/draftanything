"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import type {
  Candidate,
  ReviewCell,
  ReviewColumn,
  ReviewGame,
  ReviewGrid,
  ReviewSummary,
} from "@/lib/daily-review/types";

interface Selection {
  column: ReviewColumn;
  cell: ReviewCell;
}

const ORANGE = "#ff6b1a";
const GREEN = "#6aaa64";
const RED = "#ff6b6b";

/** `2026-10-16` → `Fri Oct 16`, read in UTC like the schedule. */
function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })
    .replace(",", "");
}

const needsReview = (cell: ReviewCell) => !cell.locked && cell.contentId !== null && !cell.reviewedBy;

/** An approval names the content the admin saw, so a slot edited since is refused. */
type ApproveItem = { game: ReviewGame; date: string; contentId: string };

const STALE_NOTE = "That slot changed since you opened it — the grid has been reloaded.";

export default function AdminReviewPage() {
  const [grid, setGrid] = useState<ReviewGrid | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchGrid = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/daily-review");
      if (res.status === 403) {
        setError("Session expired — refresh or sign in again.");
        return;
      }
      if (!res.ok) throw new Error("Failed to load the review grid");
      const data = (await res.json()) as { grid: ReviewGrid; summary: ReviewSummary };
      setGrid(data.grid);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the review grid");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matches existing admin pages
    void fetchGrid();
  }, [fetchGrid]);

  async function approveMany(items: ApproveItem[]) {
    if (items.length === 0) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/daily-review/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approve failed");
      const failed = (data.failed as unknown[]).length;
      setMessage(`Approved ${data.approved}${failed ? `, ${failed} skipped` : ""}.`);
      await fetchGrid();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  const pendingInRow = (date: string) =>
    (grid?.columns ?? []).flatMap((column) =>
      column.cells
        .filter((c) => c.date === date && needsReview(c))
        .map((c) => ({ game: column.game, date: c.date, contentId: c.contentId! })),
    );

  const pendingInColumn = (column: ReviewColumn) =>
    column.cells.filter(needsReview).map((c) => ({ game: column.game, date: c.date, contentId: c.contentId! }));

  const unlockedDates = (grid?.dates ?? []).filter((d) => grid && d > grid.today);

  return (
    <AdminShell
      title="Review dailies"
      subtitle="Approve or swap the next 10 days before they go live. Unreviewed days ship the auto-pick."
      maxWidth={1200}
    >
      {error && (
        <Banner color={RED} background="#3b1f1f" onClose={() => setError(null)}>
          {error}
        </Banner>
      )}
      {message && (
        <Banner color={GREEN} background="#1f3b2a" onClose={() => setMessage(null)}>
          {message}
        </Banner>
      )}

      {!grid ? (
        <p style={muted}>Loading…</p>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14 }}>
            <strong style={{ color: summary?.total ? ORANGE : GREEN }}>{summary?.total ?? 0}</strong> need review
          </p>

          <div style={{ overflowX: "auto", border: "1px solid #3a3a3c", borderRadius: 10 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 120 }} />
                  {grid.columns.map((column) => {
                    const pending = pendingInColumn(column);
                    return (
                      <th key={column.game} style={thStyle}>
                        <div>{column.name}</div>
                        {pending.length > 0 && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveMany(pending)}
                            style={{ ...linkBtn, marginTop: 4 }}
                          >
                            Approve all ({pending.length})
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {grid.dates.map((date, rowIndex) => {
                  const pending = pendingInRow(date);
                  const soon = unlockedDates.slice(0, 2).includes(date);
                  return (
                    <tr key={date}>
                      <th scope="row" style={{ ...thStyle, textAlign: "left", whiteSpace: "nowrap" }}>
                        <div>{dayLabel(date)}</div>
                        {date === grid.today && <div style={muted}>today · locked</div>}
                        {pending.length > 0 && (
                          <button type="button" disabled={busy} onClick={() => approveMany(pending)} style={linkBtn}>
                            Approve all
                          </button>
                        )}
                      </th>
                      {grid.columns.map((column) => {
                        if (column.error) {
                          return rowIndex === 0 ? (
                            <td key={column.game} rowSpan={grid.dates.length} style={{ ...tdStyle, color: RED }}>
                              Couldn&apos;t load: {column.error}
                            </td>
                          ) : null;
                        }
                        const cell = column.cells[rowIndex]!;
                        return (
                          <td key={column.game} style={tdStyle}>
                            <CellButton
                              cell={cell}
                              soon={soon}
                              onOpen={() => setSelection({ column, cell })}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selection && (
        <ReviewPanel
          key={`${selection.column.game}|${selection.cell.date}`}
          selection={selection}
          onClose={() => setSelection(null)}
          onStale={async () => {
            setSelection(null);
            setError(STALE_NOTE);
            await fetchGrid();
          }}
          onDone={async (note) => {
            setSelection(null);
            setMessage(note);
            await fetchGrid();
          }}
        />
      )}
    </AdminShell>
  );
}

function CellButton({ cell, soon, onOpen }: { cell: ReviewCell; soon: boolean; onOpen: () => void }) {
  if (!cell.contentId) return <span style={muted}>—</span>;

  const pending = needsReview(cell);
  const reviewer = cell.reviewedBy?.split("@")[0];
  return (
    <button
      type="button"
      onClick={cell.locked ? undefined : onOpen}
      disabled={cell.locked}
      title={cell.preview?.title}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "8px 10px",
        borderRadius: 8,
        border: `${pending && soon ? 2 : 1}px solid ${pending ? ORANGE : "#3a3a3c"}`,
        background: "#1c1c1e",
        color: "#e8e8e8",
        cursor: cell.locked ? "default" : "pointer",
        opacity: cell.locked ? 0.55 : 1,
        fontSize: 12,
      }}
    >
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
        {cell.preview?.title}
      </div>
      <div style={{ marginTop: 2, fontSize: 11 }}>
        {reviewer ? (
          <span style={{ color: GREEN }}>✓ {reviewer}</span>
        ) : pending ? (
          <span style={{ color: ORANGE }}>● needs review</span>
        ) : (
          <span style={muted}>unreviewed</span>
        )}
      </div>
    </button>
  );
}

function ReviewPanel({
  selection,
  onClose,
  onStale,
  onDone,
}: {
  selection: Selection;
  onClose: () => void;
  /** The slot or the pick changed under the admin; the parent reloads the grid. */
  onStale: () => Promise<void>;
  onDone: (note: string) => Promise<void>;
}) {
  const { column, cell } = selection;
  const [alternates, setAlternates] = useState<Candidate[] | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [confirmRetire, setConfirmRetire] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const loadAlternates = useCallback(async () => {
    setAlternates(null);
    try {
      const all = showAll ? "&all=1" : "";
      const res = await fetch(`/api/admin/daily-review/alternates?game=${column.game}&date=${cell.date}${all}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load alternates");
      setAlternates(data.alternates);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to load alternates");
      setAlternates([]);
    }
  }, [column.game, cell.date, showAll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matches existing admin pages
    void loadAlternates();
  }, [loadAlternates]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function act(url: string, body: unknown, note: string) {
    setBusy(true);
    setPanelError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "STALE") {
        await onStale();
        return;
      }
      if (res.status === 409 && data.error === "LOCKED") {
        setPanelError("Today's daily is locked.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      if (Array.isArray(data.failed) && data.failed.length > 0) {
        if (data.failed[0].error === "STALE") {
          await onStale();
          return;
        }
        throw new Error(`Not approved: ${data.failed[0].error}`);
      }
      await onDone(note);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const current = cell.preview;
  const swap = (alt: Candidate, retire: boolean) =>
    act(
      "/api/admin/daily-review/swap",
      { game: column.game, date: cell.date, contentId: alt.contentId, currentId: cell.contentId, retire },
      `${column.name} ${dayLabel(cell.date)}: swapped to "${alt.preview.title}"${retire ? `, retired "${current?.title}"` : ""}.`,
    );

  return (
    <div
      role="dialog"
      aria-label={`${column.name} — ${dayLabel(cell.date)}`}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(420px, 100vw)",
        background: "#1c1c1e",
        borderLeft: "1px solid #3a3a3c",
        padding: 20,
        overflowY: "auto",
        zIndex: 50,
        boxShadow: "-8px 0 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>
          {column.name} · {dayLabel(cell.date)}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" style={{ ...linkBtn, fontSize: 18 }}>
          ×
        </button>
      </div>

      {panelError && <p style={{ color: RED, fontSize: 13 }}>{panelError}</p>}

      <h3 style={sectionTitle}>Scheduled</h3>
      {current && <PreviewCard preview={current} />}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button
          type="button"
          disabled={busy || Boolean(cell.reviewedBy)}
          onClick={() =>
            act(
              "/api/admin/daily-review/approve",
              { items: [{ game: column.game, date: cell.date, contentId: cell.contentId }] },
              `${column.name} ${dayLabel(cell.date)} approved.`,
            )
          }
          style={{ ...btnStyle, background: GREEN, color: "#121213", borderColor: GREEN }}
        >
          {cell.reviewedBy ? `Approved by ${cell.reviewedBy.split("@")[0]}` : "Approve"}
        </button>
        {current && (
          <a href={current.adminHref} style={{ ...linkBtn, alignSelf: "center" }}>
            Open in {column.name} admin
          </a>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ ...sectionTitle, marginTop: 24 }}>{showAll ? "Everything available" : "Alternates"}</h3>
        {!showAll && (
          <button type="button" onClick={() => setShowAll(true)} style={linkBtn}>
            Show all
          </button>
        )}
      </div>
      {alternates === null ? (
        <p style={muted}>Loading…</p>
      ) : alternates.length === 0 ? (
        <p style={muted}>
          No alternates — add content in{" "}
          <a href={current?.adminHref ?? "/admin"} style={{ color: ORANGE }}>
            {column.name} admin
          </a>
          .
        </p>
      ) : (
        alternates.map((alt) => (
          <div key={alt.contentId} style={{ marginBottom: 12 }}>
            <PreviewCard preview={alt.preview} />
            {confirmRetire === alt.contentId ? (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                Retire &ldquo;{current?.title}&rdquo;? It won&apos;t be picked again.
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => swap(alt, true)}
                    style={{ ...btnStyle, background: RED, color: "#121213", borderColor: RED }}
                  >
                    Confirm
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirmRetire(null)} style={btnStyle}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" disabled={busy} onClick={() => swap(alt, false)} style={btnStyle}>
                  Swap
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmRetire(alt.contentId)}
                  style={{ ...btnStyle, color: RED }}
                >
                  Swap + retire
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function PreviewCard({ preview }: { preview: Candidate["preview"] }) {
  return (
    <div style={{ ...cardStyle, display: "flex", gap: 10, alignItems: "center" }}>
      {preview.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.imageUrl}
          alt=""
          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflowWrap: "anywhere" }}>{preview.title}</div>
        {preview.subtitle && <div style={{ ...muted, marginTop: 2, overflowWrap: "anywhere" }}>{preview.subtitle}</div>}
      </div>
    </div>
  );
}

function Banner({
  color,
  background,
  onClose,
  children,
}: {
  color: string;
  background: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background, color, padding: "10px 14px", borderRadius: 8, marginBottom: 12 }}>
      {children}
      <button
        type="button"
        onClick={onClose}
        style={{ marginLeft: 12, background: "transparent", border: "none", color, cursor: "pointer" }}
      >
        ×
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #3a3a3c",
  background: "#2c2c2e",
  color: "#e8e8e8",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 0,
  color: ORANGE,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  textDecoration: "none",
};

const cardStyle: React.CSSProperties = {
  background: "#121213",
  border: "1px solid #3a3a3c",
  borderRadius: 10,
  padding: 10,
};

const thStyle: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #2a2a2c",
  fontSize: 12,
  fontWeight: 700,
  textAlign: "left",
  verticalAlign: "top",
  background: "#161617",
};

const tdStyle: React.CSSProperties = {
  padding: 6,
  borderBottom: "1px solid #2a2a2c",
  verticalAlign: "top",
};

const sectionTitle: React.CSSProperties = {
  margin: "16px 0 8px",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "#9aa0a6",
};

const muted: React.CSSProperties = { color: "#787c7e", fontSize: 12 };
