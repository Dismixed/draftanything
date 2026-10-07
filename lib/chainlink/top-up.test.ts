import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

vi.mock("./generator", () => ({ generateChains: vi.fn() }));
vi.mock("./schedule-service", () => ({ scheduleNextApprovedPuzzle: vi.fn() }));
vi.mock("./llm-validate", () => ({ validateChainWithLlm: vi.fn() }));

import { generateChains } from "./generator";
import { validateChainWithLlm } from "./llm-validate";
import { scheduleNextApprovedPuzzle } from "./schedule-service";
import { topUpDailyChains } from "./top-up";

const mockGenerate = generateChains as unknown as ReturnType<typeof vi.fn>;
const mockApproved = scheduleNextApprovedPuzzle as unknown as ReturnType<typeof vi.fn>;
const mockValidate = validateChainWithLlm as unknown as ReturnType<typeof vi.fn>;

const chain = (first: string) => ({
  words: [first, "b", "c", "d", "e"],
  phrases: [`${first} b`, "b c", "c d", "d e"],
  difficulty: "easy" as const,
  theme: null,
  score: 36,
});

/** Calendar with `scheduled` dates taken; records puzzle and schedule inserts. */
function calendarDb(scheduled: string[]) {
  const puzzleInserts: Record<string, unknown>[] = [];
  const dailyInserts: Record<string, unknown>[] = [];
  const db = {
    from: (table: string) => {
      if (table === "daily_chain_puzzles") {
        return {
          select: () => ({
            gte: async () => ({ data: scheduled.map((publish_date) => ({ publish_date })), error: null }),
          }),
          insert: async (row: Record<string, unknown>) => {
            dailyInserts.push(row);
            return { error: null };
          },
        };
      }
      return {
        insert: (row: Record<string, unknown>) => {
          puzzleInserts.push(row);
          return { select: () => ({ single: async () => ({ data: { id: `new-${puzzleInserts.length}` }, error: null }) }) };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return { db, puzzleInserts, dailyInserts };
}

beforeEach(() => {
  mockGenerate.mockReset();
  mockApproved.mockReset().mockResolvedValue(false);
  mockValidate.mockReset().mockResolvedValue({ allValid: true });
});

describe("topUpDailyChains", () => {
  it("fills only the dates that have no puzzle yet", async () => {
    mockGenerate.mockResolvedValue([chain("sun")]);
    const { db, dailyInserts } = calendarDb(["2026-10-20", "2026-10-21"]);

    const report = await topUpDailyChains(db, { today: "2026-10-20", daysAhead: 3 });

    expect(dailyInserts.map((row) => row.publish_date)).toEqual(["2026-10-22", "2026-10-23"]);
    expect(report.map((entry) => entry.date)).toEqual(["2026-10-22", "2026-10-23"]);
  });

  it("uses an approved puzzle before generating one", async () => {
    mockApproved.mockResolvedValue(true);
    const { db, puzzleInserts } = calendarDb(["2026-10-20"]);

    const report = await topUpDailyChains(db, { today: "2026-10-20", daysAhead: 1 });

    expect(report).toEqual([{ date: "2026-10-21", source: "approved" }]);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(puzzleInserts).toEqual([]);
  });

  it("schedules the first generated chain that passes the phrase check", async () => {
    mockGenerate.mockResolvedValue([chain("bad"), chain("good")]);
    mockValidate.mockResolvedValueOnce({ allValid: false }).mockResolvedValueOnce({ allValid: true });
    const { db, puzzleInserts, dailyInserts } = calendarDb(["2026-10-20"]);

    const report = await topUpDailyChains(db, { today: "2026-10-20", daysAhead: 1 });

    expect(puzzleInserts).toHaveLength(1);
    expect(puzzleInserts[0]).toMatchObject({ words: ["good", "b", "c", "d", "e"], status: "scheduled" });
    expect(dailyInserts).toEqual([{ publish_date: "2026-10-21", puzzle_id: "new-1" }]);
    expect(report).toEqual([{ date: "2026-10-21", source: "generated", words: ["good", "b", "c", "d", "e"] }]);
  });

  it("leaves a date empty when no generated chain passes the phrase check", async () => {
    mockGenerate.mockResolvedValue([chain("bad")]);
    mockValidate.mockResolvedValue({ allValid: false });
    const { db, puzzleInserts, dailyInserts } = calendarDb(["2026-10-20"]);

    const report = await topUpDailyChains(db, { today: "2026-10-20", daysAhead: 1 });

    expect(report).toEqual([{ date: "2026-10-21", source: "none" }]);
    expect(puzzleInserts).toEqual([]);
    expect(dailyInserts).toEqual([]);
  });

  it("fills today as well when it has no puzzle", async () => {
    mockGenerate.mockResolvedValue([chain("sun")]);
    const { db, dailyInserts } = calendarDb([]);

    await topUpDailyChains(db, { today: "2026-10-20", daysAhead: 1 });

    expect(dailyInserts.map((row) => row.publish_date)).toEqual(["2026-10-20", "2026-10-21"]);
  });
});
