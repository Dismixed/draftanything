"use client";

import { useCallback, useState } from "react";
import type { PickingMode, SafeItem, SafePick } from "@/features/draft/types";

interface AvailablePoolProps {
  items: SafeItem[];
  myPlayerId: string;
  currentPlayerId: string;
  draftId: string;
  currentPickIndex: number;
  picks: SafePick[];
  pickingMode?: PickingMode;
}

export function AvailablePool({
  items,
  myPlayerId,
  currentPlayerId,
  draftId,
  currentPickIndex,
  picks,
  pickingMode,
}: AvailablePoolProps) {
  if (pickingMode === "off_the_dome") return null;
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
      className="panel-card"
      style={{ padding: '16px' }}
    >
      <h2
        style={{
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          marginBottom: '12px',
          margin: '0 0 12px 0',
        }}
      >
        Available Pool ({availableItems.length})
      </h2>

      {error && (
        <p
          style={{ color: '#ff4d4d', fontSize: '12px', marginBottom: '8px' }}
          role="alert"
        >
          {error}
        </p>
      )}

      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '7px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
        }}
      >
        {availableItems.map((item) => {
          const isPicking = pickingItemId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handlePick(item.id)}
                disabled={!isMyTurn || isPicking}
                className={`pick-card${isPicking ? ' active' : ''}${!isMyTurn ? ' disabled' : ''}`}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                aria-busy={isPicking}
              >
                <span>{item.name}</span>
                {isPicking && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'var(--gold)',
                      flexShrink: 0,
                      marginLeft: '6px',
                    }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {availableItems.length === 0 && (
        <p
          style={{
            color: 'var(--text-dim)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          No items available
        </p>
      )}
    </section>
  );
}
