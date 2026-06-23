import type { SafeItem, SafePick } from "./types";

export type WatchlistEntry =
  | { id: string; kind: "pool"; itemId: string; name: string }
  | { id: string; kind: "text"; name: string };

const STORAGE_PREFIX = "draft-watchlist";
export const WATCHLIST_DRAG_MIME = "application/x-draft-watchlist-item";

export interface WatchlistDragPayload {
  itemId: string;
  name: string;
}

export function watchlistStorageKey(draftId: string, playerId: string): string {
  return `${STORAGE_PREFIX}:${draftId}:${playerId}`;
}

export function normalizeWatchlistName(name: string): string {
  return name.trim().toLowerCase();
}

export function createWatchlistEntry(
  input: { kind: "pool"; itemId: string; name: string } | { kind: "text"; name: string },
): WatchlistEntry {
  const id =
    input.kind === "pool"
      ? `pool:${input.itemId}`
      : `text:${normalizeWatchlistName(input.name)}`;

  return { id, ...input };
}

export function parseStoredWatchlist(raw: string | null): WatchlistEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const entries: WatchlistEntry[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;

      const record = entry as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : "";
      const name = typeof record.name === "string" ? record.name.trim() : "";
      if (!id || !name) continue;

      if (record.kind === "pool" && typeof record.itemId === "string") {
        entries.push({ id, kind: "pool", itemId: record.itemId, name });
        continue;
      }

      if (record.kind === "text") {
        entries.push({ id, kind: "text", name });
      }
    }

    return entries;
  } catch {
    return [];
  }
}

export function pruneWatchlist(
  entries: WatchlistEntry[],
  picks: SafePick[],
  availableItems: SafeItem[],
): WatchlistEntry[] {
  const pickedItemIds = new Set(picks.map((pick) => pick.itemId).filter(Boolean));
  const pickedNames = new Set(
    picks
      .map((pick) => pick.itemName)
      .filter((name): name is string => Boolean(name))
      .map(normalizeWatchlistName),
  );
  const availableIds = new Set(
    availableItems.filter((item) => item.isAvailable).map((item) => item.id),
  );

  return entries.filter((entry) => {
    if (entry.kind === "pool") {
      if (pickedItemIds.has(entry.itemId)) return false;
      return availableIds.has(entry.itemId);
    }

    return !pickedNames.has(normalizeWatchlistName(entry.name));
  });
}

export function addWatchlistEntry(
  entries: WatchlistEntry[],
  input: { kind: "pool"; itemId: string; name: string } | { kind: "text"; name: string },
): WatchlistEntry[] {
  const trimmedName = input.name.trim();
  if (!trimmedName) return entries;

  const next = createWatchlistEntry(
    input.kind === "pool"
      ? { kind: "pool", itemId: input.itemId, name: trimmedName }
      : { kind: "text", name: trimmedName },
  );

  if (entries.some((entry) => entry.id === next.id)) {
    return entries;
  }

  return [...entries, next];
}

export function removeWatchlistEntry(entries: WatchlistEntry[], id: string): WatchlistEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function moveWatchlistEntry(
  entries: WatchlistEntry[],
  fromIndex: number,
  toIndex: number,
): WatchlistEntry[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= entries.length ||
    toIndex >= entries.length ||
    fromIndex === toIndex
  ) {
    return entries;
  }

  const next = [...entries];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function readWatchlistDragPayload(dataTransfer: DataTransfer): WatchlistDragPayload | null {
  const raw = dataTransfer.getData(WATCHLIST_DRAG_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as WatchlistDragPayload;
    if (
      parsed &&
      typeof parsed.itemId === "string" &&
      typeof parsed.name === "string" &&
      parsed.name.trim()
    ) {
      return { itemId: parsed.itemId, name: parsed.name.trim() };
    }
  } catch {
    return null;
  }

  return null;
}
