import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

import { revalidateTag } from "next/cache";
import type { Db } from "../types";
import { chainlinkAdapter } from "./chainlink";

type Call = { table: string; op: string; values?: unknown; filter?: unknown };

/** Records writes; `creators` answers the created_by lookup for a chain id. */
function recordingDb(creators: Record<string, string | null> = {}) {
  const calls: Call[] = [];
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
      select: () => ({
        eq: (_col: string, id: string) => ({
          maybeSingle: async () => ({ data: { created_by: creators[id] ?? null }, error: null }),
        }),
      }),
      delete: () => ({
        eq: (_col: string, id: string) => ({
          gte: async (_dateCol: string, from: string) => {
            calls.push({ table, op: "delete", filter: { id, from } });
            return { error: null };
          },
        }),
      }),
    }),
  } as unknown as Db;
  return { db, calls };
}

beforeEach(() => vi.mocked(revalidateTag).mockClear());

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

  it("sends a swapped-out cron-generated chain to draft, not the approved pool", async () => {
    const { db, calls } = recordingDb({ old: "cron" });
    await chainlinkAdapter.swap(db, "2026-10-16", "new", "old");
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: "chain_puzzles",
        filter: "old",
        values: expect.objectContaining({ status: "draft" }),
      }),
    );
  });
});

describe("chainlinkAdapter.retire", () => {
  it("rejects the chain and drops its bookings from clearFrom on", async () => {
    const { db, calls } = recordingDb();
    await chainlinkAdapter.retire(db, "old", "2026-10-16");
    expect(calls).toContainEqual(
      expect.objectContaining({ table: "chain_puzzles", values: expect.objectContaining({ status: "rejected" }) }),
    );
    expect(calls).toContainEqual({
      table: "daily_chain_puzzles",
      op: "delete",
      filter: { id: "old", from: "2026-10-16" },
    });
  });
});
