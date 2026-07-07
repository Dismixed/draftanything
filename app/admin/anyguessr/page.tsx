"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { SEED } from "@/lib/anyguessr/seed";

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

type Tab = "seed" | "aliases" | "ops";

export default function AdminAnyGuessrPage() {
  const [tab, setTab] = useState<Tab>("seed");
  const [entries, setEntries] = useState<SeedEntry[]>([]);
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [selected, setSelected] = useState<SeedEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<CoverageGap[]>([]);

  const [aliasCca3, setAliasCca3] = useState("NLD");
  const [aliasText, setAliasText] = useState("");

  const countries = useMemo(() => SEED.map((s) => ({ cca3: s.cca3, name: s.common })), []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (countryFilter) params.set("cca3", countryFilter);
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
      setLoading(false);
    }
  }, [statusFilter, countryFilter]);

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
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function runGenerate() {
    setBusy(true);
    setMessage(null);
    setCoverage([]);
    try {
      const res = await fetch("/api/admin/anyguessr/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generate failed");
      const g = data.generate;
      setMessage(`Generated ${g.succeeded}/${g.total} puzzles`);
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
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Propose failed");
    } finally {
      setBusy(false);
    }
  }

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
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image resolve failed");
    } finally {
      setBusy(false);
    }
  }

  async function patchEntry(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/anyguessr/seed/${id}`, {
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
      subtitle="Review seed entries, resolve images, manage aliases, and regenerate puzzles."
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
        {(["seed", "aliases", "ops"] as Tab[]).map((t) => (
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
            <button type="button" disabled={busy} onClick={() => void runImport()} style={btnStyle}>
              Import seed.ts
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
              <div style={{ border: "1px solid #3a3a3c", borderRadius: "10px", padding: "14px", background: "#1c1c1e" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "16px" }}>
                  {selected.country_common} · {selected.clue_type}
                </h3>
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
                    Fetch images
                  </button>
                  <button type="button" disabled={busy} style={btnStyle} onClick={() => void patchEntry(selected.id, { status: "approved" })}>
                    Approve
                  </button>
                  <button type="button" disabled={busy} style={btnStyle} onClick={() => void patchEntry(selected.id, { status: "rejected" })}>
                    Reject
                  </button>
                </div>
                {selected.vision_notes && (
                  <pre style={{ fontSize: "11px", color: "#9aa0a6", whiteSpace: "pre-wrap" }}>{selected.vision_notes}</pre>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
                  {selected.image_candidates.slice(0, 6).map((c, i) => (
                    <button
                      key={c.image_url}
                      type="button"
                      onClick={() => void patchEntry(selected.id, { selected_candidate_index: i })}
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
            Regenerates puzzles from approved seed entries (with seed.ts fallback). Returns a coverage report of missing images.
          </p>
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
