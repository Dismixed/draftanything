"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { SEED } from "@/lib/anyguessr/seed";
import { ADMIN_CLUE_TYPES } from "@/lib/anyguessr/seed-types";

interface SeedEntry {
  id: string;
  cca3: string;
  country_common: string;
  clue_type: string;
  wiki_title: string | null;
  text_content: string | null;
  status: string;
  image_candidates: Array<{ image_url: string; thumb_url?: string; license?: string }>;
  selected_candidate_index: number;
  vision_pass: boolean | null;
  vision_notes: string | null;
  notes: string | null;
  daily_dates?: string[];
}

interface AliasRow {
  id: string;
  cca3: string;
  alias: string;
}

interface CoverageGap {
  cca3: string;
  country: string;
  clueType: string;
  issue: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#787c7e",
  needs_image: "#c9b458",
  needs_review: "#5bc0de",
  approved: "#6aaa64",
  rejected: "#ff6b6b",
};

type Tab = "seed" | "gallery" | "aliases" | "ops";

export default function AdminAnyGuessrPage() {
  const [tab, setTab] = useState<Tab>("seed");
  const [entries, setEntries] = useState<SeedEntry[]>([]);
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [clueTypeFilter, setClueTypeFilter] = useState("");
  const [selected, setSelected] = useState<SeedEntry | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageGap[]>([]);
  const [readiness, setReadiness] = useState<{
    totalCountries: number;
    readyCountries: number;
    blocked: Array<{ cca3: string; country: string; missing: string[] }>;
  } | null>(null);

  const [aliasCca3, setAliasCca3] = useState("NLD");
  const [aliasText, setAliasText] = useState("");

  const countries = useMemo(() => SEED.map((s) => ({ cca3: s.cca3, name: s.common })), []);

  const fetchEntries = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (countryFilter) params.set("cca3", countryFilter);
      if (clueTypeFilter) params.set("clue_type", clueTypeFilter);
      const res = await fetch(`/api/admin/anyguessr/seed?${params}`);
      if (res.status === 403) {
        setError("Session expired — refresh the page or sign in again.");
        setEntries([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load seed entries");
      const data = await res.json();
      setEntries(data.entries ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [statusFilter, countryFilter, clueTypeFilter]);

  const fetchAliases = useCallback(async () => {
    const res = await fetch("/api/admin/anyguessr/aliases");
    if (res.status === 403) return;
    if (!res.ok) return;
    const data = await res.json();
    setAliases(data.aliases ?? []);
  }, []);

  useEffect(() => {
    void fetchEntries();
    void fetchAliases();
  }, [fetchEntries, fetchAliases]);

  async function approveAllFlagsWithImages() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/anyguessr/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_flags_with_images" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Bulk approve failed");
      setMessage(
        `Approved ${data.approved} flag${data.approved === 1 ? "" : "s"} with images` +
          (data.skipped > 0 ? ` (${data.skipped} skipped)` : ""),
      );
      setEntries((prev) =>
        prev.map((entry) =>
          entry.clue_type === "flag" &&
          entry.image_candidates.length > 0 &&
          entry.status !== "rejected"
            ? { ...entry, status: "approved" }
            : entry,
        ),
      );
      setSelected((prev) =>
        prev?.clue_type === "flag" &&
        prev.image_candidates.length > 0 &&
        prev.status !== "rejected"
          ? { ...prev, status: "approved" }
          : prev,
      );
      await fetchEntries({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/anyguessr/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setMessage(`Imported ${data.imported} seed rows from seed.ts`);
      await fetchEntries({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function hydrateFromPuzzles() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/anyguessr/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hydrate_from_puzzles" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hydration failed");
      setMessage(
        `Hydrated ${data.hydrated ?? 0} clue rows from ${data.countries ?? 0} puzzles`,
      );
      await fetchEntries({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hydration failed");
    } finally {
      setBusy(false);
    }
  }

  async function runGenerate() {
    setBusy(true);
    setMessage(null);
    setCoverage([]);
    setReadiness(null);
    try {
      const res = await fetch("/api/admin/anyguessr/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generate failed");
      const g = data.generate;
      setReadiness(g.readiness ?? null);
      if (g.total === 0) {
        const ready = g.readiness?.readyCountries ?? 0;
        const total = g.readiness?.totalCountries ?? 0;
        setMessage(
          `Generated 0/0 — no countries are fully approved yet (${ready}/${total} ready). Approve all 9 clue types per country in the Seed tab, then try again.`,
        );
      } else {
        setMessage(`Generated ${g.succeeded}/${g.total} puzzles`);
      }
      setCoverage(g.coverage?.gaps ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function proposeCountry(cca3: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/anyguessr/seed/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cca3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Propose failed");
      setMessage(`LLM proposed ${data.entries?.length ?? 0} entries for ${cca3}`);
      await fetchEntries({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Propose failed");
    } finally {
      setBusy(false);
    }
  }

  async function sourceFlagFromCdn(entry: SeedEntry) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/anyguessr/seed/${entry.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useVision: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Flag source failed");
      setSelected(data.entry);
      setMessage(`Sourced flag from flagcdn for ${entry.country_common}`);
      await fetchEntries({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Flag source failed");
    } finally {
      setBusy(false);
    }
  }

  function formatDailyRotation(dates: string[] | undefined): string {
    if (!dates || dates.length === 0) return "—";
    const today = new Date().toISOString().slice(0, 10);
    const latest = dates[dates.length - 1];
    if (dates.length === 1) {
      return latest === today ? "Today" : latest;
    }
    const countLabel = `${dates.length}×`;
    if (latest === today) return `Today · ${countLabel}`;
    return `${countLabel} · last ${latest}`;
  }

  const dailyRotationTitle =
    "Dates this clue is in the daily picker window (algorithmic schedule — not how many times players played it). Hover a cell for the full list.";

  async function resolveImages(entry: SeedEntry) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/anyguessr/seed/${entry.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useVision: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Image resolve failed");
      setSelected(data.entry);
      setMessage(`Found ${data.candidateCount} candidates for ${entry.country_common} / ${entry.clue_type}`);
      await fetchEntries({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image resolve failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolveAllImages() {
    const targets = entries.filter((entry) => entry.clue_type !== "written_language");
    if (targets.length === 0) {
      setMessage("No image-based entries found in the current list.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let successCount = 0;
      let failureCount = 0;

      for (const entry of targets) {
        try {
          const res = await fetch(`/api/admin/anyguessr/seed/${entry.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ useVision: true }),
          });
          if (!res.ok) {
            failureCount += 1;
            continue;
          }
          successCount += 1;
        } catch {
          failureCount += 1;
        }
      }

      setMessage(
        `Fetched images for ${successCount}/${targets.length} entries` +
          (failureCount > 0 ? ` (${failureCount} failed)` : ""),
      );
      await fetchEntries({ silent: true });
      if (selected) {
        const updatedSelected = targets.find((entry) => entry.id === selected.id);
        if (updatedSelected) {
          const res = await fetch(`/api/admin/anyguessr/seed/${selected.id}`);
          if (res.ok) {
            const data = await res.json();
            setSelected(data.entry ?? null);
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function patchEntry(
    id: string,
    patch: Record<string, unknown>,
    options?: { refreshList?: boolean },
  ) {
    const refreshList = options?.refreshList ?? false;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/anyguessr/seed/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      const updated = data.entry as SeedEntry;
      setSelected((prev) =>
        prev?.id === updated.id
          ? { ...updated, daily_dates: prev.daily_dates ?? updated.daily_dates }
          : updated,
      );
      if (refreshList) {
        await fetchEntries({ silent: true });
      } else {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === updated.id
              ? { ...updated, daily_dates: entry.daily_dates ?? updated.daily_dates }
              : entry,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addImageUrlToSelected() {
    if (!selected) return;
    const imageUrl = manualImageUrl.trim();
    if (!imageUrl) return;

    try {
      // Ensure URL is valid before writing it to seed entry candidates.
      const parsed = new URL(imageUrl);
      const normalized = parsed.toString();
      const existing = selected.image_candidates ?? [];
      const existingIndex = existing.findIndex((candidate) => candidate.image_url === normalized);
      const nextCandidates =
        existingIndex >= 0
          ? existing
          : [...existing, { image_url: normalized, thumb_url: normalized }];
      const nextSelectedIndex =
        existingIndex >= 0 ? existingIndex : nextCandidates.length - 1;

      await patchEntry(selected.id, {
        image_candidates: nextCandidates,
        selected_candidate_index: nextSelectedIndex,
        status: "needs_review",
      });
      setManualImageUrl("");
      setMessage(
        existingIndex >= 0
          ? "Image already existed; selected it."
          : "Added image URL and selected it.",
      );
    } catch {
      setError("Please enter a valid image URL (https://...)");
    }
  }

  async function addAlias() {
    if (!aliasText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/anyguessr/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cca3: aliasCca3, alias: aliasText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add alias");
      setAliasText("");
      await fetchAliases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Alias failed");
    } finally {
      setBusy(false);
    }
  }

  async function seedDefaultAliases() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/anyguessr/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_defaults" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed");
      setMessage(`Seeded ${data.added} default aliases`);
      await fetchAliases();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seed aliases failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="AnyGuessr"
      subtitle="Approve every clue (including flags) before generating puzzles. flagcdn is used only to source flag images in admin."
      maxWidth={1100}
    >
      {error && (
        <div style={{ background: "#3b1f1f", color: "#ff6b6b", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px" }}>
          {error}
          <button type="button" onClick={() => setError(null)} style={{ marginLeft: "12px", background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer" }}>×</button>
        </div>
      )}
      {message && (
        <div style={{ background: "#1f3b2a", color: "#6aaa64", padding: "10px 14px", borderRadius: "8px", marginBottom: "12px" }}>
          {message}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {(["seed", "gallery", "aliases", "ops"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #3a3a3c",
              background: tab === t ? "#2c2c2e" : "#1c1c1e",
              color: "#e8e8e8",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "seed" && (
        <>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} style={selectStyle}>
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.cca3} value={c.cca3}>{c.name}</option>
              ))}
            </select>
            <select value={clueTypeFilter} onChange={(e) => setClueTypeFilter(e.target.value)} style={selectStyle}>
              <option value="">All clue types</option>
              {ADMIN_CLUE_TYPES.map((clueType) => (
                <option key={clueType} value={clueType}>{clueType}</option>
              ))}
            </select>
            <button type="button" disabled={busy} onClick={() => void runImport()} style={btnStyle}>
              Import seed.ts
            </button>
            <button type="button" disabled={busy} onClick={() => void hydrateFromPuzzles()} style={btnStyle}>
              Sync from ag_puzzles
            </button>
            <button type="button" disabled={busy || loading || entries.length === 0} onClick={() => void resolveAllImages()} style={btnStyle}>
              Fetch all images
            </button>
            <button type="button" disabled={busy} onClick={() => void approveAllFlagsWithImages()} style={btnStyle}>
              Approve all flags with images
            </button>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) void proposeCountry(e.target.value);
                e.target.value = "";
              }}
              style={selectStyle}
              disabled={busy}
            >
              <option value="">LLM propose country…</option>
              {countries.map((c) => (
                <option key={c.cca3} value={c.cca3}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: "16px" }}>
            <div style={{ border: "1px solid #3a3a3c", borderRadius: "10px", overflow: "hidden" }}>
              {loading ? (
                <p style={{ padding: "16px", color: "#9aa0a6" }}>Loading…</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#1c1c1e", textAlign: "left" }}>
                      <th style={thStyle}>Country</th>
                      <th style={thStyle}>Clue</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Images</th>
                      <th style={thStyle} title={dailyRotationTitle}>Rotation</th>
                      <th style={thStyle} />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} style={{ borderTop: "1px solid #2c2c2e" }}>
                        <td style={tdStyle}>{e.country_common}</td>
                        <td style={tdStyle}>{e.clue_type}</td>
                        <td style={tdStyle}>
                          <span style={{ color: STATUS_COLORS[e.status] ?? "#9aa0a6" }}>{e.status}</span>
                        </td>
                        <td style={tdStyle}>{e.image_candidates.length}</td>
                        <td style={tdStyle} title={(e.daily_dates ?? []).join(", ") || dailyRotationTitle}>
                          {e.daily_dates && e.daily_dates.length > 0 ? (
                            <span style={{ color: "#c9b458" }}>{formatDailyRotation(e.daily_dates)}</span>
                          ) : (
                            <span style={{ color: "#787c7e" }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <button type="button" style={linkBtn} onClick={() => setSelected(e)}>Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selected && (
              <div
                style={{
                  border: "1px solid #3a3a3c",
                  borderRadius: "10px",
                  padding: "14px",
                  background: "#1c1c1e",
                  position: "sticky",
                  top: "24px",
                  alignSelf: "start",
                  height: "calc(100dvh - 48px)",
                  overflowY: "auto",
                }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                  {selected.country_common} · {selected.clue_type}
                </h3>
                {selected.daily_dates && selected.daily_dates.length > 0 && (
                  <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#c9b458" }}>
                    In daily rotation: {selected.daily_dates.join(", ")}
                    <span style={{ display: "block", color: "#9aa0a6", marginTop: "4px" }}>
                      Picker schedule for the current pool — not player play history.
                    </span>
                  </p>
                )}
                <label style={labelStyle}>
                  Wikipedia title
                  <input
                    value={selected.wiki_title ?? ""}
                    onChange={(ev) => setSelected({ ...selected, wiki_title: ev.target.value })}
                    style={inputStyle}
                  />
                </label>
                {selected.clue_type === "written_language" && (
                  <label style={labelStyle}>
                    Text content
                    <input
                      value={selected.text_content ?? ""}
                      onChange={(ev) => setSelected({ ...selected, text_content: ev.target.value })}
                      style={inputStyle}
                    />
                  </label>
                )}
                <label style={labelStyle}>
                  Status
                  <select
                    value={selected.status}
                    onChange={(ev) => setSelected({ ...selected, status: ev.target.value })}
                    style={inputStyle}
                  >
                    {Object.keys(STATUS_COLORS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0" }}>
                  <button type="button" disabled={busy} style={btnStyle} onClick={() => void patchEntry(selected.id, {
                    wiki_title: selected.wiki_title,
                    text_content: selected.text_content,
                    status: selected.status,
                  })}>
                    Save
                  </button>
                  <button type="button" disabled={busy} style={btnStyle} onClick={() => void resolveImages(selected)}>
                    {selected.clue_type === "flag" ? "Source from flagcdn" : "Fetch images"}
                  </button>
                  {selected.clue_type === "flag" && (
                    <button type="button" disabled={busy} style={btnStyle} onClick={() => void sourceFlagFromCdn(selected)}>
                      Refresh flagcdn
                    </button>
                  )}
                  <button type="button" disabled={busy} style={btnStyle} onClick={() => void patchEntry(selected.id, { status: "approved" })}>
                    Approve
                  </button>
                  <button type="button" disabled={busy} style={btnStyle} onClick={() => void patchEntry(selected.id, { status: "rejected" })}>
                    Reject
                  </button>
                </div>
                {selected.clue_type !== "written_language" && (
                  <div style={{ marginBottom: "12px" }}>
                    <label style={labelStyle}>
                      Add image URL
                      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        <input
                          value={manualImageUrl}
                          onChange={(ev) => setManualImageUrl(ev.target.value)}
                          placeholder="https://..."
                          style={{ ...inputStyle, marginTop: 0 }}
                        />
                        <button
                          type="button"
                          disabled={busy || !manualImageUrl.trim()}
                          style={btnStyle}
                          onClick={() => void addImageUrlToSelected()}
                        >
                          Add URL
                        </button>
                      </div>
                    </label>
                  </div>
                )}
                {selected.vision_notes && (
                  <pre style={{ fontSize: "11px", color: "#9aa0a6", whiteSpace: "pre-wrap" }}>{selected.vision_notes}</pre>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                  {selected.image_candidates.slice(0, 6).map((c, i) => (
                    <button
                      key={c.image_url}
                      type="button"
                      onClick={() =>
                        void patchEntry(
                          selected.id,
                          { selected_candidate_index: i },
                          { refreshList: false },
                        )
                      }
                      style={{ border: selected.selected_candidate_index === i ? "2px solid #6aaa64" : "1px solid #3a3a3c", borderRadius: "8px", padding: 0, overflow: "hidden", background: "#121213", cursor: "pointer" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.thumb_url ?? c.image_url} alt="" style={{ width: "100%", height: "80px", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "gallery" && (
        <div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} style={selectStyle}>
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.cca3} value={c.cca3}>{c.name}</option>
              ))}
            </select>
            <select value={clueTypeFilter} onChange={(e) => setClueTypeFilter(e.target.value)} style={selectStyle}>
              <option value="">All clue types</option>
              {ADMIN_CLUE_TYPES.map((clueType) => (
                <option key={clueType} value={clueType}>{clueType}</option>
              ))}
            </select>
            <button type="button" disabled={busy || loading || entries.length === 0} onClick={() => void resolveAllImages()} style={btnStyle}>
              Fetch all images
            </button>
            <button type="button" disabled={busy} onClick={() => void hydrateFromPuzzles()} style={btnStyle}>
              Sync from ag_puzzles
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#9aa0a6" }}>Loading gallery…</p>
          ) : entries.length === 0 ? (
            <p style={{ color: "#9aa0a6" }}>No seed entries match current filters.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    border: "1px solid #3a3a3c",
                    borderRadius: "10px",
                    background: "#1c1c1e",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "14px" }}>{entry.country_common}</strong>
                    <span style={{ color: STATUS_COLORS[entry.status] ?? "#9aa0a6", fontSize: "12px" }}>
                      {entry.status}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#9aa0a6", marginBottom: "8px" }}>
                    {entry.clue_type} · {entry.image_candidates.length} image{entry.image_candidates.length === 1 ? "" : "s"}
                    {entry.daily_dates && entry.daily_dates.length > 0 && (
                      <span style={{ color: "#c9b458" }}> · rotation {formatDailyRotation(entry.daily_dates)}</span>
                    )}
                  </div>

                  {entry.image_candidates.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "#9aa0a6", margin: 0 }}>No images yet.</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" }}>
                      {entry.image_candidates.map((candidate, index) => (
                        <button
                          key={`${entry.id}-${candidate.image_url}-${index}`}
                          type="button"
                          onClick={() => setSelected(entry)}
                          title={candidate.image_url}
                          style={{
                            border:
                              entry.selected_candidate_index === index
                                ? "2px solid #6aaa64"
                                : "1px solid #3a3a3c",
                            borderRadius: "8px",
                            padding: 0,
                            overflow: "hidden",
                            background: "#121213",
                            cursor: "pointer",
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.thumb_url ?? candidate.image_url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "74px",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "aliases" && (
        <div style={{ maxWidth: "640px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <select value={aliasCca3} onChange={(e) => setAliasCca3(e.target.value)} style={selectStyle}>
              {countries.map((c) => (
                <option key={c.cca3} value={c.cca3}>{c.name} ({c.cca3})</option>
              ))}
            </select>
            <input value={aliasText} onChange={(e) => setAliasText(e.target.value)} placeholder="Alias" style={{ ...inputStyle, flex: 1 }} />
            <button type="button" disabled={busy} onClick={() => void addAlias()} style={btnStyle}>Add</button>
            <button type="button" disabled={busy} onClick={() => void seedDefaultAliases()} style={btnStyle}>Seed defaults</button>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {aliases.map((a) => (
              <li key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid #2c2c2e", fontSize: "14px" }}>
                <strong>{a.alias}</strong> → {a.cca3}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "ops" && (
        <div style={{ maxWidth: "720px" }}>
          <button type="button" disabled={busy} onClick={() => void runGenerate()} style={{ ...btnStyle, marginBottom: "16px" }}>
            {busy ? "Running…" : "Generate all puzzles"}
          </button>
          <p style={{ color: "#9aa0a6", fontSize: "13px", marginBottom: "16px" }}>
            Builds <code style={{ color: "#c9b458" }}>ag_puzzles</code> rows from countries where all 9 clue types are <strong style={{ color: "#e8e8e8", fontWeight: 600 }}>approved</strong> in the Seed tab (flag, currency, jersey, brand, landmark, language, person, food, environment). Each approved country becomes one playable puzzle in the daily pool.
          </p>
          {readiness && (
            <div style={{ marginBottom: "16px", fontSize: "13px", color: "#9aa0a6" }}>
              <div>
                Ready for generation:{" "}
                <span style={{ color: readiness.readyCountries > 0 ? "#6aaa64" : "#c9b458" }}>
                  {readiness.readyCountries}/{readiness.totalCountries} countries
                </span>
              </div>
              {readiness.blocked.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                  {readiness.blocked.map((row) => (
                    <li key={row.cca3} style={{ marginBottom: "4px" }}>
                      <strong style={{ color: "#e8e8e8" }}>{row.country}</strong>:{" "}
                      {row.missing.slice(0, 4).join(", ")}
                      {row.missing.length > 4 ? ` +${row.missing.length - 4} more` : ""}
                    </li>
                  ))}
                  {readiness.totalCountries - readiness.readyCountries > readiness.blocked.length && (
                    <li>…and {readiness.totalCountries - readiness.readyCountries - readiness.blocked.length} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
          {coverage.length > 0 && (
            <div style={{ border: "1px solid #3a3a3c", borderRadius: "10px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#1c1c1e", textAlign: "left" }}>
                    <th style={thStyle}>Country</th>
                    <th style={thStyle}>Clue</th>
                    <th style={thStyle}>Issue</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((g, i) => (
                    <tr key={`${g.cca3}-${g.clueType}-${i}`} style={{ borderTop: "1px solid #2c2c2e" }}>
                      <td style={tdStyle}>{g.country}</td>
                      <td style={tdStyle}>{g.clueType}</td>
                      <td style={tdStyle}>{g.issue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}

const selectStyle: CSSProperties = {
  background: "#1c1c1e",
  color: "#e8e8e8",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "8px 10px",
};

const btnStyle: CSSProperties = {
  background: "#2c2c2e",
  color: "#e8e8e8",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "8px 12px",
  cursor: "pointer",
};

const linkBtn: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#5bc0de",
  cursor: "pointer",
  padding: 0,
};

const thStyle: CSSProperties = { padding: "10px 12px", color: "#9aa0a6", fontWeight: 600 };
const tdStyle: CSSProperties = { padding: "10px 12px" };
const labelStyle: CSSProperties = { display: "block", fontSize: "12px", color: "#9aa0a6", marginBottom: "10px" };
const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "4px",
  background: "#121213",
  color: "#e8e8e8",
  border: "1px solid #3a3a3c",
  borderRadius: "8px",
  padding: "8px 10px",
};
