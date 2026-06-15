"use client";

import { useCallback, useState } from "react";
import type { SafeItem, SafePick } from "@/features/draft/types";

interface AvailablePoolProps {
  items: SafeItem[];
  myPlayerId: string;
  currentPlayerId: string;
  draftId: string;
  currentPickIndex: number;
  picks: SafePick[];
}

export function AvailablePool({
  items,
  myPlayerId,
  currentPlayerId,
  draftId,
  currentPickIndex,
  picks,
}: AvailablePoolProps) {
  const [pickingItemId, setPickingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickedItemIds = new Set(picks.map((p) => p.itemId));
  const isMyTurn = myPlayerId === currentPlayerId;
  const availableItems = items.filter(
    (item) => item.isAvailable && !pickedItemIds.has(item.id),
  );

  const handlePick = useCallback(
    async (itemId: string) => {
      if (!isMyTurn || pickingItemId) return;
      setPickingItemId(itemId);
      setError(null);

      try {
        const res = await fetch(`/api/drafts/${draftId}/pick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            expectedPick: currentPickIndex,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.message ?? "Pick failed");
        }
      } catch {
        setError("Network error - pick may have failed");
      } finally {
        setPickingItemId(null);
      }
    },
    [isMyTurn, pickingItemId, draftId, currentPickIndex],
  );

  return (
    <section
      aria-label="Available items to pick"
      className="bg-white rounded-xl border p-4"
    >
      <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
        Available Pool ({availableItems.length})
      </h2>

      {error && (
        <p className="text-sm text-red-600 mb-2" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-2">
        {availableItems.map((item) => {
          const isPicking = pickingItemId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handlePick(item.id)}
                disabled={!isMyTurn || isPicking}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  isMyTurn && !isPicking
                    ? "hover:bg-indigo-50 border-indigo-200 cursor-pointer"
                    : "opacity-60 cursor-not-allowed border-gray-200"
                } ${isPicking ? "bg-indigo-100" : ""}`}
                aria-busy={isPicking}
              >
                <span className="flex items-center justify-between">
                  <span>{item.name}</span>
                  {isPicking && (
                    <span className="text-xs text-indigo-600">Picking...</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {availableItems.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No items available
        </p>
      )}
    </section>
  );
}
