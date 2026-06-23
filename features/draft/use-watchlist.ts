"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SafeItem, SafePick } from "./types";
import {
  addWatchlistEntry,
  moveWatchlistEntry,
  parseStoredWatchlist,
  pruneWatchlist,
  removeWatchlistEntry,
  watchlistStorageKey,
  type WatchlistEntry,
} from "./watchlist";

interface UseWatchlistOptions {
  draftId: string;
  playerId: string;
  picks: SafePick[];
  availableItems: SafeItem[];
}

export function useWatchlist({
  draftId,
  playerId,
  picks,
  availableItems,
}: UseWatchlistOptions) {
  const storageKey = watchlistStorageKey(draftId, playerId);
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = parseStoredWatchlist(localStorage.getItem(storageKey));
    setEntries(stored);
    setHydrated(true);
  }, [storageKey]);

  const prunedEntries = useMemo(
    () => pruneWatchlist(entries, picks, availableItems),
    [entries, picks, availableItems],
  );

  useEffect(() => {
    if (!hydrated) return;
    setEntries((current) => pruneWatchlist(current, picks, availableItems));
  }, [picks, availableItems, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(prunedEntries));
  }, [hydrated, prunedEntries, storageKey]);

  const addEntry = useCallback(
    (input: { kind: "pool"; itemId: string; name: string } | { kind: "text"; name: string }) => {
      setEntries((current) => addWatchlistEntry(current, input));
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => removeWatchlistEntry(current, id));
  }, []);

  const moveEntry = useCallback((fromIndex: number, toIndex: number) => {
    setEntries((current) => moveWatchlistEntry(current, fromIndex, toIndex));
  }, []);

  return {
    entries: prunedEntries,
    addEntry,
    removeEntry,
    moveEntry,
  };
}
