import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { revalidateTag } from "next/cache";
import type { Db } from "../types";
import { chainlinkAdapter } from "./chainlink";

function recordingDb() {
  const calls: { table: string; op: string; values: unknown; filter?: unknown }[] = [];
  const db = {
    from: (table: string) => ({
      upsert: async (values: unknown) => {
        calls.push({ table, op: "upsert", values });
        return { error: null };
      },
      update: (values: unknown) => ({
        eq: async (_col: string, id: string) => {
          calls.push({ table, op: "update", values, filter: id });
          return { error: null };
        },
      }),
    }),
  } as unknown as Db;
  return { db, calls };
}

describe("chainlinkAdapter.swap", () => {
  it("schedules the new chain, returns the old one to the pool, and expires the day's cache", async () => {
    const { db, calls } = recordingDb();
    await chainlinkAdapter.swap(db, "2026-10-16", "new", "old");

    expect(calls[0]).toMatchObject({
      table: "daily_chain_puzzles",
      op: "upsert",
      values: { publish_date: "2026-10-16", puzzle_id: "new" },
    });
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: "chain_puzzles",
        filter: "new",
        values: expect.objectContaining({ status: "scheduled" }),
      }),
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: "chain_puzzles",
        filter: "old",
        values: expect.objectContaining({ status: "approved" }),
      }),
    );
    expect(revalidateTag).toHaveBeenCalledWith("chainlink-daily-2026-10-16", { expire: 0 });
  });
});
