import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

vi.mock("./generator", () => ({
  generateChains: vi.fn(),
}));

import { generateChains } from "./generator";
import { getDailyPuzzle } from "./puzzle-service";

const mockGenerateChains = generateChains as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGenerateChains.mockReset();
});

/** Minimal supabase mock — each test wires the exact query chain it needs. */
function dbFrom(tables: Record<string, Record<string, unknown>>) {
  const from = vi.fn((table: string) => {
    const builder = tables[table];
    if (!builder) throw new Error(`unexpected table: ${table}`);
    return builder;
  });
  return { from } as unknown as SupabaseClient<Database>;
}

describe("getDailyPuzzle on-demand generation", () => {
  it("generates and schedules a puzzle when none is scheduled for the date", async () => {
    mockGenerateChains.mockResolvedValue([
      {
        words: ["sun", "light", "house", "boat", "yard"],
        phrases: ["sun light", "light house", "house boat", "boat yard"],
        difficulty: "easy",
        theme: null,
        score: 10,
      },
    ]);

    const dailyInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const dailyMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const dailySelect = vi
      .fn()
      .mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: dailyMaybeSingle }) });

    const chainSingle = vi.fn().mockResolvedValue({ data: { id: "p1" }, error: null });
    const chainInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: chainSingle }),
    });

    const db = dbFrom({
      daily_chain_puzzles: { select: dailySelect, insert: dailyInsert },
      chain_puzzles: { insert: chainInsert },
    });

    const result = await getDailyPuzzle(db, "2026-08-26");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("p1");
    expect(result!.words).toEqual(["sun", "light", "house", "boat", "yard"]);
    expect(result!.mode).toBe("daily");
    expect(result!.date).toBe("2026-08-26");

    // An unreviewed daily must never contain a link players would hesitate over.
    expect(mockGenerateChains).toHaveBeenCalledWith(db, { length: 5, count: 1, minLinkScore: 5 });

    expect(chainInsert).toHaveBeenCalledTimes(1);
    expect(dailyInsert).toHaveBeenCalledTimes(1);
    expect(dailyInsert.mock.calls[0][0]).toMatchObject({
      publish_date: "2026-08-26",
      puzzle_id: "p1",
    });
  });

  it("falls back to an approved puzzle and schedules it for everyone", async () => {
    mockGenerateChains.mockResolvedValue([]);

    const dailyInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const dailyMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const dailySelect = vi
      .fn()
      .mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: dailyMaybeSingle }) });

    const chainLimit = vi.fn().mockResolvedValue({
      data: [{ id: "p2", words: ["a", "b", "c", "d", "e"], difficulty: "medium" }],
      error: null,
    });
    const chainOrder = vi.fn().mockReturnValue({ limit: chainLimit });
    const chainIn = vi.fn().mockReturnValue({ order: chainOrder });
    const chainSelect = vi.fn().mockReturnValue({ in: chainIn });

    const db = dbFrom({
      daily_chain_puzzles: { select: dailySelect, insert: dailyInsert },
      chain_puzzles: { select: chainSelect },
    });

    const result = await getDailyPuzzle(db, "2026-08-27");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("p2");
    expect(mockGenerateChains).toHaveBeenCalledTimes(1);
    expect(dailyInsert).toHaveBeenCalledTimes(1);
    expect(dailyInsert.mock.calls[0][0]).toMatchObject({
      publish_date: "2026-08-27",
      puzzle_id: "p2",
    });
  });

  it("reuses the winner when another request already scheduled the fallback", async () => {
    mockGenerateChains.mockResolvedValue([]);

    const dailyInsert = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });
    const dailyMaybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { puzzle_id: "p-winner", publish_date: "2026-08-29" },
        error: null,
      });
    const dailySelect = vi
      .fn()
      .mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: dailyMaybeSingle }) });

    const chainLimit = vi.fn().mockResolvedValue({
      data: [{ id: "p-loser", words: ["a", "b", "c", "d", "e"], difficulty: "medium" }],
      error: null,
    });
    const chainOrder = vi.fn().mockReturnValue({ limit: chainLimit });
    const chainIn = vi.fn().mockReturnValue({ order: chainOrder });
    const chainSingle = vi.fn().mockResolvedValue({
      data: { id: "p-winner", words: ["w", "i", "n", "n", "r"], difficulty: "easy" },
      error: null,
    });
    const chainEq = vi.fn().mockReturnValue({ single: chainSingle });
    const chainSelect = vi.fn().mockImplementation(() => ({
      in: chainIn,
      eq: chainEq,
    }));

    const db = dbFrom({
      daily_chain_puzzles: { select: dailySelect, insert: dailyInsert },
      chain_puzzles: { select: chainSelect },
    });

    const result = await getDailyPuzzle(db, "2026-08-29");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("p-winner");
    expect(result!.words).toEqual(["w", "i", "n", "n", "r"]);
    expect(dailyInsert).toHaveBeenCalledTimes(1);
  });

  it("returns the scheduled puzzle without generating", async () => {
    const dailyMaybeSingle = vi.fn().mockResolvedValue({
      data: { puzzle_id: "p3", publish_date: "2026-08-28" },
      error: null,
    });
    const dailySelect = vi
      .fn()
      .mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: dailyMaybeSingle }) });

    const chainSingle = vi.fn().mockResolvedValue({
      data: { id: "p3", words: ["x", "y", "z", "q", "r"], difficulty: "hard" },
      error: null,
    });
    const chainEq = vi.fn().mockReturnValue({ single: chainSingle });
    const chainSelect = vi.fn().mockReturnValue({ eq: chainEq });

    const db = dbFrom({
      daily_chain_puzzles: { select: dailySelect },
      chain_puzzles: { select: chainSelect },
    });

    const result = await getDailyPuzzle(db, "2026-08-28");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("p3");
    expect(mockGenerateChains).not.toHaveBeenCalled();
  });
});
