# Weekly Daily Review

Date: 2026-10-15

## Problem

Every daily game picks its content automatically (least-recently-used rotation, run
by `/api/cron/daily`). Nobody looks at a pick before players see it, so weak or broken
content goes live unchecked. The only way to intervene is each game's separate admin
schedule tab, which nobody visits proactively.

## Goals

1. Every few days (default weekly) the admins get an email saying upcoming dailies are
   ready to review, with one link.
2. One admin page shows the next 10 days × 5 games. For each slot an admin can approve
   the current pick, swap it for one of 3 suggested alternates, or swap and retire the
   bad pick so it is never auto-picked again.
3. Review is a safety net: an unreviewed slot ships its auto-pick exactly as today.
   Skipping a week changes nothing for players.
4. Either admin can approve; no double sign-off.

## Non-goals

- AnyGuessr (multi-round lineups), Brain Dead (externally fetched question sets) and
  Slippery Slope (no schedule) are out of scope for v1.
- No approve/swap actions inside the email; it only links to the page.
- No generation of new content; alternates come from each game's existing pool.
- No blocking of unreviewed content.

## Scope: games

| Game | Schedule table | Content pool | Retire mechanism |
|---|---|---|---|
| Hot Takes | `hot_takes_schedule.category_id` | `hot_takes_categories` (`status = approved`) | `status = "rejected"` |
| Ball Knowledge | `ball_knowledge_schedule.category` | hardcoded `CATEGORIES` | new `ball_knowledge_retired_categories` row |
| Getting Warmer | `daily_getting_warmer_puzzles.puzzle_id` | `getting_warmer_puzzles` (`status = approved`) | `status = "archived"` |
| FreezeFrames | `daily_freezeframes_puzzles.puzzle_id` | `freezeframes_puzzles` (`status = approved`) | `status = "archived"` |
| Chain Link | `daily_chain_puzzles.puzzle_id` | `chain_puzzles` (`status = approved`) | `status = "rejected"` |

Each value is already allowed by that table's status check constraint, so no
constraint changes are needed. Un-retiring sets `status` back to `"approved"` (or deletes the Ball Knowledge row).
Each game's existing LRU picker must exclude retired content; the four DB-backed
pools already filter on `status = "approved"`, and Ball Knowledge's
`chooseLruCategory` input is filtered against the retired table.

## Design

### Data model

Migration `supabase/migrations/<ts>_daily_review.sql`:

```sql
create table public.daily_reviews (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  publish_date date not null,
  content_id text not null,     -- category id/name or puzzle id that was approved
  reviewed_by text not null,    -- admin email
  reviewed_at timestamptz not null default now(),
  unique (game, publish_date)
);

create table public.ball_knowledge_retired_categories (
  category text primary key,
  retired_at timestamptz not null default now()
);

create table public.daily_review_emails (
  id uuid primary key default gen_random_uuid(),
  sent_at timestamptz not null default now(),
  unreviewed_count int not null
);
-- RLS enabled; revoke all from anon, authenticated (server-only via service role)
```

A slot is **reviewed** only when a `daily_reviews` row exists for `(game, date)` **and**
its `content_id` equals the currently scheduled content. If the schedule changes from
anywhere else (a game's own admin page, a manual assign), the slot reverts to
unreviewed automatically. Approving again upserts the row.

Add the three tables to `lib/supabase/database.types.ts`.

### Adapters

`lib/daily-review/types.ts`:

```ts
export type ReviewGame =
  | "hot-takes" | "ball-knowledge" | "getting-warmer" | "freezeframes" | "chainlink";

export interface ReviewPreview {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  adminHref: string;
}

export interface ReviewAdapter {
  game: ReviewGame;
  listScheduled(db, from: string, to: string):
    Promise<{ date: string; contentId: string; preview: ReviewPreview }[]>;
  /** Next `n` candidates by the game's LRU order, excluding anything scheduled in the review window and retired content. */
  suggestAlternates(db, date: string, n: number):
    Promise<{ contentId: string; preview: ReviewPreview }[]>;
  /** Replace the schedule row for `date` with `contentId`. */
  swap(db, date: string, contentId: string): Promise<void>;
  retire(db, contentId: string): Promise<void>;
}
```

One file per game in `lib/daily-review/adapters/`, built on that game's existing
`schedule-service.ts` (reuse its LRU ordering; do not reimplement it). A registry
`lib/daily-review/adapters/index.ts` exports `REVIEW_ADAPTERS`.

`lib/daily-review/service.ts` holds game-agnostic logic:

- `getReviewGrid(db, from, to)` — calls every adapter's `listScheduled`, joins
  `daily_reviews`, and returns `{ game, date, contentId, preview, review: { by, at } | null, locked }[]`.
- `approve(db, { game, date, email })` — upserts `daily_reviews` with the currently
  scheduled content id.
- `swap(db, { game, date, contentId, retire, email })` — reads the current content id,
  calls `adapter.swap`, optionally `adapter.retire(old)`, then upserts `daily_reviews`
  with the new content id (choosing an alternate counts as approving it).
- `countUnreviewed(db, from, to)`.
- `isLocked(date)` — true for today (UTC) and earlier; locked slots reject approve/swap.

### Cron

In `/api/cron/daily`:

1. For the five in-scope games, schedule **today through today + 9** (10 days) using
   each game's existing lazy scheduler, replacing the current today/tomorrow-only fill.
   Chain Link's top-up window widens to at least 10 days.
2. Add a `"review-email"` job that runs after scheduling: if the last
   `daily_review_emails.sent_at` is at least `REVIEW_EMAIL_EVERY_DAYS` days ago
   (default `7`, or never sent), and `countUnreviewed(tomorrow, today + 9) > 0`, send
   the email and insert a `daily_review_emails` row. No email when everything is
   already reviewed.

This reuses the existing single cron (06:00 UTC); no new Vercel cron entry.

### Email

- Provider: Gmail SMTP via `nodemailer` (`smtp.gmail.com`, port 465, TLS), wrapped in
  `lib/email/send.ts` so the provider can be swapped later. No domain verification or
  third-party email service; Gmail's ~500/day limit is far above the ~1/week volume.
- Env: `SMTP_USER` (the sending Gmail address, also used as `From`) and `SMTP_PASS` (a
  Google app password; requires 2FA on that account). Recipients come from the
  existing `ADMIN_EMAILS`. If either SMTP var is unset the job logs and reports
  `{ skipped: "SMTP not configured" }` instead of failing.
- Runs in the Node.js runtime (the cron route already does; `nodemailer` needs raw
  sockets, so it must not move to Edge).
- Content (plain HTML, no images): subject `"N dailies need review (Oct 16–Oct 25)"`; a
  short per-game count list (`Hot Takes — 6 unreviewed, first: Fri Oct 17`); one button
  linking to `${NEXT_PUBLIC_SITE_URL}/admin/review`.

### Review page

`app/admin/review/page.tsx`, behind the existing `AdminGate`. Added as the first card
on `/admin`, showing an "N need review" count.

- Grid: rows are the next 10 days, columns are the 5 games.
- Cell states: **reviewed** (✓ plus the reviewer's name), **needs review** (●, with
  stronger emphasis for tomorrow and the day after), **locked** (today; read-only).
- Clicking a cell opens a side panel: the current pick's preview with a link to its
  detail in that game's admin, plus 3 alternates (fetched lazily). Actions:
  **Approve**; **Swap** per alternate; **Swap + retire** per alternate (inline confirm).
- Bulk: "Approve all unreviewed" per row and per column.
- After every action the grid refetches.
- Matches the existing dark admin styling (`AdminShell`) and works at phone width (the
  review email is likely opened on a phone).

Ball Knowledge's admin page gets a **Retired** list with an Un-retire button. The other
four games restore retired content through their existing status controls
(`rejected`/`archived` → `approved`).

### API routes

All under `app/api/admin/daily-review/`, guarded by the existing `ADMIN_EMAILS` admin
guard; the reviewer email comes from the signed-in session, never the request body.

- `GET /` → review grid for today … today + 9.
- `GET /alternates?game=&date=` → 3 alternates.
- `POST /approve` `{ game, date }` (bulk variant: `{ items: { game, date }[] }`)
- `POST /swap` `{ game, date, contentId, retire?: boolean }`
- `GET /api/admin/ball-knowledge/retired` and `DELETE` `{ category }` to un-retire.

Bodies are validated with zod; `game` must be one of the `ReviewGame` values.

## Error handling

- Approve or swap on a locked date → 409 `LOCKED`.
- Swap to content that has become ineligible (retired or already scheduled elsewhere in
  the window since the panel loaded) → 409 `STALE`; the UI refetches alternates.
- Concurrent edits by both admins: last write wins; all actions are idempotent upserts,
  and the grid refetches after each action.
- One adapter failing in `getReviewGrid` must not blank the page: that game's column
  shows an error state and the others render.
- Email send failure is reported in the cron job's outcome (like other jobs) and does
  not insert a `daily_review_emails` row, so the next cron run retries.
- If an adapter's pool is too small for 3 alternates, show however many exist
  (possibly zero, with "No alternates — add content in <game> admin").

## Testing

- Unit (vitest): `service.ts` reviewed-status logic (matching vs mismatched
  `content_id`), `isLocked`, the email due-date check, and each adapter's
  `suggestAlternates` exclusion rules (scheduled-in-window and retired content).
- Unit: Ball Knowledge LRU excludes retired categories.
- Route tests: auth guard rejects non-admins; locked date returns 409; swap with
  `retire: true` archives the old content.
- Manual: run the cron locally with `SMTP_USER`/`SMTP_PASS` unset (skip path), then
  set with `ADMIN_EMAILS` limited to the developer and confirm the email arrives.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Trade-offs

- Rolling 10-day horizon instead of discrete "weeks": the page always shows what is
  coming, and the email cadence is independent of the review window. Cost: the cron
  now pre-commits 10 days of LRU picks, so content added to a pool shows up as an
  alternate or in auto-picks ~10 days out, not the next day.
- Review state keyed on the content id rather than a status column on each schedule
  table keeps the change to one new table and makes out-of-band edits visible.
- Today is locked even if unreviewed, because players may already have played it.
