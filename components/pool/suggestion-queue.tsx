"use client";

import { useState } from "react";
import type { PoolProjection, PoolSuggestion } from "@/features/pool/service";

interface SuggestionQueueProps {
  draftId: string;
  myPlayerId: string;
  isHost: boolean;
  suggestions: PoolSuggestion[];
  onSuggestionsChange: (suggestions: PoolSuggestion[]) => void;
  pool: PoolProjection | null;
  // pool is used for context; keeping param for future use
}

export function SuggestionQueue({
  draftId,
  isHost,
  suggestions,
  onSuggestionsChange,
}: SuggestionQueueProps) {
  const [suggestName, setSuggestName] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        // Accept returns pool projection
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
    <div className="bg-white rounded-xl border p-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-900">Suggestions</h2>

      {/* Submit suggestion form (non-host) */}
      {!isHost && (
        <div className="flex gap-2">
          <input
            type="text"
            value={suggestName}
            onChange={(e) => setSuggestName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmitAdd();
            }}
            placeholder="Suggest an item…"
            className="flex-1 border rounded px-2 py-1.5 text-sm"
            aria-label="Suggest item name"
          />
          <button
            type="button"
            onClick={() => void handleSubmitAdd()}
            disabled={submitting || !suggestName.trim()}
            className="bg-amber-600 text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-amber-700 disabled:opacity-40 transition-colors"
          >
            Suggest
          </button>
        </div>
      )}

      {/* Pending suggestions */}
      {pending.length === 0 ? (
        <p className="text-xs text-gray-400">No pending suggestions.</p>
      ) : (
        <ul className="divide-y" role="list">
          {pending.map((s) => (
            <li key={s.id} className="py-2 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs uppercase font-semibold text-gray-400">
                  {s.action === "add" ? "Add" : "Remove"}
                </span>
                <p className="text-sm truncate">
                  {s.action === "add" ? s.suggestedName : `Remove item`}
                </p>
              </div>
              {isHost && (
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleAccept(s.id)}
                    className="text-xs text-green-600 hover:underline"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReject(s.id)}
                    className="text-xs text-red-600 hover:underline"
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
        <details className="text-xs">
          <summary className="text-gray-400 cursor-pointer">
            {resolved.length} resolved
          </summary>
          <ul className="mt-2 space-y-1">
            {resolved.map((s) => (
              <li key={s.id} className="flex gap-2">
                <span
                  className={
                    s.status === "accepted" ? "text-green-600" : "text-red-600"
                  }
                >
                  {s.status === "accepted" ? "Accepted" : "Rejected"}
                </span>
                <span className="text-gray-500 truncate">
                  {s.action === "add" ? s.suggestedName : "Remove"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
