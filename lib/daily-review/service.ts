import "server-only";

import { isLocked, reviewWindow, todayUtc } from "./dates";
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

export async function getReviewGrid(ctx: ReviewContext, today = todayUtc()): Promise<ReviewGrid> {
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

/** Candidates for `date` that are not already scheduled anywhere in the review window. */
async function eligibleCandidates(
  ctx: ReviewContext,
  adapter: ReviewAdapter,
  date: string,
  today: string,
): Promise<Candidate[]> {
  const { from, to } = windowBounds(today);
  const [scheduled, candidates] = await Promise.all([
    adapter.listScheduled(ctx.db, from, to),
    adapter.listCandidates(ctx.db, date),
  ]);
  const inWindow = new Set(scheduled.map((slot) => slot.contentId));
  return candidates.filter((c) => !inWindow.has(c.contentId));
}

export async function listAlternates(
  ctx: ReviewContext,
  game: ReviewGame,
  date: string,
  today = todayUtc(),
): Promise<Candidate[]> {
  const adapter = adapterFor(ctx, game);
  return (await eligibleCandidates(ctx, adapter, date, today)).slice(0, ALTERNATES_PER_SLOT);
}

async function scheduledOn(ctx: ReviewContext, adapter: ReviewAdapter, date: string) {
  return (await adapter.listScheduled(ctx.db, date, date))[0] ?? null;
}

export async function approve(
  ctx: ReviewContext,
  input: { game: ReviewGame; date: string; email: string },
  today = todayUtc(),
): Promise<void> {
  if (isLocked(input.date, today)) throw new ReviewError("LOCKED");
  const adapter = adapterFor(ctx, input.game);
  const slot = await scheduledOn(ctx, adapter, input.date);
  if (!slot) throw new ReviewError("NOT_SCHEDULED");
  await ctx.store.upsertReview({
    game: input.game,
    publishDate: input.date,
    contentId: slot.contentId,
    reviewedBy: input.email,
  });
}

export async function swap(
  ctx: ReviewContext,
  input: { game: ReviewGame; date: string; contentId: string; retire: boolean; email: string },
  today = todayUtc(),
): Promise<void> {
  if (isLocked(input.date, today)) throw new ReviewError("LOCKED");
  const adapter = adapterFor(ctx, input.game);

  const [current, eligible] = await Promise.all([
    scheduledOn(ctx, adapter, input.date),
    eligibleCandidates(ctx, adapter, input.date, today),
  ]);
  // Re-checked here because the panel's list may be stale: the pick could
  // since have been scheduled elsewhere in the window or retired.
  if (!eligible.some((c) => c.contentId === input.contentId)) throw new ReviewError("STALE");

  const previous = current?.contentId ?? null;
  await adapter.swap(ctx.db, input.date, input.contentId, previous);
  if (input.retire && previous) await adapter.retire(ctx.db, previous);

  // Choosing an alternate is the approval.
  await ctx.store.upsertReview({
    game: input.game,
    publishDate: input.date,
    contentId: input.contentId,
    reviewedBy: input.email,
  });
}
