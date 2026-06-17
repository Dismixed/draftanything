"use client";

import { useState } from "react";
import type { PoolProjection, PoolSuggestion } from "@/features/pool/service";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

interface SuggestionQueueProps {
  draftId: string;
  myPlayerId: string;
  isHost: boolean;
  suggestions: PoolSuggestion[];
  onSuggestionsChange: (suggestions: PoolSuggestion[]) => void;
  pool: PoolProjection | null;
  onPoolChange?: (pool: PoolProjection) => void;
}

export function SuggestionQueue({
  draftId,
  isHost,
  suggestions,
  onSuggestionsChange,
  pool,
  onPoolChange,
}: SuggestionQueueProps) {
  const [suggestName, setSuggestName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function suggestionLabel(s: PoolSuggestion): string {
    if (s.action === "add") return s.suggestedName ?? "";
    const item = pool?.items.find((i) => i.id === s.targetItemId);
    return item?.name ?? "Unknown item";
  }

  const pending = suggestions.filter((s) => s.status === "pending");
  const resolved = suggestions.filter((s) => s.status !== "pending");

  async function handleSubmitAdd() {
    if (!suggestName.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/drafts/${draftId}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          suggestionAction: "add",
          suggestedName: suggestName.trim(),
        }),
      });
      if (res.ok) {
        const data: PoolSuggestion[] = await res.json();
        onSuggestionsChange(data);
        setSuggestName("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept(suggestionId: string) {
    const res = await fetch(`/api/drafts/${draftId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", suggestionId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.items) {
        onPoolChange?.(data);
        onSuggestionsChange(
          suggestions.map((s) =>
            s.id === suggestionId ? { ...s, status: "accepted" as const } : s,
          ),
        );
      }
    }
  }

  async function handleReject(suggestionId: string) {
    const res = await fetch(`/api/drafts/${draftId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", suggestionId }),
    });
    if (res.ok) {
      onSuggestionsChange(
        suggestions.map((s) =>
          s.id === suggestionId ? { ...s, status: "rejected" as const } : s,
        ),
      );
    }
  }

  return (
    <div className="panel-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', margin: 0 }}>
        Suggestions
      </p>

      {/* Submit suggestion form (non-host) */}
      {!isHost && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={suggestName}
            onChange={(e) => setSuggestName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmitAdd();
            }}
            placeholder="Suggest an item…"
            className="da-input"
            style={{ flex: 1 }}
            aria-label="Suggest item name"
          />
          <button
            type="button"
            onClick={() => void handleSubmitAdd()}
            disabled={submitting || !suggestName.trim()}
            className="btn-gold"
            style={{ width: 'auto', padding: '8px 14px' }}
          >
            <ButtonLoadingLabel
              loading={submitting}
              label="Suggest"
              loadingLabel="Sending…"
            />
          </button>
        </div>
      )}

      {/* Pending suggestions */}
      {pending.length === 0 ? (
        <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: 0 }}>No pending suggestions.</p>
      ) : (
        <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {pending.map((s) => (
            <li key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                  {s.action === "add" ? "Add" : "Remove"}
                </span>
                <p style={{ color: 'var(--text)', fontSize: '13px', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {suggestionLabel(s)}
                </p>
              </div>
              {isHost && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => void handleAccept(s.id)}
                    style={{ color: 'var(--cyan)', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReject(s.id)}
                    style={{ color: '#ff4d4d', fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Resolved suggestions */}
      {resolved.length > 0 && (
        <details style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
          <summary style={{ cursor: 'pointer' }}>
            {resolved.length} resolved
          </summary>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {resolved.map((s) => (
              <li key={s.id} style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: s.status === "accepted" ? 'var(--cyan)' : '#ff4d4d' }}>
                  {s.status === "accepted" ? "Accepted" : "Rejected"}
                </span>
                <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {suggestionLabel(s)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
