# Getting Warmer LRU Puzzle Recycling

Date: 2026-10-07

## Problem

Getting Warmer schedules each approved puzzle only once. When every approved
puzzle has a schedule row, `pickNextUnscheduledApprovedPuzzleId` returns `null`.
The daily puzzle resolver then serves the static seed puzzle, so the same
fallback can appear repeatedly instead of reusing the approved pool fairly.

## Goals

1. Continue scheduling every never-used approved puzzle before reusing any
   previously scheduled puzzle.
2. After the pool has been used, recycle puzzles in least-recently-used order.
3. Preserve all existing date assignments; only fill dates that are not already
   scheduled.
4. Expose the number of never-used approved puzzles in the daily cron report
   and warn when the pool is running low.
5. Keep the seed puzzle as an emergency fallback only when there are no
   approved puzzles available.

## Non-goals

- No changes to gameplay, guess validation, client state, or leaderboard rules.
- No schema migration or changes to existing schedule rows.
- No automatic generation or approval of new puzzles.
- No change to manual date assignment or bulk scheduling semantics beyond the
  shared recycling selector used for lazy daily scheduling.

## Design

### LRU selection

Replace the "first approved puzzle without any schedule row" selector with a
usage-aware selector in `lib/getting-warmer/schedule-service.ts`:

1. Load approved puzzles in `created_at` ascending order, and all schedule rows
   (`puzzle_id`, `publish_date`).
2. Build `puzzleId → most recent publish_date` from schedule history strictly
   before the target date. Future-dated assignments do not count as already
   used for an earlier target date. Schedule rows from when a puzzle was
   previously approved still count if that puzzle is approved again.
3. Use the shared `pickLru` helper with approved puzzles in creation order.
   Never-used puzzles are selected first in creation order; after those are
   exhausted, the puzzle with the oldest last-used date is selected. Equal
   last-used dates retain creation order.
4. `scheduleDailyPuzzle` continues to return an existing row unchanged. For an
   unscheduled date, it inserts the selected puzzle. If another request wins
   the unique-date race (`23505`), re-read and return the row that actually won;
   never return the losing candidate, because the puzzle resolver may cache it.

Schedule history must be read completely. Paginate the Supabase query in stable
pages rather than relying on the PostgREST default row limit, so a long-running
schedule cannot silently omit old or recent assignments from LRU calculations.

The schedule table already allows a puzzle ID to appear on multiple dates, so
recycling requires no schema change. Historical rows remain the source of
last-used information.

### Empty-pool fallback

If there are no approved puzzles, the selector returns `null` and the existing
seed puzzle remains the final fallback. If approved puzzles exist but have all
been used, LRU always selects one of them; the seed is no longer reached merely
because the unused queue is empty.

### Cron queue visibility

Add `countUnusedApproved` alongside the scheduler. For a reporting date, it
counts approved IDs with no schedule row on or before that date; a future-dated
assignment is not yet used. Wrap the Getting Warmer cron job so its response
includes this count through tomorrow alongside the today/tomorrow scheduling
results. Use the same seven-day low-queue threshold and warning convention as
FreezeFrames. A low queue is informational: LRU recycling still keeps daily
scheduling operational.

## Error handling and concurrency

- Database read/insert errors continue to fail the Getting Warmer cron job and
  daily request through the existing error paths; they must not silently report
  a healthy queue count.
- Existing `publish_date` uniqueness and `23505` handling continue to protect
  concurrent attempts to schedule the same date. On collision, the persisted
  winner is re-read and returned.
- The daily cron schedules today and tomorrow sequentially, so the two routine
  picks see the immediately preceding schedule row and advance the LRU order.
- LRU ordering assumes the normal daily cron's sequential scheduling. Two
  simultaneous requests for different empty dates are not serialized by this
  change and can race on the same candidate; a database transaction/RPC for
  cross-date reservations is outside this focused change.

## Tests

- Unit-test selection order: never-used puzzles first, then oldest last-used,
  with creation order as the deterministic tie-breaker.
- Test `countUnusedApproved` against a mix of approved, archived, used,
  future-scheduled, and never-used puzzles.
- Test `scheduleDailyPuzzle` preserves an existing date assignment, selects an
- unused puzzle before recycling, ignores future usage, recycles the oldest
  used puzzle after pool exhaustion, returns `null` only when no approved
  puzzles exist, and re-reads the winning row after a unique-date race.
- Test schedule-history pagination with more than one PostgREST page.
- Test the cron result includes Getting Warmer's unused-puzzle count and retains
  independent per-game error reporting.
- Run the focused Getting Warmer tests, full test suite, typecheck, and lint for
  changed files.
