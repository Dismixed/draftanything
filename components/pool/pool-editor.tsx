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
    <div className="bg-white rounded-xl border">
      {filteredItems.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">
          {search ? "No items match your search." : "No items in the pool yet. Generate with AI or add manually."}
        </div>
      ) : (
        <ul className="divide-y" role="list">
          {filteredItems.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xs uppercase font-semibold text-gray-400 w-10 flex-shrink-0">
                {item.source === "ai" ? "AI" : "Manual"}
              </span>
              {editingId === item.id && isHost ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleEdit(item.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    autoFocus
                    aria-label="Edit item name"
                  />
                  <button
                    type="button"
                    onClick={() => void handleEdit(item.id)}
                    className="text-xs bg-indigo-600 text-white rounded px-2 py-1"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-gray-500 underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span className="flex-1 text-sm font-medium">{item.name}</span>
              )}

              <span className="text-xs text-gray-400">
                {item.metadata.categories} stats
              </span>

              {isHost && editingId !== item.id && (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                    }}
                    className="text-xs text-indigo-600 hover:underline"
                    aria-label={`Edit ${item.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item.id)}
                    className="text-xs text-red-600 hover:underline"
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
                  className="text-xs text-amber-600 hover:underline"
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
