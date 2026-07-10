"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import type { CategoryWithItems, ImageCandidate, ItemRow } from "@/lib/hot-takes/types";
import { HOT_TAKES_ITEM_COUNT } from "@/lib/hot-takes/types";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface ScheduleRow {
  id: string;
  publish_date: string;
  category_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#787c7e",
  needs_items: "#c9b458",
  needs_review: "#5bc0de",
  approved: "#6aaa64",
  rejected: "#ff6b6b",
  used: "#a855f7",
  needs_image: "#c9b458",
};

type Tab = "categories" | "schedule";

const selectStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #3a3a3c",
  background: "#1c1c1e",
  color: "#e8e8e8",
};

export default function AdminHotTakesPage() {
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [selected, setSelected] = useState<CategoryWithItems | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [newName, setNewName] = useState("");
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduleCategoryId, setScheduleCategoryId] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");

  const fetchCategories = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/hot-takes/categories?${params}`);
    if (res.status === 403) {
      setError("Session expired — refresh or sign in again.");
      return;
    }
    if (!res.ok) throw new Error("Failed to load categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  }, [statusFilter]);

  const fetchCategory = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/hot-takes/categories/${id}`);
    if (!res.ok) throw new Error("Failed to load category");
    const data = await res.json();
    setSelected(data.category ?? null);
  }, []);

  const fetchSchedule = useCallback(async () => {
    const res = await fetch("/api/admin/hot-takes/schedule");
    if (!res.ok) throw new Error("Failed to load schedule");
    const data = await res.json();
    setSchedule(data.schedule ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCategories(), fetchSchedule()])
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [fetchCategories, fetchSchedule]);

  useEffect(() => {
    void fetchCategories().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load categories"),
    );
  }, [fetchCategories]);

  async function createCategory(proposeItems: boolean) {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/hot-takes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), propose_items: proposeItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create category");
      setNewName("");
      setMessage(proposeItems ? "Category created with LLM items" : "Category created");
      await fetchCategories();
      if (data.category?.id) await fetchCategory(data.category.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function importLegacy() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/hot-takes/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_legacy" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setMessage(`Imported ${data.imported} categories (${data.skipped} skipped)`);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function proposeItems(categoryId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hot-takes/categories/${categoryId}/propose`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Propose failed");
      setMessage(`Proposed ${data.items?.length ?? 0} items`);
      await fetchCategory(categoryId);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Propose failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateCategoryStatus(categoryId: string, status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hot-takes/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.issues?.join(", ") ?? data.error ?? "Update failed");
      setMessage(`Category marked ${status}`);
      await fetchCategory(categoryId);
      await fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateItem(itemId: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/hot-takes/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Item update failed");
    return data.item as ItemRow;
  }

  async function fetchImages(item: ItemRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hot-takes/items/${item.id}/images`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Image fetch failed");
      setMessage(`Found ${data.candidateCount} candidates for ${item.label}`);
      if (selected) await fetchCategory(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image fetch failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateIcon(item: ItemRow) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hot-takes/items/${item.id}/generate-icon`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generate failed");
      setMessage(`Generated icon for ${item.label}`);
      if (selected) await fetchCategory(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function selectCandidate(item: ItemRow, index: number) {
    const candidate = item.image_candidates[index];
    if (!candidate) return;
    setBusy(true);
    try {
      await updateItem(item.id, {
        selected_candidate_index: index,
        image_url: candidate.image_url,
        image_source: candidate.source === "generated" ? "generated" : "wikimedia",
        status: "needs_review",
      });
      if (selected) await fetchCategory(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Select failed");
    } finally {
      setBusy(false);
    }
  }

  async function approveItem(item: ItemRow) {
    setBusy(true);
    try {
      await updateItem(item.id, { status: "approved" });
      if (selected) await fetchCategory(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function addManualImage(item: ItemRow) {
    if (!manualImageUrl.trim()) return;
    setBusy(true);
    try {
      const candidate: ImageCandidate = {
        image_url: manualImageUrl.trim(),
        thumb_url: manualImageUrl.trim(),
        source: "manual",
      };
      const candidates = [candidate, ...item.image_candidates];
      await updateItem(item.id, {
        image_candidates: candidates,
        selected_candidate_index: 0,
        image_url: candidate.image_url,
        image_source: "manual",
        status: "needs_review",
      });
      setManualImageUrl("");
      if (selected) await fetchCategory(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual URL failed");
    } finally {
      setBusy(false);
    }
  }

  async function assignSchedule() {
    if (!scheduleCategoryId || !scheduleDate) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/hot-takes/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: scheduleCategoryId, date: scheduleDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Schedule failed");
      setMessage(`Scheduled for ${scheduleDate}`);
      await fetchSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  }

  async function autoSchedule() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/hot-takes/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Auto-schedule failed");
      setMessage(`Scheduled ${data.scheduled} categories`);
      await fetchSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-schedule failed");
    } finally {
      setBusy(false);
    }
  }

  const approvedCategories = categories.filter((c) => c.status === "approved");

  return (
    <AdminShell
      title="Hot Takes"
      subtitle="Propose tier-list categories, source or generate item icons, approve, and schedule dailies."
      maxWidth={1100}
    >
      {error && (
        <div style={{ background: "#3b1f1f", color: "#ff6b6b", padding: "10px 14px", borderRadius: 8, marginBottom: 12 }}>
          {error}
          <button type="button" onClick={() => setError(null)} style={{ marginLeft: 12, background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer" }}>×</button>
        </div>
      )}
      {message && (
        <div style={{ background: "#1f3b2a", color: "#6aaa64", padding: "10px 14px", borderRadius: 8, marginBottom: 12 }}>{message}</div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["categories", "schedule"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
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

      {tab === "categories" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All statuses</option>
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              style={{ ...selectStyle, minWidth: 220 }}
            />
            <button type="button" disabled={busy} onClick={() => createCategory(false)} style={btnStyle}>Create</button>
            <button type="button" disabled={busy} onClick={() => createCategory(true)} style={btnStyle}>Create + LLM items</button>
            <button type="button" disabled={busy} onClick={importLegacy} style={btnStyle}>Import legacy seed</button>
          </div>

          {loading ? (
            <p style={{ color: "#787c7e" }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.2fr" : "1fr", gap: 16 }}>
              <div>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => fetchCategory(cat.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 14px",
                      marginBottom: 8,
                      borderRadius: 8,
                      border: selected?.id === cat.id ? "1px solid #ff5a36" : "1px solid #3a3a3c",
                      background: "#1c1c1e",
                      color: "#e8e8e8",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{cat.name}</div>
                    <div style={{ fontSize: 12, color: STATUS_COLORS[cat.status] ?? "#787c7e", marginTop: 4 }}>{cat.status}</div>
                  </button>
                ))}
              </div>

              {selected && (
                <div style={{ background: "#1c1c1e", border: "1px solid #3a3a3c", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                    <div>
                      <h2 style={{ margin: "0 0 4px", fontSize: 18 }}>{selected.name}</h2>
                      <div style={{ fontSize: 12, color: "#787c7e" }}>
                        {selected.items.length}/{HOT_TAKES_ITEM_COUNT} items · {selected.status}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" disabled={busy} onClick={() => proposeItems(selected.id)} style={btnStyle}>Propose items</button>
                      <button type="button" disabled={busy} onClick={() => updateCategoryStatus(selected.id, "approved")} style={btnStyle}>Approve category</button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 12 }}>
                    {selected.items.map((item) => (
                      <div key={item.id} style={{ border: "1px solid #2a2a2c", borderRadius: 8, padding: 10 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                          {item.image_url ? (
                            <img src={item.image_url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 44, height: 44, borderRadius: 8, background: "#2a2a2c" }} />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: STATUS_COLORS[item.status] ?? "#787c7e" }}>
                              {item.status}{item.wiki_title ? ` · ${item.wiki_title}` : ""}
                            </div>
                          </div>
                          <button type="button" disabled={busy} onClick={() => fetchImages(item)} style={btnStyle}>Fetch</button>
                          <button type="button" disabled={busy} onClick={() => generateIcon(item)} style={btnStyle}>Generate</button>
                          <button type="button" disabled={busy} onClick={() => approveItem(item)} style={btnStyle}>Approve</button>
                        </div>

                        {item.image_candidates.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                            {item.image_candidates.map((c, idx) => (
                              <button
                                key={`${c.image_url}-${idx}`}
                                type="button"
                                onClick={() => selectCandidate(item, idx)}
                                style={{
                                  padding: 0,
                                  border: idx === item.selected_candidate_index ? "2px solid #ff5a36" : "1px solid #3a3a3c",
                                  borderRadius: 6,
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                <img src={c.thumb_url ?? c.image_url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, display: "block" }} />
                              </button>
                            ))}
                          </div>
                        )}

                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            value={manualImageUrl}
                            onChange={(e) => setManualImageUrl(e.target.value)}
                            placeholder="https:// image URL"
                            style={{ ...selectStyle, flex: 1, fontSize: 12 }}
                          />
                          <button type="button" disabled={busy} onClick={() => addManualImage(item)} style={btnStyle}>Add URL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "schedule" && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} style={selectStyle} />
            <select value={scheduleCategoryId} onChange={(e) => setScheduleCategoryId(e.target.value)} style={selectStyle}>
              <option value="">Approved category…</option>
              {approvedCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" disabled={busy} onClick={assignSchedule} style={btnStyle}>Assign date</button>
            <button type="button" disabled={busy} onClick={autoSchedule} style={btnStyle}>Auto-fill approved</button>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {schedule.map((row) => {
              const cat = categories.find((c) => c.id === row.category_id);
              return (
                <div key={row.id} style={{ padding: "10px 12px", background: "#1c1c1e", borderRadius: 8, border: "1px solid #3a3a3c" }}>
                  <strong>{row.publish_date}</strong>
                  <span style={{ color: "#787c7e" }}> — {cat?.name ?? row.category_id}</span>
                </div>
              );
            })}
            {schedule.length === 0 && <p style={{ color: "#787c7e" }}>No scheduled dates yet.</p>}
          </div>
        </>
      )}
    </AdminShell>
  );
}

const btnStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #3a3a3c",
  background: "#2c2c2e",
  color: "#e8e8e8",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};
