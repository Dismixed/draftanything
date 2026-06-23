"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import type { PickingMode, SafeItem, SafePick } from "@/features/draft/types";
import { WATCHLIST_DRAG_MIME } from "@/features/draft/watchlist";

interface AvailablePoolProps {
  items: SafeItem[];
  myPlayerId: string;
  currentPlayerId: string;
  draftId: string;
  currentPickIndex: number;
  picks: SafePick[];
  pickingMode?: PickingMode;
  watchlistItemIds?: Set<string>;
  onAddToWatchlist?: (itemId: string, name: string) => void;
}

export function AvailablePool({
  items,
  myPlayerId,
  currentPlayerId,
  draftId,
  currentPickIndex,
  picks,
  pickingMode,
  watchlistItemIds,
  onAddToWatchlist,
}: AvailablePoolProps) {
  const [search, setSearch] = useState("");
  const [pickingItemId, setPickingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragStartedRef = useRef(false);

  const pickedItemIds = new Set(picks.map((p) => p.itemId));
  const isMyTurn = myPlayerId === currentPlayerId;

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

  const handleDragStart = useCallback((item: SafeItem, e: DragEvent<HTMLButtonElement>) => {
    dragStartedRef.current = true;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      WATCHLIST_DRAG_MIME,
      JSON.stringify({ itemId: item.id, name: item.name }),
    );
    e.dataTransfer.setData("text/plain", item.name);
  }, []);

  const handleDragEnd = useCallback(() => {
    window.setTimeout(() => {
      dragStartedRef.current = false;
    }, 0);
  }, []);

  if (pickingMode === "off_the_dome") return null;

  const availableItems = items.filter(
    (item) => item.isAvailable && !pickedItemIds.has(item.id),
  );
  const filteredItems = search
    ? availableItems.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      )
    : availableItems;

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

      <input
        type="search"
        placeholder="Search items…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="da-input"
        style={{ width: '100%', marginBottom: '12px' }}
        aria-label="Search pool items"
      />

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
        {filteredItems.map((item) => {
          const isPicking = pickingItemId === item.id;
          const isOnWatchlist = watchlistItemIds?.has(item.id) ?? false;
          return (
            <li key={item.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(item, e)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (dragStartedRef.current) return;
                    void handlePick(item.id);
                  }}
                  disabled={!isMyTurn || isPicking}
                  className={`pick-card${isPicking ? ' active' : ''}${!isMyTurn ? ' disabled' : ''}`}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                  aria-busy={isPicking}
                  aria-label={
                    isOnWatchlist
                      ? `${item.name} (on watchlist)`
                      : `${item.name}. Drag to watchlist or click to draft.`
                  }
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {isOnWatchlist && (
                      <span
                        aria-hidden
                        style={{
                          fontSize: '10px',
                          color: 'var(--gold)',
                          letterSpacing: '0.08em',
                        }}
                      >
                        ★
                      </span>
                    )}
                    {isPicking && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--gold)',
                        }}
                      />
                    )}
                  </span>
                </button>
                {onAddToWatchlist && (
                  <button
                    type="button"
                    aria-label={`Add ${item.name} to watchlist`}
                    onClick={() => onAddToWatchlist(item.id, item.name)}
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-dim)',
                      border: '1px solid var(--border-hi)',
                      borderRadius: '4px',
                      padding: '0 8px',
                      background: 'var(--panel)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {filteredItems.length === 0 && (
        <p
          style={{
            color: 'var(--text-dim)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          {search ? "No items match your search." : "No items available"}
        </p>
      )}
    </section>
  );
}
