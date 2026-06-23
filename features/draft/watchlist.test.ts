import { describe, expect, it } from "vitest";
import {
  addWatchlistEntry,
  createWatchlistEntry,
  moveWatchlistEntry,
  parseStoredWatchlist,
  pruneWatchlist,
  removeWatchlistEntry,
} from "./watchlist";
import type { SafeItem, SafePick } from "./types";

const poolItem = (id: string, name: string, isAvailable = true): SafeItem => ({
  id,
  name,
  source: "ai",
  isAvailable,
});

const pick = (
  itemId: string,
  itemName: string | null = null,
): SafePick => ({
  id: `pick-${itemId}`,
  playerId: "p1",
  itemId,
  itemName,
  overallPick: 1,
  round: 1,
  pickInRound: 1,
  isAutoPick: false,
  forfeited: false,
});

describe("watchlist", () => {
  it("dedupes pool and text entries by id", () => {
    const entries = [
      createWatchlistEntry({ kind: "pool", itemId: "a", name: "Alpha" }),
      createWatchlistEntry({ kind: "text", name: "Beta" }),
    ];

    const withPoolDup = addWatchlistEntry(entries, {
      kind: "pool",
      itemId: "a",
      name: "Alpha",
    });
    const withTextDup = addWatchlistEntry(withPoolDup, {
      kind: "text",
      name: "  beta  ",
    });

    expect(withTextDup).toHaveLength(2);
  });

  it("prunes picked pool items and unavailable items", () => {
    const entries = [
      createWatchlistEntry({ kind: "pool", itemId: "a", name: "Alpha" }),
      createWatchlistEntry({ kind: "pool", itemId: "b", name: "Beta" }),
      createWatchlistEntry({ kind: "text", name: "Gamma" }),
    ];

    const pruned = pruneWatchlist(
      entries,
      [pick("a", "Alpha")],
      [poolItem("b", "Beta", false), poolItem("c", "Charlie")],
    );

    expect(pruned).toEqual([entries[2]]);
  });

  it("prunes text entries when the name has been picked", () => {
    const entries = [createWatchlistEntry({ kind: "text", name: "Spicy Tuna" })];
    const pruned = pruneWatchlist(entries, [pick("", "spicy tuna")], []);
    expect(pruned).toEqual([]);
  });

  it("moves entries and ignores invalid indices", () => {
    const entries = [
      createWatchlistEntry({ kind: "text", name: "One" }),
      createWatchlistEntry({ kind: "text", name: "Two" }),
      createWatchlistEntry({ kind: "text", name: "Three" }),
    ];

    expect(moveWatchlistEntry(entries, 0, 2).map((entry) => entry.name)).toEqual([
      "Two",
      "Three",
      "One",
    ]);
    expect(moveWatchlistEntry(entries, -1, 1)).toEqual(entries);
  });

  it("removes entries by id", () => {
    const entry = createWatchlistEntry({ kind: "text", name: "Keep" });
    const other = createWatchlistEntry({ kind: "text", name: "Drop" });
    expect(removeWatchlistEntry([entry, other], other.id)).toEqual([entry]);
  });

  it("parses stored watchlist entries safely", () => {
    const stored = JSON.stringify([
      { id: "pool:a", kind: "pool", itemId: "a", name: "Alpha" },
      { id: "text:beta", kind: "text", name: "Beta" },
      { id: "bad", kind: "unknown", name: "Nope" },
      "not-an-entry",
    ]);

    expect(parseStoredWatchlist(stored)).toEqual([
      { id: "pool:a", kind: "pool", itemId: "a", name: "Alpha" },
      { id: "text:beta", kind: "text", name: "Beta" },
    ]);
    expect(parseStoredWatchlist("{bad json")).toEqual([]);
  });
});
