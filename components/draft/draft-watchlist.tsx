"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { PickingMode } from "@/features/draft/types";
import {
  readWatchlistDragPayload,
  WATCHLIST_DRAG_MIME,
  type WatchlistEntry,
} from "@/features/draft/watchlist";

interface DraftWatchlistProps {
  entries: WatchlistEntry[];
  pickingMode: PickingMode;
  isMyTurn: boolean;
  isSubmittingPick: boolean;
  onAddText: (name: string) => void;
  onAddPoolItem: (itemId: string, name: string) => void;
  onRemove: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onPickPoolItem?: (itemId: string) => Promise<void>;
  onPickTextItem?: (name: string) => Promise<void>;
}

export function DraftWatchlist({
  entries,
  pickingMode,
  isMyTurn,
  isSubmittingPick,
  onAddText,
  onAddPoolItem,
  onRemove,
  onMove,
  onPickPoolItem,
  onPickTextItem,
}: DraftWatchlistProps) {
  const [inputValue, setInputValue] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [pickingEntryId, setPickingEntryId] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const trimmedInput = inputValue.trim();
  const canAddText = trimmedInput.length > 0 && trimmedInput.length <= 200;

  const handleAddText = useCallback(() => {
    if (!canAddText) return;
    onAddText(trimmedInput);
    setInputValue("");
  }, [canAddText, onAddText, trimmedInput]);

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleAddText();
    },
    [handleAddText],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleAddText();
      }
    },
    [handleAddText],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const payload = readWatchlistDragPayload(e.dataTransfer);
      if (payload) {
        onAddPoolItem(payload.itemId, payload.name);
        return;
      }

      const text = e.dataTransfer.getData("text/plain").trim();
      if (text) {
        onAddText(text);
      }
    },
    [onAddPoolItem, onAddText],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleEntryDragStart = useCallback((index: number, e: DragEvent<HTMLLIElement>) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", entries[index]?.name ?? "");
  }, [entries]);

  const handleEntryDragOver = useCallback((index: number, e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    if (dragIndexRef.current === null || dragIndexRef.current === index) return;
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleEntryDrop = useCallback(
    (index: number, e: DragEvent<HTMLLIElement>) => {
      e.preventDefault();
      const fromIndex = dragIndexRef.current;
      dragIndexRef.current = null;
      setDraggingIndex(null);
      if (fromIndex === null || fromIndex === index) return;
      onMove(fromIndex, index);
    },
    [onMove],
  );

  const handleEntryDragEnd = useCallback(() => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
  }, []);

  const handleEntryClick = useCallback(
    async (entry: WatchlistEntry) => {
      if (!isMyTurn || isSubmittingPick || pickingEntryId) return;

      setPickingEntryId(entry.id);
      try {
        if (entry.kind === "pool" && onPickPoolItem) {
          await onPickPoolItem(entry.itemId);
        } else if (entry.kind === "text" && onPickTextItem) {
          await onPickTextItem(entry.name);
        }
      } finally {
        setPickingEntryId(null);
      }
    },
    [isMyTurn, isSubmittingPick, onPickPoolItem, onPickTextItem, pickingEntryId],
  );

  return (
    <section
      aria-label="Draft watchlist"
      className="panel-card"
      style={{ padding: "16px" }}
    >
      <h2
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          margin: "0 0 4px 0",
        }}
      >
        Watchlist ({entries.length})
      </h2>
      <p
        style={{
          fontSize: "12px",
          color: "var(--text-dim)",
          margin: "0 0 12px 0",
          lineHeight: 1.4,
        }}
      >
        {pickingMode === "pool"
          ? "Drag pool items here or type ideas to track targets."
          : "Type ideas here to track what you want to draft."}
        {isMyTurn ? " Tap an entry on your turn to draft it." : ""}
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          minHeight: entries.length === 0 ? "72px" : undefined,
          border: isDragOver
            ? "1px dashed rgba(201,168,76,0.65)"
            : "1px dashed var(--border-hi)",
          borderRadius: "8px",
          background: isDragOver ? "rgba(201,168,76,0.05)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
          marginBottom: "12px",
        }}
      >
        {entries.length === 0 ? (
          <p
            style={{
              color: "var(--text-dim)",
              fontSize: "12px",
              textAlign: "center",
              padding: "20px 12px",
              margin: 0,
            }}
          >
            {pickingMode === "pool" ? "Drop options here" : "Add options below"}
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: "6px",
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {entries.map((entry, index) => {
              const isPicking = pickingEntryId === entry.id;
              const canPick =
                isMyTurn &&
                !isSubmittingPick &&
                ((entry.kind === "pool" && onPickPoolItem) ||
                  (entry.kind === "text" && onPickTextItem));

              return (
                <li
                  key={entry.id}
                  draggable
                  onDragStart={(e) => handleEntryDragStart(index, e)}
                  onDragOver={(e) => handleEntryDragOver(index, e)}
                  onDrop={(e) => handleEntryDrop(index, e)}
                  onDragEnd={handleEntryDragEnd}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: draggingIndex === index ? 0.55 : 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleEntryClick(entry)}
                    disabled={!canPick || isPicking}
                    className={`pick-card${isPicking ? " active" : ""}${!canPick ? " disabled" : ""}`}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      cursor: canPick ? "pointer" : "default",
                    }}
                    aria-busy={isPicking}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.name}
                    </span>
                    {isPicking && (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "var(--gold)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(entry.id)}
                    aria-label={`Remove ${entry.name} from watchlist`}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-hi)",
                      color: "var(--text-dim)",
                      borderRadius: "6px",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      flexShrink: 0,
                      fontSize: "14px",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={handleFormSubmit} style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Add to watchlist..."
          maxLength={200}
          aria-label="Add watchlist item"
          style={{
            flex: 1,
            background: "var(--panel)",
            border: "1px solid var(--border-hi)",
            borderRadius: "6px",
            padding: "8px 12px",
            color: "var(--text)",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!canAddText}
          style={{
            background: canAddText ? "var(--panel)" : "transparent",
            color: canAddText ? "var(--gold)" : "var(--text-dim)",
            border: "1px solid var(--border-hi)",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "9px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: canAddText ? "pointer" : "not-allowed",
            flexShrink: 0,
          }}
        >
          Add
        </button>
      </form>
    </section>
  );
}
