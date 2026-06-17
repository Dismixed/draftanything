"use client";

import { useState } from "react";
import type { PoolProjection } from "@/features/pool/service";

interface PoolEditorProps {
  pool: PoolProjection;
  draftId: string;
  myPlayerId: string;
  isHost: boolean;
  search: string;
  onPoolChange: (pool: PoolProjection) => void;
}

export function PoolEditor({ pool, draftId, isHost, search, onPoolChange }: PoolEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const filteredItems = search
    ? pool.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      )
    : pool.items;

  async function handleRemove(itemId: string) {
    const res = await fetch(`/api/drafts/${draftId}/pool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-item", itemId }),
    });
    if (res.ok) {
      const data: PoolProjection = await res.json();
      onPoolChange(data);
    }
  }

  async function handleEdit(itemId: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/drafts/${draftId}/pool`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit-item", itemId, name: editName.trim() }),
    });
    if (res.ok) {
      const data: PoolProjection = await res.json();
      onPoolChange(data);
      setEditingId(null);
      setEditName("");
    }
  }

  async function handleSuggestRemove(itemId: string) {
    await fetch(`/api/drafts/${draftId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit",
        suggestionAction: "remove",
        targetItemId: itemId,
      }),
    });
  }

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border-hi)', position: 'relative' }}>
      {filteredItems.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
          {search ? "No items match your search." : "No items in the pool yet. Generate with AI or add manually."}
        </div>
      ) : (
        <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {filteredItems.map((item) => (
            <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', width: '40px', flexShrink: 0 }}>
                {item.source === "ai" ? "AI" : "Manual"}
              </span>
              {editingId === item.id && isHost ? (
                <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleEdit(item.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="da-input"
                    style={{ flex: 1 }}
                    autoFocus
                    aria-label="Edit item name"
                  />
                  <button
                    type="button"
                    onClick={() => void handleEdit(item.id)}
                    className="btn-ghost"
                    style={{ width: 'auto', padding: '4px 10px', fontSize: '11px' }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="btn-ghost"
                    style={{ width: 'auto', padding: '4px 10px', fontSize: '11px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text)', flex: 1 }}>{item.name}</span>
              )}

              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                {item.metadata.categories} stats
              </span>

              {isHost && editingId !== item.id && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                    }}
                    style={{ color: 'var(--gold)', fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none' }}
                    aria-label={`Edit ${item.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item.id)}
                    style={{ color: '#ff4d4d', fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none' }}
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </div>
              )}

              {!isHost && (
                <button
                  type="button"
                  onClick={() => void handleSuggestRemove(item.id)}
                  style={{ color: 'var(--cyan)', fontSize: '11px', cursor: 'pointer', background: 'none', border: 'none' }}
                  aria-label={`Suggest removing ${item.name}`}
                >
                  Suggest remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
