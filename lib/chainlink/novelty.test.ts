import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  checkNoveltyAgainstIndex,
  loadExistingChainIndex,
  type ExistingChainIndex,
} from "./novelty";

function makeIndex(chains: string[][]): ExistingChainIndex {
  return {
    chains: new Set(chains.map((c) => c.map((w) => w.toLowerCase()).join("|"))),
  };
}

describe("loadExistingChainIndex", () => {
  it("collects normalized chain keys from existing puzzles", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [
        { words: ["apple", "juice", "box", "spring", "break"] },
        { words: ["apple", "pie", "crust", "layer", "cake"] },
      ],
      error: null,
    });
    const db = {
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as SupabaseClient<Database>;

    const index = await loadExistingChainIndex(db);

    expect(index.chains.has("apple|juice|box|spring|break")).toBe(true);
    expect(index.chains.has("apple|pie|crust|layer|cake")).toBe(true);
    expect(index.chains.size).toBe(2);
  });

  it("surfaces load errors", async () => {
    const select = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    const db = {
      from: vi.fn().mockReturnValue({ select }),
    } as unknown as SupabaseClient<Database>;

    await expect(loadExistingChainIndex(db)).rejects.toThrow(/boom/);
  });
});

describe("checkNoveltyAgainstIndex", () => {
  it("rejects an exact duplicate chain", () => {
    const index = makeIndex([["apple", "juice", "box", "spring", "break"]]);
    const report = checkNoveltyAgainstIndex(index, ["apple", "juice", "box", "spring", "break"]);
    expect(report.duplicateChain).toBe(true);
    expect(report.problems.join("\n")).toMatch(/already exists/);
  });

  it("is case-insensitive", () => {
    const index = makeIndex([["apple", "juice", "box", "spring", "break"]]);
    const report = checkNoveltyAgainstIndex(index, ["Apple", "Juice", "Box", "Spring", "Break"]);
    expect(report.duplicateChain).toBe(true);
  });

  it("allows reusing words as long as the sequence differs", () => {
    // "apple" already opens two existing puzzles — that's fine now.
    const index = makeIndex([
      ["apple", "juice", "box", "spring", "break"],
      ["apple", "pie", "crust", "layer", "cake"],
    ]);
    const report = checkNoveltyAgainstIndex(index, ["apple", "cider", "vinegar", "pitcher", "glass"]);
    expect(report.problems).toHaveLength(0);
    expect(report.duplicateChain).toBe(false);
  });

  it("returns no problems for a fresh chain", () => {
    const index = makeIndex([["apple", "juice", "box", "spring", "break"]]);
    const report = checkNoveltyAgainstIndex(index, ["moon", "light", "year", "book", "store"]);
    expect(report.problems).toHaveLength(0);
    expect(report.duplicateChain).toBe(false);
  });
});
