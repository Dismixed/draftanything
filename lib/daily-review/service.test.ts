import { describe, expect, it, vi } from "vitest";
import type { Candidate, Db, ReviewAdapter, ReviewPreview, ScheduledSlot } from "./types";
import type { ReviewRecord, ReviewStore } from "./store";
import { approve, getReviewGrid, listAlternates, summarize, swap, type ReviewContext } from "./service";

const TODAY = "2026-10-15";
const preview = (title: string): ReviewPreview => ({ title, adminHref: "/admin/x" });

/** In-memory adapter: `schedule` is date → content id; `pool` is the candidate order. */
function fakeAdapter(
  schedule: Record<string, string>,
  pool: string[],
  overrides: Partial<ReviewAdapter> = {},
): ReviewAdapter {
  const adapter: ReviewAdapter = {
    game: "hot-takes",
    name: "Hot Takes",
    listScheduled: vi.fn(async (_db: Db, from: string, to: string): Promise<ScheduledSlot[]> =>
      Object.entries(schedule)
        .filter(([date]) => date >= from && date <= to)
        .map(([date, contentId]) => ({ date, contentId, preview: preview(contentId) })),
    ),
    listCandidates: vi.fn(async (): Promise<Candidate[]> =>
      pool.map((contentId) => ({ contentId, preview: preview(contentId) })),
    ),
    listBookedIds: vi.fn(async (_db: Db, from: string) =>
      new Set(Object.entries(schedule).filter(([date]) => date >= from).map(([, id]) => id)),
    ),
    swap: vi.fn(async (_db: Db, date: string, contentId: string) => {
      schedule[date] = contentId;
    }),
    retire: vi.fn(async () => {}),
  };
  return { ...adapter, ...overrides };
}

function fakeStore(initial: ReviewRecord[] = []): ReviewStore & { rows: ReviewRecord[] } {
  const rows: ReviewRecord[] = [...initial];
  return {
    rows,
    listReviews: async (): Promise<ReviewRecord[]> => rows,
    upsertReview: vi.fn(async (r: Omit<ReviewRecord, "reviewedAt">) => {
      const existing = rows.findIndex((x) => x.game === r.game && x.publishDate === r.publishDate);
      if (existing >= 0) rows.splice(existing, 1);
      rows.push({ ...r, reviewedAt: "2026-10-15T10:00:00Z" });
    }),
    lastEmailSentAt: async () => null,
    recordEmail: async () => {},
  };
}

const ctx = (adapters: ReviewAdapter[], store = fakeStore()): ReviewContext => ({
  db: {} as Db,
  adapters,
  store,
});

describe("getReviewGrid", () => {
  it("marks a slot reviewed when the review matches the scheduled content", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, []);
    const store = fakeStore([
      { game: "hot-takes", publishDate: "2026-10-16", contentId: "a", reviewedBy: "j@x.com", reviewedAt: "t" },
    ]);
    const grid = await getReviewGrid(ctx([adapter], store), TODAY);
    const cell = grid.columns[0]!.cells.find((c) => c.date === "2026-10-16")!;
    expect(cell.reviewedBy).toBe("j@x.com");
  });

  it("a review for different content does not count", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "b" }, []);
    const store = fakeStore([
      { game: "hot-takes", publishDate: "2026-10-16", contentId: "a", reviewedBy: "j@x.com", reviewedAt: "t" },
    ]);
    const grid = await getReviewGrid(ctx([adapter], store), TODAY);
    expect(grid.columns[0]!.cells.find((c) => c.date === "2026-10-16")!.reviewedBy).toBeNull();
  });

  it("one failing adapter becomes a column error", async () => {
    const broken = fakeAdapter({}, [], {
      game: "chainlink",
      name: "Chain Link",
      listScheduled: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    const ok = fakeAdapter({ "2026-10-16": "a" }, []);
    const grid = await getReviewGrid(ctx([broken, ok]), TODAY);
    expect(grid.columns[0]).toMatchObject({ game: "chainlink", error: "db down", cells: [] });
    expect(grid.columns[1]!.cells).toHaveLength(10);
  });

  it("locks today", async () => {
    const grid = await getReviewGrid(ctx([fakeAdapter({}, [])]), TODAY);
    const cells = grid.columns[0]!.cells;
    expect(cells[0]).toMatchObject({ date: TODAY, locked: true });
    expect(cells[1]!.locked).toBe(false);
  });
});

describe("summarize", () => {
  it("counts unlocked, scheduled, unreviewed slots per game with the first date", async () => {
    const adapter = fakeAdapter({ [TODAY]: "t", "2026-10-17": "a", "2026-10-18": "b" }, []);
    const store = fakeStore([
      { game: "hot-takes", publishDate: "2026-10-18", contentId: "b", reviewedBy: "j", reviewedAt: "t" },
    ]);
    const summary = summarize(await getReviewGrid(ctx([adapter], store), TODAY));
    expect(summary.total).toBe(1);
    expect(summary.byGame[0]).toMatchObject({ game: "hot-takes", count: 1, first: "2026-10-17" });
  });
});

describe("listAlternates", () => {
  it("skips content already scheduled in the window and returns 3", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a", "2026-10-20": "c" }, ["a", "b", "c", "d", "e", "f"]);
    const alts = await listAlternates(ctx([adapter]), "hot-takes", "2026-10-16", TODAY);
    expect(alts.map((a) => a.contentId)).toEqual(["b", "d", "e"]);
  });

  it("skips content booked beyond the window too", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a", "2026-11-20": "b" }, ["a", "b", "c"]);
    const alts = await listAlternates(ctx([adapter]), "hot-takes", "2026-10-16", TODAY);
    expect(alts.map((a) => a.contentId)).toEqual(["c"]);
  });

  it("returns fewer than 3 when the pool is small", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    const alts = await listAlternates(ctx([adapter]), "hot-takes", "2026-10-16", TODAY);
    expect(alts.map((a) => a.contentId)).toEqual(["b"]);
  });

  it("returns every eligible candidate when asked for all", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b", "c", "d", "e"]);
    const alts = await listAlternates(ctx([adapter]), "hot-takes", "2026-10-16", TODAY, Infinity);
    expect(alts.map((a) => a.contentId)).toEqual(["b", "c", "d", "e"]);
  });
});

describe("approve", () => {
  it("records the currently scheduled content", async () => {
    const store = fakeStore();
    await approve(
      ctx([fakeAdapter({ "2026-10-16": "a" }, [])], store),
      { game: "hot-takes", date: "2026-10-16", contentId: "a", email: "j@x.com" },
      TODAY,
    );
    expect(store.upsertReview).toHaveBeenCalledWith({
      game: "hot-takes",
      publishDate: "2026-10-16",
      contentId: "a",
      reviewedBy: "j@x.com",
    });
  });

  it("refuses when the slot changed since the admin looked", async () => {
    const store = fakeStore();
    await expect(
      approve(
        ctx([fakeAdapter({ "2026-10-16": "c" }, [])], store),
        { game: "hot-takes", date: "2026-10-16", contentId: "a", email: "j" },
        TODAY,
      ),
    ).rejects.toMatchObject({ code: "STALE" });
    expect(store.upsertReview).not.toHaveBeenCalled();
  });

  it("refuses today", async () => {
    await expect(
      approve(
        ctx([fakeAdapter({ [TODAY]: "a" }, [])]),
        { game: "hot-takes", date: TODAY, contentId: "a", email: "j" },
        TODAY,
      ),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });

  it("refuses a day with nothing scheduled", async () => {
    await expect(
      approve(
        ctx([fakeAdapter({}, [])]),
        { game: "hot-takes", date: "2026-10-16", contentId: "a", email: "j" },
        TODAY,
      ),
    ).rejects.toMatchObject({ code: "NOT_SCHEDULED" });
  });
});

describe("swap", () => {
  const input = (contentId: string, extra: Partial<Parameters<typeof swap>[1]> = {}) => ({
    game: "hot-takes" as const,
    date: "2026-10-16",
    contentId,
    currentId: "a",
    retire: false,
    email: "j",
    ...extra,
  });

  it("swaps, retires the old pick from tomorrow on, and approves the new one", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    const store = fakeStore();
    await swap(ctx([adapter], store), input("b", { retire: true }), TODAY);
    expect(adapter.swap).toHaveBeenCalledWith(expect.anything(), "2026-10-16", "b", "a");
    expect(adapter.retire).toHaveBeenCalledWith(expect.anything(), "a", "2026-10-16");
    expect(store.rows[0]).toMatchObject({ contentId: "b", reviewedBy: "j" });
  });

  it("does not retire without the flag", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    await swap(ctx([adapter]), input("b"), TODAY);
    expect(adapter.retire).not.toHaveBeenCalled();
  });

  it("refuses when the slot changed since the admin looked, so the wrong pick is never retired", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "c" }, ["a", "b", "c"]);
    await expect(swap(ctx([adapter]), input("b", { retire: true }), TODAY)).rejects.toMatchObject({
      code: "STALE",
    });
    expect(adapter.swap).not.toHaveBeenCalled();
    expect(adapter.retire).not.toHaveBeenCalled();
  });

  it("refuses a candidate already scheduled in the window", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a", "2026-10-19": "b" }, ["a", "b", "c"]);
    await expect(swap(ctx([adapter]), input("b"), TODAY)).rejects.toMatchObject({ code: "STALE" });
    expect(adapter.swap).not.toHaveBeenCalled();
  });

  it("refuses an unknown or retired candidate", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    await expect(swap(ctx([adapter]), input("zzz"), TODAY)).rejects.toMatchObject({ code: "STALE" });
  });

  it("refuses today", async () => {
    const adapter = fakeAdapter({ [TODAY]: "a" }, ["a", "b"]);
    await expect(swap(ctx([adapter]), input("b", { date: TODAY }), TODAY)).rejects.toMatchObject({
      code: "LOCKED",
    });
  });
});
