# LRU Daily Scheduling for Ball Knowledge & Hot Takes

Date: 2026-08-26

## Problem

Daily games should not repeat recently used content too often. Getting Warmer,
FreezeFrames, and Chain Link already persist every `date → puzzle` assignment in a
schedule table and skip already-used puzzles when auto-scheduling. Two daily games
lack this:

- **Ball Knowledge** has no persistence at all. Its 35 categories are hardcoded and
  rotate via `dayIndex % 35`, so the same category reappears on a fixed 35-day cycle
  with no way to vary or control it.
- **Hot Takes** has a `hot_takes_schedule` table, but `autoScheduleApprovedCategories`
  only tracks *occupied dates* — it never checks which categories are already
  scheduled, so re-running it double-schedules the same categories. The daily
  resolution also falls back to a `hash(date) % poolSize` rotation that repeats.

## Goals

1. Persist every `date → category` assignment for both games.
2. Select each day's category with a **least-recently-used (LRU)** rotation: never-used
   categories first, then the oldest-used. A category cannot repeat until the entire
   pool has cycled through, after which it cycles again from the oldest.
3. Keep the daily pick deterministic and shared (every player sees the same category on
   a given day).
4. Lazy scheduling: if a day has no schedule row, the first request assigns it and
   persists the assignment (mirroring FreezeFrames / Getting Warmer).
5. Add admin API routes + admin UI pages for scheduling.

## Non-goals

- No new admin UI for authoring Ball Knowledge categories (they remain hardcoded).
- No change to Hot Takes category authoring/items.
- Manual admin "assign date" remains a free override (consistent with Getting Warmer);
  only automated scheduling enforces LRU.

## Design

### Shared LRU semantics

Given a pool of items and a map of `item → lastUsedDate` (derived from all schedule
rows), choose in order:

1. Items never used, in deterministic pool order.
2. Items used longest ago first (oldest `lastUsedDate` ascending).

Ties are broken by the pool's natural order (Ball Knowledge: `CATEGORIES` array order;
Hot Takes: `created_at` ascending).

### Ball Knowledge

**Migration** — `supabase/migrations/<ts>_ball_knowledge_schedule.sql`:

```sql
create table public.ball_knowledge_schedule (
  id uuid primary key default gen_random_uuid(),
  publish_date date not null unique,
  category text not null,
  created_at timestamptz not null default now()
);
-- enable RLS; revoke all from anon, authenticated (server-only reads via service role)
```

Categories stay hardcoded in `lib/ball-knowledge/categories.ts`; the schedule stores
the category **name** per date.

**New `lib/ball-knowledge/schedule-service.ts`**:

- `chooseLruCategory(categories, lastUsedByCategory)` — pure, testable helper.
- `getScheduledCategory(db, date)`
- `pickLruCategory(db)`
- `scheduleDailyCategory(db, date?)` — lazy; tolerates unique-violation `23505`.
- `autoScheduleCategories(db, { startDate })` — bulk fill in LRU order.
- `listSchedule(db)`

**New `lib/ball-knowledge/puzzle-service.ts`**:

- `getDailyCategory(db)` — resolves today's category: scheduled row → lazy schedule →
  deterministic `getTodayCategory()` fallback, with a per-day in-memory cache.

**Consumers switched to the single resolver** (currently they call the sync
`getTodayCategory()` directly):

- `app/ball-knowledge/daily/page.tsx` — async, with try/catch fallback to the
  deterministic pick.
- `app/api/ball-knowledge/daily/route.ts`
- `app/api/ball-knowledge/judge/route.ts` — **critical**: the
  `category !== getTodayCategory()` guard must use the same resolution or judging
  rejects valid plays.

**Admin**:

- `app/api/admin/ball-knowledge/schedule/route.ts` — GET list / POST manual assign.
- `app/api/admin/ball-knowledge/schedule/bulk/route.ts` — POST auto-fill.
- `app/admin/ball-knowledge/page.tsx` — schedule tab: upcoming dates, manual assign
  dropdown (35 categories), auto-fill button, and a pool view showing each category's
  last-used date.
- Add `ball-knowledge` to `ADMIN_GAMES` (`lib/admin/games.ts`) with
  `adminHref: "/admin/ball-knowledge"`.

### Hot Takes

**Rewrite `lib/hot-takes/schedule-service.ts`**:

- `autoScheduleApprovedCategories` loads **all** schedule rows (not just `>= startDate`)
  to compute last-used per category, sorts approved categories by LRU, and assigns them
  to open dates. Fixes the double-scheduling bug.
- Add `pickLruCategoryId(db)` and lazy `scheduleDailyCategory(db, date?)`.
- Do **not** mark categories `used` — LRU reuses them, and `used` would eject them from
  the approved pool.

**Update `lib/hot-takes/daily-service.ts`**:

- `getDailyCategoryForPlay`: explicit schedule → lazy LRU schedule → legacy fallback
  (replacing the `getDailyCategoryIndex` hash fallback).

**Admin UI**: existing `app/admin/hot-takes/page.tsx` schedule tab and "Auto-fill
approved" button continue to work (they call the routes being changed). Add a small
"last used" / "next up" readout.

## Types, tests, verification

- Add `ball_knowledge_schedule` to `lib/supabase/database.types.ts` (matching the
  generated format; canonical regen is `pnpm db:types` after `pnpm db:push`).
- Unit tests for `chooseLruCategory` and the Hot Takes LRU ordering helper.
- Run `pnpm typecheck`, `pnpm lint`, and the relevant `pnpm test` suites.

## Error handling

- Lazy schedule insert tolerates `23505` (concurrent request race) and returns the
  existing assignment.
- Ball Knowledge daily resolution falls back to deterministic `getTodayCategory()` if
  the DB is unavailable (missing env vars, network error), preserving the current
  behavior.
- Hot Takes keeps the legacy static fallback as the final resort when the approved pool
  is empty.

## Trade-offs

- Hot Takes manual "Assign date" is a free override (admin can intentionally re-run a
  category); only auto-scheduling enforces LRU.
- Ball Knowledge's `judge` route gains a DB read per request, mitigated by the per-day
  in-memory cache in `getDailyCategory`.
