import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { saveDraftChains, type CandidateChain } from "./generator";

describe("saveDraftChains", () => {
  it("inserts words and phrases as jsonb arrays, not stringified JSON", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient<Database>;

    const chains: CandidateChain[] = [
      {
        words: ["ice", "cream", "cheese"],
        phrases: ["ice cream", "cream cheese"],
        difficulty: "easy",
        theme: "food",
        score: 16,
      },
    ];

    await saveDraftChains(db, chains, "test@example.com");

    expect(insert).toHaveBeenCalledTimes(1);
    const records = insert.mock.calls[0][0] as Array<{
      words: unknown;
      phrases: unknown;
    }>;

    expect(Array.isArray(records[0].words)).toBe(true);
    expect(Array.isArray(records[0].phrases)).toBe(true);
    expect(records[0].words).toEqual(["ice", "cream", "cheese"]);
    expect(records[0].phrases).toEqual(["ice cream", "cream cheese"]);
  });
});
