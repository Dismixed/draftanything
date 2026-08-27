"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { CATEGORIES } from "@/lib/ball-knowledge/categories";

interface ScheduleRow {
  id: string;
  publish_date: string;
  category: string;
}

export default function AdminBallKnowledgePage() {
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [assignCategory, setAssignCategory] = useState("");
  const [assignDate, setAssignDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ball-knowledge/schedule");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- matches existing admin pages
    void fetchSchedule().finally(() => setLoading(false));
  }, [fetchSchedule]);

  const lastUsedByCategory = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of schedule) {
      const prev = map.get(row.category);
      if (!prev || row.publish_date > prev) {
        map.set(row.category, row.publish_date);
      }
    }
    return map;
  }, [schedule]);

  async function assignSchedule() {
    if (!assignCategory || !assignDate) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ball-knowledge/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: assignCategory, date: assignDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Schedule failed");
      setMessage(`Scheduled "${assignCategory}" for ${assignDate}.`);
      setAssignCategory("");
      await fetchSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setBusy(false);
    }
  }

  async function autoSchedule() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ball-knowledge/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Auto-schedule failed");
      const data = await res.json();
      setMessage(`Scheduled ${data.scheduled} category entries.`);
      await fetchSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-schedule failed");
    } finally {
      setBusy(false);
    }
  }

  const upcoming = [...schedule].sort((a, b) =>
    a.publish_date.localeCompare(b.publish_date),
  );

  return (
    <AdminShell
      title="Ball Knowledge"
      subtitle="Daily category rotation — LRU scheduling so a category doesn't repeat until the pool cycles."
      maxWidth={900}
    >
      {error && (
        <div style={{ background: "#3b1f1f", color: "#ff6b6b", padding: "10px 14px", borderRadius: 8, marginBottom: 12 }}>
          {error}
          <button type="button" onClick={() => setError(null)} style={{ marginLeft: 12, background: "transparent", border: "none", color: "#ff6b6b", cursor: "pointer" }}>×</button>
        </div>
      )}
      {message && (
        <div style={{ background: "#1f3b2a", color: "#6aaa64", padding: "10px 14px", borderRadius: 8, marginBottom: 12 }}>
          {message}
          <button type="button" onClick={() => setMessage(null)} style={{ marginLeft: 12, background: "transparent", border: "none", color: "#6aaa64", cursor: "pointer" }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <input
          type="date"
          value={assignDate}
          onChange={(e) => setAssignDate(e.target.value)}
          style={inputStyle}
        />
        <select value={assignCategory} onChange={(e) => setAssignCategory(e.target.value)} style={inputStyle}>
          <option value="">Category…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="button" disabled={busy || !assignCategory} onClick={assignSchedule} style={btnStyle}>
          Assign date
        </button>
        <button type="button" disabled={busy} onClick={autoSchedule} style={{ ...btnStyle, background: "#ff6b1a", color: "#121213" }}>
          Auto-fill (LRU)
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section style={cardStyle}>
          <h3 style={sectionTitle}>Upcoming schedule</h3>
          {loading ? (
            <p style={muted}>Loading…</p>
          ) : upcoming.length === 0 ? (
            <p style={muted}>No categories scheduled yet.</p>
          ) : (
            upcoming.map((row) => (
              <div key={row.id} style={rowStyle}>
                <strong>{row.publish_date}</strong>
                <span style={{ color: "#ff6b1a" }}>{row.category}</span>
              </div>
            ))
          )}
        </section>

        <section style={cardStyle}>
          <h3 style={sectionTitle}>Category pool ({CATEGORIES.length})</h3>
          {CATEGORIES.map((cat) => {
            const lastUsed = lastUsedByCategory.get(cat);
            return (
              <div key={cat} style={rowStyle}>
                <span style={{ color: "#e8e8e8" }}>{cat}</span>
                <span style={muted}>{lastUsed ? `last used ${lastUsed}` : "never used"}</span>
              </div>
            );
          })}
        </section>
      </div>
    </AdminShell>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #3a3a3c",
  background: "#1c1c1e",
  color: "#e8e8e8",
  fontSize: 13,
};

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

const cardStyle: React.CSSProperties = {
  background: "#1c1c1e",
  border: "1px solid #3a3a3c",
  borderRadius: 10,
  padding: 16,
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 700,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 0",
  borderBottom: "1px solid #2a2a2c",
  fontSize: 13,
};

const muted: React.CSSProperties = { color: "#787c7e", fontSize: 12 };
