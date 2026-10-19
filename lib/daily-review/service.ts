import "server-only";

import { addDays, isLocked, reviewWindow, todayDate } from "./dates";
import type { ReviewStore } from "./store";
import {
  ReviewError,
  type Candidate,
  type Db,
  type ReviewAdapter,
  type ReviewCell,
  type ReviewColumn,
  type ReviewGame,
  type ReviewGrid,
  type ReviewSummary,
} from "./types";

export interface ReviewContext {
  db: Db;
  adapters: ReviewAdapter[];
  store: ReviewStore;
}

export const ALTERNATES_PER_SLOT = 3;

function adapterFor(ctx: ReviewContext, game: ReviewGame): ReviewAdapter {
  const adapter = ctx.adapters.find((a) => a.game === game);
  if (!adapter) throw new ReviewError("UNKNOWN_GAME", `No review adapter for ${game}`);
  return adapter;
}

function windowBounds(today: string): { from: string; to: string } {
  const dates = reviewWindow(today);
  return { from: dates[0]!, to: dates[dates.length - 1]! };
}

export async function getReviewGrid(ctx: ReviewContext, today = todayDate()): Promise<ReviewGrid> {
  const dates = reviewWindow(today);
  const { from, to } = windowBounds(today);
  const reviews = await ctx.store.listReviews(from, to);
  const reviewBySlot = new Map(reviews.map((r) => [`${r.game}|${r.publishDate}`, r]));

  const columns = await Promise.all(
    ctx.adapters.map(async (adapter): Promise<ReviewColumn> => {
      try {
        const scheduled = await adapter.listScheduled(ctx.db, from, to);
        const byDate = new Map(scheduled.map((slot) => [slot.date, slot]));
        const cells = dates.map((date): ReviewCell => {
          const slot = byDate.get(date);
          const review = reviewBySlot.get(`${adapter.game}|${date}`);
          // A review only counts for the content it approved.
          const current = slot && review?.contentId === slot.contentId ? review : null;
          return {
            date,
            contentId: slot?.contentId ?? null,
            preview: slot?.preview ?? null,
            reviewedBy: current?.reviewedBy ?? null,
            reviewedAt: current?.reviewedAt ?? null,
            locked: isLocked(date, today),
          };
        });
        return { game: adapter.game, name: adapter.name, error: null, cells };
      } catch (err) {
        return {
          game: adapter.game,
          name: adapter.name,
          error: err instanceof Error ? err.message : String(err),
          cells: [],
        };
      }
    }),
  );

  return { today, dates, columns };
}

/** Slots that still need a human: not locked, scheduled, and not reviewed. */
export function summarize(grid: ReviewGrid): ReviewSummary {
  const byGame = grid.columns.map((column) => {
    const pending = column.cells.filter((c) => !c.locked && c.contentId && !c.reviewedBy);
    return {
      game: column.game,
      name: column.name,
      count: pending.length,
      first: pending[0]?.date ?? null,
    };
  });
  return { total: byGame.reduce((sum, g) => sum + g.count, 0), byGame };
}

/**
 * Candidates for `date` that are not booked on any day from today on. Bulk
 * auto-schedules can book items months ahead, so checking only the review
 * window would let a swap put one item on two days.
 */
async function eligibleCandidates(
  ctx: ReviewContext,
  adapter: ReviewAdapter,
  date: string,
  today: string,
): Promise<Candidate[]> {
  const [booked, candidates] = await Promise.all([
    adapter.listBookedIds(ctx.db, today),
    adapter.listCandidates(ctx.db, date),
  ]);
  return candidates.filter((c) => !booked.has(c.contentId));
}

/** The top `limit` alternates; pass Infinity for every eligible item. */
export async function listAlternates(
  ctx: ReviewContext,
  game: ReviewGame,
  date: string,
  today = todayDate(),
  limit = ALTERNATES_PER_SLOT,
): Promise<Candidate[]> {
  const adapter = adapterFor(ctx, game);
  const eligible = await eligibleCandidates(ctx, adapter, date, today);
  return Number.isFinite(limit) ? eligible.slice(0, limit) : eligible;
}

async function scheduledOn(ctx: ReviewContext, adapter: ReviewAdapter, date: string) {
  return (await adapter.listScheduled(ctx.db, date, date))[0] ?? null;
}

/**
 * Approves the content the admin was shown (`contentId`). If the slot has
 * changed since, the approval would land on something nobody looked at.
 */
export async function approve(
  ctx: ReviewContext,
  input: { game: ReviewGame; date: string; contentId: string; email: string },
  today = todayDate(),
): Promise<void> {
  if (isLocked(input.date, today)) throw new ReviewError("LOCKED");
  const adapter = adapterFor(ctx, input.game);
  const slot = await scheduledOn(ctx, adapter, input.date);
  if (!slot) throw new ReviewError("NOT_SCHEDULED");
  if (slot.contentId !== input.contentId) throw new ReviewError("STALE");
  await ctx.store.upsertReview({
    game: input.game,
    publishDate: input.date,
    contentId: slot.contentId,
    reviewedBy: input.email,
  });
}

export async function swap(
  ctx: ReviewContext,
  input: {
    game: ReviewGame;
    date: string;
    contentId: string;
    /** What the admin saw scheduled; "retire" must hit that, not a later edit. */
    currentId: string | null;
    retire: boolean;
    email: string;
  },
  today = todayDate(),
): Promise<void> {
  if (isLocked(input.date, today)) throw new ReviewError("LOCKED");
  const adapter = adapterFor(ctx, input.game);

  const [current, eligible] = await Promise.all([
    scheduledOn(ctx, adapter, input.date),
    eligibleCandidates(ctx, adapter, input.date, today),
  ]);
  const previous = current?.contentId ?? null;
  // Re-checked here because the panel may be stale: the slot may have been
  // edited, or the pick since booked elsewhere or retired.
  if (previous !== input.currentId) throw new ReviewError("STALE");
  if (!eligible.some((c) => c.contentId === input.contentId)) throw new ReviewError("STALE");

  await adapter.swap(ctx.db, input.date, input.contentId, previous);
  // Today is locked, so its booking stays; later ones are dropped.
  if (input.retire && previous) await adapter.retire(ctx.db, previous, addDays(today, 1));

  // Choosing an alternate is the approval.
  await ctx.store.upsertReview({
    game: input.game,
    publishDate: input.date,
    contentId: input.contentId,
    reviewedBy: input.email,
  });
}
