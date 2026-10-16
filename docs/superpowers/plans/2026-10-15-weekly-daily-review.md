# Weekly Daily Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admins review the next 10 days of dailies for five games on one page (approve, swap to an alternate, or swap and retire), and get a Gmail email every few days when slots are unreviewed.

**Architecture:** The daily cron pre-fills 10 days of real schedule rows. A per-game `ReviewAdapter` lists scheduled content, ranks alternates, swaps and retires. A game-agnostic service joins adapters with a `daily_reviews` table (keyed on the content id, so out-of-band edits revert to unreviewed). Thin admin API routes and one client admin page sit on top; the cron sends the email through nodemailer.

**Tech Stack:** Next.js App Router route handlers, Supabase (service-role client), vitest, nodemailer (Gmail SMTP).

**Spec:** `docs/superpowers/specs/2026-10-15-weekly-daily-review-design.md`

## Global Constraints

- In-scope games, exactly: `hot-takes`, `ball-knowledge`, `getting-warmer`, `freezeframes`, `chainlink`.
- Dates are UTC `YYYY-MM-DD`. Review window = today through today + 9 (10 days). Today and earlier are locked.
- 3 alternates per slot.
- Retire values: Hot Takes `"rejected"`, Chain Link `"rejected"`, Getting Warmer `"archived"`, FreezeFrames `"archived"`, Ball Knowledge a row in `ball_knowledge_retired_categories`.
- Every admin route calls `checkAdmin()` from `@/lib/chainlink/admin-guard` and returns 403 `{ error: "Unauthorized" }` when it returns null. The reviewer email comes from `checkAdmin()`, never from the request body.
- Every new `lib/` module that touches the DB starts with `import "server-only";`.
- Env: `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAILS`, `REVIEW_EMAIL_EVERY_DAYS` (default 7), `NEXT_PUBLIC_SITE_URL`. Missing SMTP vars → skip, never fail.
- Email is sent from the cron route, which runs in the Node.js runtime; do not add `export const runtime = "edge"` anywhere on that path.
- Admin UI matches the existing admin pages: `AdminShell`, dark inline styles (`#121213` / `#1c1c1e` / `#3a3a3c`), and must work at phone width (no horizontal page scroll; the grid itself may scroll horizontally inside its container).
- Do not run anything that sends PostHog events; blank `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` on any server you start.
- Verification gate: `pnpm typecheck`, `pnpm test`, `pnpm build`, and no new lint errors in touched files (`pnpm lint` has a pre-existing red baseline on `main`).

## Spec deviations (agreed in planning)

- **Un-retire UI only for Ball Knowledge.** The other four games already let admins move content from `rejected`/`archived` back to `approved` in their existing admin pages, so the generic Retired list and `/unretire` route are dropped. Ball Knowledge gets a Retired list on `/admin/ball-knowledge` because its categories have no status column.
- **Dark-only admin styling.** The spec said both themes; every admin page is dark-only via `AdminShell`, so the review page matches that.

## Review Focus

1. **A schedule edited outside the review page** (manual assign in a game's admin) must show as unreviewed, not keep a stale ✓. → Task 4 test "a review for different content does not count".
2. **Swapping to content that became ineligible** after the panel loaded (scheduled elsewhere in the window, or retired) must be refused with `STALE`, not double-schedule it. → Task 4 test "refuses a candidate already scheduled in the window".
3. **A game with a small or empty pool** must show zero alternates without crashing. → Task 4 test "returns fewer than 3 when the pool is small".
4. **One game's DB call failing** must not blank the grid. → Task 4 test "one failing adapter becomes a column error".
5. **Email misconfigured or SMTP failing** must not fail the cron or record a send, so the next run retries. → Task 7 tests "skips when SMTP is not configured" and "does not record a send that threw".

## File Structure

```
supabase/migrations/202610150000_daily_review.sql      tables: daily_reviews, ball_knowledge_retired_categories, daily_review_emails
lib/supabase/database.types.ts                          + the three tables
lib/daily-review/types.ts                               ReviewGame, ReviewPreview, ReviewAdapter, grid types, ReviewError
lib/daily-review/dates.ts                               todayUtc, addDays, reviewWindow, isLocked
lib/daily-review/store.ts                               ReviewStore over daily_reviews + daily_review_emails
lib/daily-review/service.ts                             getReviewGrid, summarize, listAlternates, approve, swap
lib/daily-review/adapters/pool-table.ts                 generic adapter for Hot Takes / Getting Warmer / FreezeFrames
lib/daily-review/adapters/ball-knowledge.ts
lib/daily-review/adapters/chainlink.ts
lib/daily-review/adapters/index.ts                      REVIEW_ADAPTERS, createReviewContext
lib/daily-review/email.ts                               isEmailDue, buildReviewEmail, sendReviewEmailIfDue
lib/email/send.ts                                       sendEmail via nodemailer Gmail SMTP
lib/ball-knowledge/schedule-service.ts                  retired-category helpers; LRU skips retired
app/api/admin/daily-review/route.ts                     GET grid + summary
app/api/admin/daily-review/alternates/route.ts          GET
app/api/admin/daily-review/approve/route.ts             POST
app/api/admin/daily-review/swap/route.ts                POST
app/api/admin/ball-knowledge/retired/route.ts           GET list, DELETE un-retire
app/api/cron/daily/route.ts                             10-day fill + review-email job
app/admin/review/page.tsx                               grid + side panel
app/admin/page.tsx                                      review card with count
app/admin/ball-knowledge/page.tsx                       Retired list
```

Tests live next to the code (`lib/**/x.test.ts`, matching `lib/chainlink/*.test.ts`) and in `tests/api/` for routes (matching `tests/api/cron-daily.test.ts`).

**Workspace:** another Claude session may share this checkout. Do the work in a sibling worktree: `git worktree add ../draft-anything-daily-review -b feat/daily-review`, then `pnpm install --frozen-lockfile --prefer-offline` and copy `.env.local` into it.

---

### Task 1: Migration and DB types

**Files:**
- Create: `supabase/migrations/202610150000_daily_review.sql`
- Modify: `lib/supabase/database.types.ts` (add three table blocks alphabetically inside `Tables`)

**Interfaces:**
- Produces: tables `daily_reviews`, `ball_knowledge_retired_categories`, `daily_review_emails` with typed `Row`/`Insert`/`Update`.

- [ ] **Step 1: Write the migration**

```sql
-- Admin review of upcoming dailies. A slot counts as reviewed only while the
-- scheduled content still equals content_id, so a schedule edited elsewhere
-- shows as unreviewed again.
create table public.daily_reviews (
  id           uuid primary key default extensions.gen_random_uuid(),
  game         text not null,
  publish_date date not null,
  content_id   text not null,
  reviewed_by  text not null,
  reviewed_at  timestamptz not null default now(),
  constraint daily_reviews_game
    check (game in ('hot-takes', 'ball-knowledge', 'getting-warmer', 'freezeframes', 'chainlink')),
  constraint daily_reviews_slot unique (game, publish_date)
);

-- Ball Knowledge categories are hardcoded, so retirement is a list of names.
create table public.ball_knowledge_retired_categories (
  category   text primary key,
  retired_at timestamptz not null default now()
);

-- One row per review email sent; the cron reads the latest to pace sends.
create table public.daily_review_emails (
  id               uuid primary key default extensions.gen_random_uuid(),
  sent_at          timestamptz not null default now(),
  unreviewed_count integer not null
);

alter table public.daily_reviews enable row level security;
alter table public.ball_knowledge_retired_categories enable row level security;
alter table public.daily_review_emails enable row level security;

-- Only the server reads and writes these tables, through the service role.
revoke all on table public.daily_reviews from anon, authenticated;
revoke all on table public.ball_knowledge_retired_categories from anon, authenticated;
revoke all on table public.daily_review_emails from anon, authenticated;
```

- [ ] **Step 2: Add the types by hand** (local `supabase gen types` hangs on this machine; match the generated format). Insert these blocks into `Database["public"]["Tables"]`, keeping alphabetical order:

```ts
      ball_knowledge_retired_categories: {
        Row: {
          category: string
          retired_at: string
        }
        Insert: {
          category: string
          retired_at?: string
        }
        Update: {
          category?: string
          retired_at?: string
        }
        Relationships: []
      }
```

```ts
      daily_review_emails: {
        Row: {
          id: string
          sent_at: string
          unreviewed_count: number
        }
        Insert: {
          id?: string
          sent_at?: string
          unreviewed_count: number
        }
        Update: {
          id?: string
          sent_at?: string
          unreviewed_count?: number
        }
        Relationships: []
      }
      daily_reviews: {
        Row: {
          content_id: string
          game: string
          id: string
          publish_date: string
          reviewed_at: string
          reviewed_by: string
        }
        Insert: {
          content_id: string
          game: string
          id?: string
          publish_date: string
          reviewed_at?: string
          reviewed_by: string
        }
        Update: {
          content_id?: string
          game?: string
          id?: string
          publish_date?: string
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: []
      }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202610150000_daily_review.sql lib/supabase/database.types.ts
git commit -m "feat(daily-review): tables for slot reviews, retired Ball Knowledge categories, and review emails"
```

Do **not** run `pnpm db:push`; the human applies the migration to the hosted DB at deploy time.

---

### Task 2: Shared types and date helpers

**Files:**
- Create: `lib/daily-review/types.ts`, `lib/daily-review/dates.ts`
- Test: `lib/daily-review/dates.test.ts`

**Interfaces:**
- Produces (types.ts):

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const REVIEW_GAMES = [
  "hot-takes", "ball-knowledge", "getting-warmer", "freezeframes", "chainlink",
] as const;
export type ReviewGame = (typeof REVIEW_GAMES)[number];

export type Db = SupabaseClient<Database>;

export interface ReviewPreview {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  /** That game's admin page, for full detail. */
  adminHref: string;
}

export interface ScheduledSlot { date: string; contentId: string; preview: ReviewPreview }
export interface Candidate { contentId: string; preview: ReviewPreview }

export interface ReviewAdapter {
  game: ReviewGame;
  name: string;
  /** Schedule rows with publish_date in [from, to], with previews. */
  listScheduled(db: Db, from: string, to: string): Promise<ScheduledSlot[]>;
  /**
   * Every eligible (non-retired) pool item in the order the game's own
   * scheduler would pick them for `date`. The service removes anything
   * already scheduled in the review window.
   */
  listCandidates(db: Db, date: string): Promise<Candidate[]>;
  /** Make `contentId` the content for `date`. `previous` is what was there (or null). */
  swap(db: Db, date: string, contentId: string, previous: string | null): Promise<void>;
  retire(db: Db, contentId: string): Promise<void>;
}

export interface ReviewCell {
  date: string;
  contentId: string | null;
  preview: ReviewPreview | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  locked: boolean;
}

export interface ReviewColumn {
  game: ReviewGame;
  name: string;
  /** Set when this game's adapter failed; `cells` is then empty. */
  error: string | null;
  cells: ReviewCell[];
}

export interface ReviewGrid { today: string; dates: string[]; columns: ReviewColumn[] }

export interface ReviewSummary {
  total: number;
  byGame: { game: ReviewGame; name: string; count: number; first: string | null }[];
}

export type ReviewErrorCode = "LOCKED" | "STALE" | "NOT_SCHEDULED" | "UNKNOWN_GAME";

export class ReviewError extends Error {
  constructor(public readonly code: ReviewErrorCode, message: string = code) {
    super(message);
    this.name = "ReviewError";
  }
}

export function isReviewGame(value: unknown): value is ReviewGame {
  return typeof value === "string" && (REVIEW_GAMES as readonly string[]).includes(value);
}
```

- Produces (dates.ts): `REVIEW_WINDOW_DAYS = 10`, `todayUtc(now?: Date): string`, `addDays(date: string, days: number): string`, `reviewWindow(today: string): string[]`, `isLocked(date: string, today: string): boolean`.

- [ ] **Step 1: Write the failing test** `lib/daily-review/dates.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { addDays, isLocked, reviewWindow, todayUtc } from "./dates";

describe("daily review dates", () => {
  it("uses the UTC date", () => {
    expect(todayUtc(new Date("2026-10-15T23:30:00-07:00"))).toBe("2026-10-16");
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("covers today and the next nine days", () => {
    const window = reviewWindow("2026-10-15");
    expect(window).toHaveLength(10);
    expect(window[0]).toBe("2026-10-15");
    expect(window[9]).toBe("2026-10-24");
  });

  it("locks today and the past, not tomorrow", () => {
    expect(isLocked("2026-10-14", "2026-10-15")).toBe(true);
    expect(isLocked("2026-10-15", "2026-10-15")).toBe(true);
    expect(isLocked("2026-10-16", "2026-10-15")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run lib/daily-review/dates.test.ts`
Expected: FAIL, cannot resolve `./dates`.

- [ ] **Step 3: Implement** `lib/daily-review/types.ts` (exactly the block above) and `lib/daily-review/dates.ts`:

```ts
/** Days shown for review: today through today + 9. */
export const REVIEW_WINDOW_DAYS = 10;

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function reviewWindow(today: string): string[] {
  return Array.from({ length: REVIEW_WINDOW_DAYS }, (_, i) => addDays(today, i));
}

/** Today's daily may already have been played, so only later days can change. */
export function isLocked(date: string, today: string): boolean {
  return date <= today;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run lib/daily-review/dates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/daily-review/types.ts lib/daily-review/dates.ts lib/daily-review/dates.test.ts
git commit -m "feat(daily-review): shared review types and UTC window helpers"
```

---

### Task 3: Review store

**Files:**
- Create: `lib/daily-review/store.ts`

**Interfaces:**
- Consumes: `Db`, `ReviewGame` from Task 2.
- Produces:

```ts
export interface ReviewRecord {
  game: ReviewGame;
  publishDate: string;
  contentId: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ReviewStore {
  listReviews(from: string, to: string): Promise<ReviewRecord[]>;
  upsertReview(review: Omit<ReviewRecord, "reviewedAt">): Promise<void>;
  lastEmailSentAt(): Promise<string | null>;
  recordEmail(unreviewedCount: number): Promise<void>;
}

export function createReviewStore(db: Db): ReviewStore;
```

This is thin DB glue; it is exercised through the route tests (Task 6) with a fake store, and manually in Task 11. No unit test of its own.

- [ ] **Step 1: Implement** `lib/daily-review/store.ts`

```ts
import "server-only";

import type { Db, ReviewGame } from "./types";

export interface ReviewRecord {
  game: ReviewGame;
  publishDate: string;
  contentId: string;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ReviewStore {
  listReviews(from: string, to: string): Promise<ReviewRecord[]>;
  upsertReview(review: Omit<ReviewRecord, "reviewedAt">): Promise<void>;
  lastEmailSentAt(): Promise<string | null>;
  recordEmail(unreviewedCount: number): Promise<void>;
}

export function createReviewStore(db: Db): ReviewStore {
  return {
    async listReviews(from, to) {
      const { data, error } = await db
        .from("daily_reviews")
        .select("game, publish_date, content_id, reviewed_by, reviewed_at")
        .gte("publish_date", from)
        .lte("publish_date", to);
      if (error) throw new Error(`Failed to load reviews: ${error.message}`);
      return (data ?? []).map((row) => ({
        game: row.game as ReviewGame,
        publishDate: row.publish_date,
        contentId: row.content_id,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
      }));
    },

    async upsertReview(review) {
      const { error } = await db.from("daily_reviews").upsert(
        {
          game: review.game,
          publish_date: review.publishDate,
          content_id: review.contentId,
          reviewed_by: review.reviewedBy,
          reviewed_at: new Date().toISOString(),
        },
        { onConflict: "game,publish_date" },
      );
      if (error) throw new Error(`Failed to save review: ${error.message}`);
    },

    async lastEmailSentAt() {
      const { data, error } = await db
        .from("daily_review_emails")
        .select("sent_at")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`Failed to load review emails: ${error.message}`);
      return data?.sent_at ?? null;
    },

    async recordEmail(unreviewedCount) {
      const { error } = await db
        .from("daily_review_emails")
        .insert({ unreviewed_count: unreviewedCount });
      if (error) throw new Error(`Failed to record review email: ${error.message}`);
    },
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/daily-review/store.ts
git commit -m "feat(daily-review): store for slot reviews and review-email log"
```

---

### Task 4: Review service

**Files:**
- Create: `lib/daily-review/service.ts`
- Test: `lib/daily-review/service.test.ts`

**Interfaces:**
- Consumes: Task 2 types/dates, `ReviewStore` from Task 3.
- Produces:

```ts
export interface ReviewContext { db: Db; adapters: ReviewAdapter[]; store: ReviewStore }
export const ALTERNATES_PER_SLOT = 3;
export function getReviewGrid(ctx: ReviewContext, today?: string): Promise<ReviewGrid>;
export function summarize(grid: ReviewGrid): ReviewSummary;
export function listAlternates(ctx: ReviewContext, game: ReviewGame, date: string, today?: string): Promise<Candidate[]>;
export function approve(ctx: ReviewContext, input: { game: ReviewGame; date: string; email: string }, today?: string): Promise<void>;
export function swap(ctx: ReviewContext, input: { game: ReviewGame; date: string; contentId: string; retire: boolean; email: string }, today?: string): Promise<void>;
```

- [ ] **Step 1: Write the failing tests** `lib/daily-review/service.test.ts`

```ts
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

  it("returns fewer than 3 when the pool is small", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    const alts = await listAlternates(ctx([adapter]), "hot-takes", "2026-10-16", TODAY);
    expect(alts.map((a) => a.contentId)).toEqual(["b"]);
  });
});

describe("approve", () => {
  it("records the currently scheduled content", async () => {
    const store = fakeStore();
    await approve(ctx([fakeAdapter({ "2026-10-16": "a" }, [])], store), {
      game: "hot-takes", date: "2026-10-16", email: "j@x.com",
    }, TODAY);
    expect(store.upsertReview).toHaveBeenCalledWith({
      game: "hot-takes", publishDate: "2026-10-16", contentId: "a", reviewedBy: "j@x.com",
    });
  });

  it("refuses today", async () => {
    await expect(
      approve(ctx([fakeAdapter({ [TODAY]: "a" }, [])]), { game: "hot-takes", date: TODAY, email: "j" }, TODAY),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });

  it("refuses a day with nothing scheduled", async () => {
    await expect(
      approve(ctx([fakeAdapter({}, [])]), { game: "hot-takes", date: "2026-10-16", email: "j" }, TODAY),
    ).rejects.toMatchObject({ code: "NOT_SCHEDULED" });
  });
});

describe("swap", () => {
  it("swaps, retires the old pick when asked, and approves the new one", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    const store = fakeStore();
    await swap(ctx([adapter], store), {
      game: "hot-takes", date: "2026-10-16", contentId: "b", retire: true, email: "j",
    }, TODAY);
    expect(adapter.swap).toHaveBeenCalledWith(expect.anything(), "2026-10-16", "b", "a");
    expect(adapter.retire).toHaveBeenCalledWith(expect.anything(), "a");
    expect(store.rows[0]).toMatchObject({ contentId: "b", reviewedBy: "j" });
  });

  it("does not retire without the flag", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    await swap(ctx([adapter]), {
      game: "hot-takes", date: "2026-10-16", contentId: "b", retire: false, email: "j",
    }, TODAY);
    expect(adapter.retire).not.toHaveBeenCalled();
  });

  it("refuses a candidate already scheduled in the window", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a", "2026-10-19": "b" }, ["a", "b", "c"]);
    await expect(
      swap(ctx([adapter]), { game: "hot-takes", date: "2026-10-16", contentId: "b", retire: false, email: "j" }, TODAY),
    ).rejects.toMatchObject({ code: "STALE" });
    expect(adapter.swap).not.toHaveBeenCalled();
  });

  it("refuses an unknown or retired candidate", async () => {
    const adapter = fakeAdapter({ "2026-10-16": "a" }, ["a", "b"]);
    await expect(
      swap(ctx([adapter]), { game: "hot-takes", date: "2026-10-16", contentId: "zzz", retire: false, email: "j" }, TODAY),
    ).rejects.toMatchObject({ code: "STALE" });
  });

  it("refuses today", async () => {
    const adapter = fakeAdapter({ [TODAY]: "a" }, ["a", "b"]);
    await expect(
      swap(ctx([adapter]), { game: "hot-takes", date: TODAY, contentId: "b", retire: false, email: "j" }, TODAY),
    ).rejects.toMatchObject({ code: "LOCKED" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run lib/daily-review/service.test.ts`
Expected: FAIL, cannot resolve `./service`.

- [ ] **Step 3: Implement** `lib/daily-review/service.ts`

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run lib/daily-review/service.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib/daily-review/service.ts lib/daily-review/service.test.ts
git commit -m "feat(daily-review): grid, alternates, approve and swap with stale and lock checks"
```

---

### Task 5: Game adapters (and Ball Knowledge retirement)

**Files:**
- Modify: `lib/ball-knowledge/schedule-service.ts`
- Create: `lib/daily-review/adapters/pool-table.ts`, `lib/daily-review/adapters/ball-knowledge.ts`, `lib/daily-review/adapters/chainlink.ts`, `lib/daily-review/adapters/index.ts`
- Test: `lib/daily-review/adapters/pool-table.test.ts`, `lib/daily-review/adapters/chainlink.test.ts`, `lib/ball-knowledge/schedule-service.test.ts`

**Interfaces:**
- Consumes: `ReviewAdapter`, `Db`, `Candidate`, `ScheduledSlot`, `ReviewPreview` (Task 2); `orderByLru` from `@/lib/schedule/lru`; `createReviewStore` (Task 3); `ReviewContext` (Task 4).
- Produces:
  - `lib/ball-knowledge/schedule-service.ts`: `listRetiredCategories(db): Promise<string[]>`, `retireCategory(db, category): Promise<void>`, `unretireCategory(db, category): Promise<void>`, `activeCategories(retired: readonly string[]): string[]`, `lastUsedBefore(rows, date): Map<string, string>`. `pickLruCategory` and `autoScheduleCategories` skip retired categories.
  - `lastUsedBefore` is also used by the pool-table adapter, so put the generic version in `lib/schedule/lru.ts`:
    `export function lastUsedBefore(rows: { key: string; date: string }[], date: string): Map<string, string>`
  - `lib/daily-review/adapters/index.ts`: `REVIEW_ADAPTERS: ReviewAdapter[]` (order: hot-takes, ball-knowledge, getting-warmer, freezeframes, chainlink) and `createReviewContext(db: Db): ReviewContext`.

- [ ] **Step 1: Write failing tests**

`lib/ball-knowledge/schedule-service.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { activeCategories } from "./schedule-service";
import { CATEGORIES } from "./categories";

describe("activeCategories", () => {
  it("drops retired categories and keeps pool order", () => {
    const retired = [CATEGORIES[1]!];
    const active = activeCategories(retired);
    expect(active).not.toContain(CATEGORIES[1]);
    expect(active[0]).toBe(CATEGORIES[0]);
    expect(active).toHaveLength(CATEGORIES.length - 1);
  });
});
```

Append to the existing `lib/schedule/lru.test.ts` (add `lastUsedBefore` to its `./lru` import):

```ts
describe("lastUsedBefore", () => {
  it("keeps the latest date per key, ignoring rows on or after the target date", () => {
    const map = lastUsedBefore(
      [
        { key: "a", date: "2026-10-01" },
        { key: "a", date: "2026-10-09" },
        { key: "b", date: "2026-10-20" },
      ],
      "2026-10-16",
    );
    expect(map.get("a")).toBe("2026-10-09");
    expect(map.has("b")).toBe(false);
  });
});
```

`lib/daily-review/adapters/pool-table.test.ts` — tests the pure ranking the generic adapter uses:

```ts
import { describe, expect, it } from "vitest";
import { rankPool } from "./pool-table";

describe("rankPool", () => {
  it("puts never-used first, then oldest-used, judged before the target date", () => {
    const pool = [{ id: "old" }, { id: "fresh" }, { id: "recent" }];
    const history = [
      { key: "old", date: "2026-09-01" },
      { key: "recent", date: "2026-10-10" },
      // Future rows do not count as use for an earlier date.
      { key: "fresh", date: "2026-10-20" },
    ];
    expect(rankPool(pool, history, "2026-10-16").map((p) => p.id)).toEqual(["fresh", "old", "recent"]);
  });
});
```

`lib/daily-review/adapters/chainlink.test.ts` — swap must keep chain statuses consistent and expire the cache:

```ts
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
      expect.objectContaining({ table: "chain_puzzles", filter: "new", values: expect.objectContaining({ status: "scheduled" }) }),
    );
    expect(calls).toContainEqual(
      expect.objectContaining({ table: "chain_puzzles", filter: "old", values: expect.objectContaining({ status: "approved" }) }),
    );
    expect(revalidateTag).toHaveBeenCalledWith("chainlink-daily-2026-10-16", { expire: 0 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run lib/ball-knowledge/schedule-service.test.ts lib/schedule/lru.test.ts lib/daily-review/adapters`
Expected: FAIL (missing exports/modules).

- [ ] **Step 3: Add `lastUsedBefore` to `lib/schedule/lru.ts`** (append):

```ts
/**
 * Key → latest date it ran strictly before `date`. Rows on or after `date`
 * do not count, so a future booking does not hide an item from an earlier day.
 */
export function lastUsedBefore(
  rows: readonly { key: string; date: string }[],
  date: string,
): Map<string, string> {
  const lastUsed = new Map<string, string>();
  for (const row of rows) {
    if (row.date >= date) continue;
    const previous = lastUsed.get(row.key);
    if (!previous || row.date > previous) lastUsed.set(row.key, row.date);
  }
  return lastUsed;
}
```

- [ ] **Step 4: Ball Knowledge retirement** in `lib/ball-knowledge/schedule-service.ts`. Add after `listScheduleRows`:

```ts
/** Retired category names; the review page retires a category it never wants again. */
export async function listRetiredCategories(db: SupabaseClient<Database>): Promise<string[]> {
  const { data, error } = await db.from("ball_knowledge_retired_categories").select("category");
  if (error) throw new Error(`Failed to load retired categories: ${error.message}`);
  return (data ?? []).map((row) => row.category);
}

export async function retireCategory(db: SupabaseClient<Database>, category: string): Promise<void> {
  const { error } = await db.from("ball_knowledge_retired_categories").insert({ category });
  if (error && error.code !== "23505") {
    throw new Error(`Failed to retire category: ${error.message}`);
  }
}

export async function unretireCategory(db: SupabaseClient<Database>, category: string): Promise<void> {
  const { error } = await db.from("ball_knowledge_retired_categories").delete().eq("category", category);
  if (error) throw new Error(`Failed to un-retire category: ${error.message}`);
}

/** The rotation pool, in CATEGORIES order, without retired categories. */
export function activeCategories(retired: readonly string[]): string[] {
  const skip = new Set(retired);
  return CATEGORIES.filter((category) => !skip.has(category));
}
```

Then change `pickLruCategory`:

```ts
export async function pickLruCategory(
  db: SupabaseClient<Database>,
): Promise<string | null> {
  const [rows, retired] = await Promise.all([listScheduleRows(db), listRetiredCategories(db)]);
  const lastUsed = computeLastUsedByCategory(rows);
  return pickLru(activeCategories(retired), (category) => category, lastUsed);
}
```

And in `autoScheduleCategories`, replace `const rows = await listScheduleRows(db);` and the `orderByLru(CATEGORIES, ...)` line with:

```ts
  const [rows, retired] = await Promise.all([listScheduleRows(db), listRetiredCategories(db)]);
```

```ts
  const ordered = orderByLru(activeCategories(retired), (category) => category, lastUsed);
```

- [ ] **Step 5: Generic pool-table adapter** `lib/daily-review/adapters/pool-table.ts`

```ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { lastUsedBefore, orderByLru } from "@/lib/schedule/lru";
import type { Candidate, Db, ReviewAdapter, ReviewGame, ReviewPreview, ScheduledSlot } from "../types";

type Row = Record<string, unknown> & { id: string };

export interface PoolTableConfig {
  game: ReviewGame;
  name: string;
  scheduleTable: string;
  /** Column on the schedule table holding the pool row's id. */
  contentColumn: "category_id" | "puzzle_id";
  poolTable: string;
  /** Select list for the pool table; must include `id`. */
  poolColumns: string;
  /** Status that removes an item from the approved pool. */
  retiredStatus: "rejected" | "archived";
  toPreview(row: Row): ReviewPreview;
}

/** Rows fetched per request; a single response stops at 1000. */
const PAGE_SIZE = 1000;

/** Pool in the order the game's LRU scheduler would pick it for `date`. */
export function rankPool<T extends { id: string }>(
  pool: readonly T[],
  history: readonly { key: string; date: string }[],
  date: string,
): T[] {
  return orderByLru(pool, (item) => item.id, lastUsedBefore(history, date));
}

/**
 * Adapter for games whose daily is one row from an approved pool table
 * (Hot Takes, Getting Warmer, FreezeFrames). The table names vary, so this
 * uses the untyped client; each call site's columns are listed in its config.
 */
export function poolTableAdapter(config: PoolTableConfig): ReviewAdapter {
  const raw = (db: Db) => db as unknown as SupabaseClient;

  async function loadPool(db: Db, ids?: string[]): Promise<Row[]> {
    const base = raw(db).from(config.poolTable).select(config.poolColumns);
    const { data, error } = ids
      ? await base.in("id", ids)
      : await base.eq("status", "approved").order("created_at", { ascending: true });
    if (error) throw new Error(`Failed to load ${config.poolTable}: ${error.message}`);
    return (data ?? []) as unknown as Row[];
  }

  async function loadHistory(db: Db): Promise<{ key: string; date: string }[]> {
    const rows: { key: string; date: string }[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await raw(db)
        .from(config.scheduleTable)
        .select(`${config.contentColumn}, publish_date`)
        .order("publish_date", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Failed to load ${config.scheduleTable}: ${error.message}`);
      const page = (data ?? []) as Record<string, string>[];
      rows.push(...page.map((r) => ({ key: r[config.contentColumn]!, date: r.publish_date! })));
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  return {
    game: config.game,
    name: config.name,

    async listScheduled(db, from, to): Promise<ScheduledSlot[]> {
      const { data, error } = await raw(db)
        .from(config.scheduleTable)
        .select(`${config.contentColumn}, publish_date`)
        .gte("publish_date", from)
        .lte("publish_date", to);
      if (error) throw new Error(`Failed to load ${config.scheduleTable}: ${error.message}`);
      const rows = (data ?? []) as Record<string, string>[];
      if (rows.length === 0) return [];

      const pool = await loadPool(db, rows.map((r) => r[config.contentColumn]!));
      const byId = new Map(pool.map((row) => [row.id, row]));
      return rows.map((r) => {
        const contentId = r[config.contentColumn]!;
        const row = byId.get(contentId);
        return {
          date: r.publish_date!,
          contentId,
          preview: row ? config.toPreview(row) : { title: "(missing)", adminHref: `/admin/${config.game}` },
        };
      });
    },

    async listCandidates(db, date): Promise<Candidate[]> {
      const [pool, history] = await Promise.all([loadPool(db), loadHistory(db)]);
      return rankPool(pool, history, date).map((row) => ({ contentId: row.id, preview: config.toPreview(row) }));
    },

    async swap(db, date, contentId) {
      const { error } = await raw(db)
        .from(config.scheduleTable)
        .upsert({ publish_date: date, [config.contentColumn]: contentId }, { onConflict: "publish_date" });
      if (error) throw new Error(`Failed to swap ${config.game} for ${date}: ${error.message}`);
    },

    async retire(db, contentId) {
      const { error } = await raw(db)
        .from(config.poolTable)
        .update({ status: config.retiredStatus })
        .eq("id", contentId);
      if (error) throw new Error(`Failed to retire ${config.game} ${contentId}: ${error.message}`);
    },
  };
}
```

- [ ] **Step 6: Ball Knowledge adapter** `lib/daily-review/adapters/ball-knowledge.ts`

```ts
import "server-only";

import { orderByLru, lastUsedBefore } from "@/lib/schedule/lru";
import {
  activeCategories,
  listRetiredCategories,
  listSchedule,
  retireCategory,
} from "@/lib/ball-knowledge/schedule-service";
import type { ReviewAdapter, ReviewPreview } from "../types";

const preview = (category: string): ReviewPreview => ({
  title: category,
  adminHref: "/admin/ball-knowledge",
});

export const ballKnowledgeAdapter: ReviewAdapter = {
  game: "ball-knowledge",
  name: "Ball Knowledge",

  async listScheduled(db, from, to) {
    const { data, error } = await db
      .from("ball_knowledge_schedule")
      .select("category, publish_date")
      .gte("publish_date", from)
      .lte("publish_date", to);
    if (error) throw new Error(`Failed to load ball knowledge schedule: ${error.message}`);
    return (data ?? []).map((row) => ({
      date: row.publish_date,
      contentId: row.category,
      preview: preview(row.category),
    }));
  },

  async listCandidates(db, date) {
    const [rows, retired] = await Promise.all([listSchedule(db), listRetiredCategories(db)]);
    const lastUsed = lastUsedBefore(rows.map((r) => ({ key: r.category, date: r.publish_date })), date);
    return orderByLru(activeCategories(retired), (c) => c, lastUsed).map((category) => ({
      contentId: category,
      preview: preview(category),
    }));
  },

  async swap(db, date, contentId) {
    const { error } = await db
      .from("ball_knowledge_schedule")
      .upsert({ publish_date: date, category: contentId }, { onConflict: "publish_date" });
    if (error) throw new Error(`Failed to swap ball knowledge for ${date}: ${error.message}`);
  },

  retire: (db, contentId) => retireCategory(db, contentId),
};
```

- [ ] **Step 7: Chain Link adapter** `lib/daily-review/adapters/chainlink.ts`

```ts
import "server-only";

import { revalidateTag } from "next/cache";
import { dailyChainTag } from "@/lib/chainlink/daily-cache";
import type { Db, ReviewAdapter, ReviewPreview } from "../types";

interface ChainRow {
  id: string;
  words: unknown;
  difficulty: string;
  created_by: string | null;
}

function preview(row: ChainRow): ReviewPreview {
  const words = Array.isArray(row.words) ? (row.words as string[]) : [];
  const generated = row.created_by === "cron" ? " · generated, not human-reviewed" : "";
  return {
    title: words.join(" → ") || "(no words)",
    subtitle: `${row.difficulty}${generated}`,
    adminHref: "/admin/chains",
  };
}

async function setStatus(db: Db, id: string, status: string) {
  const { error } = await db
    .from("chain_puzzles")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Failed to set chain ${id} to ${status}: ${error.message}`);
}

export const chainlinkAdapter: ReviewAdapter = {
  game: "chainlink",
  name: "Chain Link",

  async listScheduled(db, from, to) {
    const { data, error } = await db
      .from("daily_chain_puzzles")
      .select("puzzle_id, publish_date")
      .gte("publish_date", from)
      .lte("publish_date", to);
    if (error) throw new Error(`Failed to load chain schedule: ${error.message}`);
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const { data: chains, error: chainError } = await db
      .from("chain_puzzles")
      .select("id, words, difficulty, created_by")
      .in("id", rows.map((r) => r.puzzle_id));
    if (chainError) throw new Error(`Failed to load chains: ${chainError.message}`);
    const byId = new Map((chains ?? []).map((c) => [c.id, c]));

    return rows.map((r) => {
      const chain = byId.get(r.puzzle_id);
      return {
        date: r.publish_date,
        contentId: r.puzzle_id,
        preview: chain ? preview(chain) : { title: "(missing)", adminHref: "/admin/chains" },
      };
    });
  },

  // Chain Link never recycles: candidates are approved chains not yet on the
  // calendar, best score first, matching the scheduler's tie-break.
  async listCandidates(db) {
    const { data, error } = await db
      .from("chain_puzzles")
      .select("id, words, difficulty, created_by")
      .eq("status", "approved")
      .order("score", { ascending: false });
    if (error) throw new Error(`Failed to load approved chains: ${error.message}`);
    return (data ?? []).map((row) => ({ contentId: row.id, preview: preview(row) }));
  },

  async swap(db, date, contentId, previous) {
    const { error } = await db
      .from("daily_chain_puzzles")
      .upsert({ publish_date: date, puzzle_id: contentId }, { onConflict: "publish_date" });
    if (error) throw new Error(`Failed to swap chain for ${date}: ${error.message}`);

    await setStatus(db, contentId, "scheduled");
    // Back into the pool; retire() runs after this when the admin also retires it.
    if (previous && previous !== contentId) await setStatus(db, previous, "approved");
    revalidateTag(dailyChainTag(date), { expire: 0 });
  },

  retire: (db, contentId) => setStatus(db, contentId, "rejected"),
};
```

- [ ] **Step 8: Registry** `lib/daily-review/adapters/index.ts`

```ts
import "server-only";

import { roundLabel } from "@/lib/freezeframes/puzzle-db";
import { createReviewStore } from "../store";
import type { ReviewContext } from "../service";
import type { Db, ReviewAdapter } from "../types";
import { ballKnowledgeAdapter } from "./ball-knowledge";
import { chainlinkAdapter } from "./chainlink";
import { poolTableAdapter } from "./pool-table";

const asRound = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const REVIEW_ADAPTERS: ReviewAdapter[] = [
  poolTableAdapter({
    game: "hot-takes",
    name: "Hot Takes",
    scheduleTable: "hot_takes_schedule",
    contentColumn: "category_id",
    poolTable: "hot_takes_categories",
    poolColumns: "id, name, cover_image_url",
    retiredStatus: "rejected",
    toPreview: (row) => ({
      title: String(row.name),
      imageUrl: (row.cover_image_url as string | null) ?? undefined,
      adminHref: "/admin/hot-takes",
    }),
  }),
  ballKnowledgeAdapter,
  poolTableAdapter({
    game: "getting-warmer",
    name: "Getting Warmer",
    scheduleTable: "daily_getting_warmer_puzzles",
    contentColumn: "puzzle_id",
    poolTable: "getting_warmer_puzzles",
    poolColumns: "id, answer, clues",
    retiredStatus: "archived",
    toPreview: (row) => ({
      title: String(row.answer).toUpperCase(),
      subtitle: Array.isArray(row.clues) ? String(row.clues[0] ?? "") : undefined,
      adminHref: "/admin/getting-warmer",
    }),
  }),
  poolTableAdapter({
    game: "freezeframes",
    name: "FreezeFrames",
    scheduleTable: "daily_freezeframes_puzzles",
    contentColumn: "puzzle_id",
    poolTable: "freezeframes_puzzles",
    poolColumns: "id, movie, song, show, album",
    retiredStatus: "archived",
    toPreview: (row) => {
      const movie = asRound(row.movie);
      return {
        title: roundLabel(movie),
        subtitle: [row.song, row.show, row.album].map((r) => roundLabel(asRound(r))).join(" · "),
        imageUrl: typeof movie.img === "string" ? movie.img : undefined,
        adminHref: "/admin/freezeframes",
      };
    },
  }),
  chainlinkAdapter,
];

export function createReviewContext(db: Db): ReviewContext {
  return { db, adapters: REVIEW_ADAPTERS, store: createReviewStore(db) };
}
```

If `roundLabel` is not exported from `lib/freezeframes/puzzle-db.ts` (it is at line 34 as of planning), export it.

- [ ] **Step 9: Run tests and typecheck**

Run: `pnpm vitest run lib/ball-knowledge lib/schedule lib/daily-review && pnpm typecheck`
Expected: PASS, no new type errors.

- [ ] **Step 10: Commit**

```bash
git add lib/schedule/lru.ts lib/schedule/lru.test.ts lib/ball-knowledge/schedule-service.ts lib/ball-knowledge/schedule-service.test.ts lib/daily-review/adapters
git commit -m "feat(daily-review): adapters for five games; Ball Knowledge rotation skips retired categories"
```

---

### Task 6: Admin API routes

**Files:**
- Create: `app/api/admin/daily-review/route.ts`, `app/api/admin/daily-review/alternates/route.ts`, `app/api/admin/daily-review/approve/route.ts`, `app/api/admin/daily-review/swap/route.ts`, `app/api/admin/daily-review/respond.ts`
- Test: `tests/api/daily-review.test.ts`

**Interfaces:**
- Consumes: `checkAdmin`, `createAdminClient`, `createReviewContext` (Task 5), service functions (Task 4), `ReviewError`, `isReviewGame`.
- Produces HTTP:
  - `GET /api/admin/daily-review` → `{ grid: ReviewGrid, summary: ReviewSummary }`
  - `GET /api/admin/daily-review/alternates?game=&date=` → `{ alternates: Candidate[] }`
  - `POST /api/admin/daily-review/approve` `{ items: { game, date }[] }` → `{ approved: number, failed: { game, date, error }[] }`
  - `POST /api/admin/daily-review/swap` `{ game, date, contentId, retire?: boolean }` → `{ ok: true }`
  - ReviewError → 409 `{ error: code }`; bad body → 400; not admin → 403.

- [ ] **Step 1: Write the failing test** `tests/api/daily-review.test.ts`

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/chainlink/admin-guard", () => ({ checkAdmin: vi.fn(async () => ({ email: "j@x.com" })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/daily-review/adapters", () => ({ createReviewContext: () => ({}) }));
vi.mock("@/lib/daily-review/service", async () => {
  const { ReviewError } = await import("@/lib/daily-review/types");
  return {
    getReviewGrid: vi.fn(async () => ({ today: "2026-10-15", dates: [], columns: [] })),
    summarize: vi.fn(() => ({ total: 0, byGame: [] })),
    listAlternates: vi.fn(async () => []),
    approve: vi.fn(async () => {}),
    swap: vi.fn(async () => {
      throw new ReviewError("LOCKED");
    }),
  };
});

import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { approve } from "@/lib/daily-review/service";
import { GET } from "@/app/api/admin/daily-review/route";
import { POST as approvePost } from "@/app/api/admin/daily-review/approve/route";
import { POST as swapPost } from "@/app/api/admin/daily-review/swap/route";

const post = (body: unknown) =>
  new Request("https://example.test", { method: "POST", body: JSON.stringify(body) });

afterEach(() => vi.clearAllMocks());

describe("daily review routes", () => {
  it("refuses non-admins", async () => {
    vi.mocked(checkAdmin).mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(403);
  });

  it("approves with the session email, ignoring any email in the body", async () => {
    const res = await approvePost(post({ items: [{ game: "hot-takes", date: "2026-10-16" }], email: "evil@x.com" }));
    expect(res.status).toBe(200);
    expect(approve).toHaveBeenCalledWith(expect.anything(), {
      game: "hot-takes", date: "2026-10-16", email: "j@x.com",
    });
  });

  it("rejects an unknown game", async () => {
    const res = await approvePost(post({ items: [{ game: "anyguessr", date: "2026-10-16" }] }));
    expect(res.status).toBe(400);
  });

  it("maps a locked swap to 409", async () => {
    const res = await swapPost(post({ game: "hot-takes", date: "2026-10-15", contentId: "b" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "LOCKED" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/api/daily-review.test.ts`
Expected: FAIL, route modules missing.

- [ ] **Step 3: Shared helpers** `app/api/admin/daily-review/respond.ts`

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { ReviewError, REVIEW_GAMES } from "@/lib/daily-review/types";

export const gameSchema = z.enum(REVIEW_GAMES);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 403 });
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

/** ReviewError → 409 with its code; anything else → 500. */
export function errorResponse(err: unknown) {
  if (err instanceof ReviewError) return NextResponse.json({ error: err.code }, { status: 409 });
  console.error("[daily-review]", err);
  return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Routes**

`app/api/admin/daily-review/route.ts`:

```ts
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { getReviewGrid, summarize } from "@/lib/daily-review/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, unauthorized } from "./respond";

export async function GET() {
  if (!(await checkAdmin())) return unauthorized();
  try {
    const grid = await getReviewGrid(createReviewContext(createAdminClient()));
    return NextResponse.json({ grid, summary: summarize(grid) });
  } catch (err) {
    return errorResponse(err);
  }
}
```

`app/api/admin/daily-review/alternates/route.ts`:

```ts
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { listAlternates } from "@/lib/daily-review/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, dateSchema, errorResponse, gameSchema, unauthorized } from "../respond";

export async function GET(req: Request) {
  if (!(await checkAdmin())) return unauthorized();
  const params = new URL(req.url).searchParams;
  const game = gameSchema.safeParse(params.get("game"));
  const date = dateSchema.safeParse(params.get("date"));
  if (!game.success || !date.success) return badRequest("game and date are required");
  try {
    const alternates = await listAlternates(createReviewContext(createAdminClient()), game.data, date.data);
    return NextResponse.json({ alternates });
  } catch (err) {
    return errorResponse(err);
  }
}
```

`app/api/admin/daily-review/approve/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { approve } from "@/lib/daily-review/service";
import { ReviewError } from "@/lib/daily-review/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, dateSchema, gameSchema, readJson, unauthorized } from "../respond";

const bodySchema = z.object({
  items: z.array(z.object({ game: gameSchema, date: dateSchema })).min(1).max(100),
});

/** Approves one slot or many ("approve all in this row/column"). Locked or empty slots are reported, not fatal. */
export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return unauthorized();
  const body = bodySchema.safeParse(await readJson(req));
  if (!body.success) return badRequest("items must be [{ game, date }]");

  const ctx = createReviewContext(createAdminClient());
  let approved = 0;
  const failed: { game: string; date: string; error: string }[] = [];
  for (const item of body.data.items) {
    try {
      await approve(ctx, { ...item, email: admin.email });
      approved++;
    } catch (err) {
      failed.push({ ...item, error: err instanceof ReviewError ? err.code : String(err) });
    }
  }
  return NextResponse.json({ approved, failed });
}
```

`app/api/admin/daily-review/swap/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { swap } from "@/lib/daily-review/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, dateSchema, errorResponse, gameSchema, readJson, unauthorized } from "../respond";

const bodySchema = z.object({
  game: gameSchema,
  date: dateSchema,
  contentId: z.string().min(1),
  retire: z.boolean().optional(),
});

export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return unauthorized();
  const body = bodySchema.safeParse(await readJson(req));
  if (!body.success) return badRequest("game, date and contentId are required");
  try {
    await swap(createReviewContext(createAdminClient()), {
      ...body.data,
      retire: body.data.retire ?? false,
      email: admin.email,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
```

Note: the approve test expects a 400 for an unknown game; the zod `gameSchema` enforces it.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run tests/api/daily-review.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/daily-review tests/api/daily-review.test.ts
git commit -m "feat(daily-review): admin API for grid, alternates, approve and swap"
```

---

### Task 7: Email (Gmail SMTP) and send-if-due

**Files:**
- Create: `lib/email/send.ts`, `lib/daily-review/email.ts`
- Test: `lib/daily-review/email.test.ts`
- Modify: `package.json` / `pnpm-lock.yaml` (add `nodemailer`)

**Interfaces:**
- Consumes: `ReviewContext`, `getReviewGrid`, `summarize` (Task 4); `ReviewSummary` (Task 2).
- Produces:
  - `lib/email/send.ts`: `isEmailConfigured(): boolean`, `sendEmail(input: { to: string[]; subject: string; html: string; text: string }): Promise<void>`
  - `lib/daily-review/email.ts`:
    - `isEmailDue(lastSentAt: string | null, now: Date, everyDays: number): boolean`
    - `buildReviewEmail(summary: ReviewSummary, dates: string[], siteUrl: string): { subject: string; html: string; text: string }`
    - `sendReviewEmailIfDue(ctx: ReviewContext, options?: { now?: Date; send?: typeof sendEmail; configured?: () => boolean }): Promise<{ sent: boolean; reason: string; unreviewed?: number }>`

- [ ] **Step 1: Install nodemailer**

Run: `pnpm add nodemailer && pnpm add -D @types/nodemailer`
(If `nodemailer` ships its own types in the installed version, `@types/nodemailer` is harmless; keep whichever makes `pnpm typecheck` pass.)

- [ ] **Step 2: Write failing tests** `lib/daily-review/email.test.ts`

```ts
import { describe, expect, it, vi } from "vitest";
import type { ReviewContext } from "./service";
import type { ReviewSummary } from "./types";

vi.mock("./service", () => ({
  getReviewGrid: vi.fn(async () => ({ today: "2026-10-15", dates: ["2026-10-15", "2026-10-24"], columns: [] })),
  summarize: vi.fn(
    (): ReviewSummary => ({
      total: 4,
      byGame: [{ game: "hot-takes", name: "Hot Takes", count: 4, first: "2026-10-17" }],
    }),
  ),
}));

import { summarize } from "./service";
import { buildReviewEmail, isEmailDue, sendReviewEmailIfDue } from "./email";

const NOW = new Date("2026-10-15T06:00:00Z");

function ctxWith(lastSentAt: string | null) {
  const recordEmail = vi.fn(async () => {});
  const ctx = {
    db: {},
    adapters: [],
    store: { lastEmailSentAt: async () => lastSentAt, recordEmail },
  } as unknown as ReviewContext;
  return { ctx, recordEmail };
}

describe("isEmailDue", () => {
  it("is due when never sent", () => expect(isEmailDue(null, NOW, 7)).toBe(true));
  it("is not due after 6 days", () => expect(isEmailDue("2026-10-09T06:00:00Z", NOW, 7)).toBe(false));
  it("is due after 7 days", () => expect(isEmailDue("2026-10-08T06:00:00Z", NOW, 7)).toBe(true));
});

describe("buildReviewEmail", () => {
  it("names the count, the range, and links to the review page", () => {
    const email = buildReviewEmail(
      { total: 4, byGame: [{ game: "hot-takes", name: "Hot Takes", count: 4, first: "2026-10-17" }] },
      ["2026-10-15", "2026-10-24"],
      "https://stim.example",
    );
    expect(email.subject).toBe("4 dailies need review (Oct 15–Oct 24)");
    expect(email.html).toContain("https://stim.example/admin/review");
    expect(email.text).toContain("Hot Takes — 4 unreviewed, first: Sat Oct 17");
  });
});

describe("sendReviewEmailIfDue", () => {
  it("skips when SMTP is not configured", async () => {
    const { ctx, recordEmail } = ctxWith(null);
    const send = vi.fn();
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => false });
    expect(result).toMatchObject({ sent: false, reason: "SMTP not configured" });
    expect(send).not.toHaveBeenCalled();
    expect(recordEmail).not.toHaveBeenCalled();
  });

  it("skips when not due yet", async () => {
    const { ctx } = ctxWith("2026-10-12T06:00:00Z");
    const send = vi.fn();
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true });
    expect(result.reason).toBe("not due");
    expect(send).not.toHaveBeenCalled();
  });

  it("skips when everything is reviewed", async () => {
    vi.mocked(summarize).mockReturnValueOnce({ total: 0, byGame: [] });
    const { ctx } = ctxWith(null);
    const send = vi.fn();
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true });
    expect(result.reason).toBe("nothing to review");
    expect(send).not.toHaveBeenCalled();
  });

  it("sends and records when due", async () => {
    vi.stubEnv("ADMIN_EMAILS", "a@x.com, b@x.com");
    const { ctx, recordEmail } = ctxWith(null);
    const send = vi.fn(async () => {});
    const result = await sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true });
    expect(result).toMatchObject({ sent: true, unreviewed: 4 });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["a@x.com", "b@x.com"] }));
    expect(recordEmail).toHaveBeenCalledWith(4);
    vi.unstubAllEnvs();
  });

  it("does not record a send that threw", async () => {
    vi.stubEnv("ADMIN_EMAILS", "a@x.com");
    const { ctx, recordEmail } = ctxWith(null);
    const send = vi.fn(async () => {
      throw new Error("535 bad credentials");
    });
    await expect(sendReviewEmailIfDue(ctx, { now: NOW, send, configured: () => true })).rejects.toThrow("535");
    expect(recordEmail).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm vitest run lib/daily-review/email.test.ts`
Expected: FAIL, `./email` missing.

- [ ] **Step 4: Implement** `lib/email/send.ts`

```ts
import "server-only";

import nodemailer from "nodemailer";

export interface EmailInput {
  to: string[];
  subject: string;
  html: string;
  text: string;
}

/** Gmail SMTP needs the account address and an app password (2FA required). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Sends from SMTP_USER through Gmail. Node runtime only: nodemailer opens raw sockets. */
export async function sendEmail(input: EmailInput): Promise<void> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP_USER and SMTP_PASS must be set");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  await transporter.sendMail({ from: user, ...input, to: input.to.join(", ") });
}
```

`lib/daily-review/email.ts`:

```ts
import "server-only";

import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { getReviewGrid, summarize, type ReviewContext } from "./service";
import type { ReviewSummary } from "./types";

const DAY_MS = 86_400_000;
const DEFAULT_EVERY_DAYS = 7;

export function isEmailDue(lastSentAt: string | null, now: Date, everyDays: number): boolean {
  if (!lastSentAt) return true;
  return now.getTime() - new Date(lastSentAt).getTime() >= everyDays * DAY_MS;
}

const fmt = (date: string, withWeekday = false) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(withWeekday ? { weekday: "short" } : {}),
  }).replace(",", "");

export function buildReviewEmail(summary: ReviewSummary, dates: string[], siteUrl: string) {
  const link = `${siteUrl.replace(/\/$/, "")}/admin/review`;
  const range = `${fmt(dates[0]!)}–${fmt(dates[dates.length - 1]!)}`;
  const lines = summary.byGame
    .filter((g) => g.count > 0)
    .map((g) => `${g.name} — ${g.count} unreviewed, first: ${fmt(g.first!, true)}`);

  const subject = `${summary.total} dailies need review (${range})`;
  const text = [...lines, "", `Review: ${link}`].join("\n");
  const html = `<p>${lines.map(escapeHtml).join("<br>")}</p>
<p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#ff6b1a;color:#121213;border-radius:8px;text-decoration:none;font-weight:600">Review dailies</a></p>`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
}

/**
 * Emails the admins when the last email is at least REVIEW_EMAIL_EVERY_DAYS
 * old and something in the window is unreviewed. A failed send throws and
 * records nothing, so the next cron run tries again.
 */
export async function sendReviewEmailIfDue(
  ctx: ReviewContext,
  options: { now?: Date; send?: typeof sendEmail; configured?: () => boolean } = {},
): Promise<{ sent: boolean; reason: string; unreviewed?: number }> {
  const now = options.now ?? new Date();
  const send = options.send ?? sendEmail;
  const configured = options.configured ?? isEmailConfigured;

  if (!configured()) return { sent: false, reason: "SMTP not configured" };

  const everyDays = Number(process.env.REVIEW_EMAIL_EVERY_DAYS) || DEFAULT_EVERY_DAYS;
  if (!isEmailDue(await ctx.store.lastEmailSentAt(), now, everyDays)) {
    return { sent: false, reason: "not due" };
  }

  const grid = await getReviewGrid(ctx, now.toISOString().slice(0, 10));
  const summary = summarize(grid);
  if (summary.total === 0) return { sent: false, reason: "nothing to review" };

  const to = adminEmails();
  if (to.length === 0) return { sent: false, reason: "ADMIN_EMAILS is empty" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await send({ to, ...buildReviewEmail(summary, grid.dates, siteUrl) });
  await ctx.store.recordEmail(summary.total);
  return { sent: true, reason: "sent", unreviewed: summary.total };
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run lib/daily-review/email.test.ts && pnpm typecheck`
Expected: PASS. If the weekday in `fmt` renders differently (e.g. `Sat, Oct 17` → the `.replace(",", "")` gives `Sat Oct 17`), adjust the formatter, not the test.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/email/send.ts lib/daily-review/email.ts lib/daily-review/email.test.ts
git commit -m "feat(daily-review): Gmail SMTP review email, sent when due and something is unreviewed"
```

---

### Task 8: Cron — 10-day fill and review-email job

**Files:**
- Modify: `app/api/cron/daily/route.ts`
- Test: `tests/api/cron-daily.test.ts`

**Interfaces:**
- Consumes: `reviewWindow`, `todayUtc` (Task 2), `createReviewContext` (Task 5), `sendReviewEmailIfDue` (Task 7), each game's existing scheduler, `topUpDailyChains(db, { today, daysAhead })`.
- Produces: report entries `"hot-takes"`, `"ball-knowledge"`, `"getting-warmer"`, `"freezeframes"` now return `{ days: Record<date, result> }` (plus existing queue fields); `"chainlink"` tops up 9 days ahead; new `"review-email"` entry.

- [ ] **Step 1: Update the cron test.** In `tests/api/cron-daily.test.ts`, add mocks at the top with the others:

```ts
vi.mock("@/lib/daily-review/adapters", () => ({ createReviewContext: () => ({}) }));
vi.mock("@/lib/daily-review/email", () => ({
  sendReviewEmailIfDue: vi.fn(async () => ({ sent: false, reason: "SMTP not configured" })),
}));
```

Import `topUpDailyChains` and `scheduleDailyPuzzle as scheduleGettingWarmer` from their mocked modules. Replace the assertion `expect(body.report["getting-warmer"].result.today.puzzleId).toBe("p");` with:

```ts
    const days = body.report["getting-warmer"].result.days;
    expect(Object.keys(days)).toHaveLength(10);
```

And add:

```ts
  it("schedules ten days ahead and tops Chain Link up for the same window", async () => {
    await run();
    expect(scheduleGettingWarmer).toHaveBeenCalledTimes(10);
    expect(topUpDailyChains).toHaveBeenCalledWith(expect.anything(), { daysAhead: 9 });
  });

  it("reports the review email job", async () => {
    const body = await (await run()).json();
    expect(body.report["review-email"]).toEqual({
      ok: true,
      result: { sent: false, reason: "SMTP not configured" },
    });
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/api/cron-daily.test.ts`
Expected: FAIL (`days` undefined, called 2 times not 10, no `review-email`).

- [ ] **Step 3: Implement.** In `app/api/cron/daily/route.ts`:

Add imports:

```ts
import { createReviewContext } from "@/lib/daily-review/adapters";
import { reviewWindow } from "@/lib/daily-review/dates";
import { sendReviewEmailIfDue } from "@/lib/daily-review/email";
```

Replace the `todayAndTomorrow` helper with:

```ts
  /**
   * Runs a game's own lazy scheduler for every day in the review window, in
   * date order, so each pick sees the one before it. Ten days ahead means
   * next week's lineup exists for admins to review on /admin/review.
   */
  const reviewDays = reviewWindow(today);
  const throughWindow =
    <T>(schedule: (date: string) => Promise<T>) =>
    async () => {
      const days: Record<string, T> = {};
      for (const date of reviewDays) days[date] = await schedule(date);
      return { days };
    };
```

Update the jobs:

```ts
    chainlink: () => topUpDailyChains(db, { daysAhead: reviewDays.length - 1 }),
```

```ts
      const scheduled = await throughWindow((date) => scheduleFreezeFrames(db, date))();
```

```ts
      const scheduled = await throughWindow((date) => scheduleGettingWarmer(db, date))();
```

```ts
    "ball-knowledge": throughWindow((date) => scheduleBallKnowledge(db, date)),
    "hot-takes": throughWindow((date) => scheduleHotTakes(db, date)),
```

Brain Dead stays on today + tomorrow (out of scope; its sets are fetched from an external API). Keep a local helper for it:

```ts
    "brain-dead": async () => ({
      today: (await buildBrainDead(db, today)).length,
      tomorrow: (await buildBrainDead(db, tomorrow)).length,
    }),
```

The review email must run after the games have filled the window, so it is not part of the parallel `runJobs` call. After `const report = await runJobs({...});` add:

```ts
  // After scheduling, so the email counts the slots the jobs just filled.
  Object.assign(
    report,
    await runJobs({ "review-email": () => sendReviewEmailIfDue(createReviewContext(db)) }),
  );
```

Update the route's doc comment: replace "Games that pick their daily from a stored pool have today's and tomorrow's rows created here" with "Games that pick their daily from a stored pool have the next ten days' rows created here, so admins can review them on /admin/review before they go live; the review-email job then emails the admins when slots are unreviewed".

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run tests/api/cron-daily.test.ts && pnpm typecheck`
Expected: PASS. The existing "counts unused puzzles through tomorrow" test still passes because `queueDepth` keeps `tomorrow`.

- [ ] **Step 5: Commit**

```bash
git add app/api/cron/daily/route.ts tests/api/cron-daily.test.ts
git commit -m "feat(cron): fill ten days of dailies and send the review email when due"
```

---

### Task 9: Review page and admin hub card

**Files:**
- Create: `app/admin/review/page.tsx`
- Modify: `app/admin/page.tsx`

**Interfaces:**
- Consumes HTTP from Task 6. Types `ReviewGrid`, `ReviewSummary`, `ReviewCell`, `Candidate`, `ReviewGame` from `@/lib/daily-review/types` (type-only imports are fine in a client component; `types.ts` has no `server-only` import).

- [ ] **Step 1: Build the page** `app/admin/review/page.tsx`. Requirements (all must hold):
  - `"use client"`, wrapped in `<AdminShell title="Review dailies" subtitle="Approve or swap the next 10 days before they go live. Unreviewed days ship the auto-pick." maxWidth={1200}>`.
  - Load `GET /api/admin/daily-review`; on 403 show "Session expired — refresh or sign in again." (same as other admin pages).
  - Summary line above the grid: `{summary.total} need review`.
  - Grid is a `<table>` inside a `div` with `overflowX: "auto"` (the page itself must not scroll horizontally at 375px). Rows = `grid.dates`, columns = `grid.columns`. Row header shows the UTC weekday and date, e.g. `Fri Oct 16`.
  - Each cell is a `<button>` (keyboard-accessible) showing `preview.title` truncated to one line with `textOverflow: "ellipsis"`, plus state: `✓ <first part of reviewedBy before @>` in green `#6aaa64`; `●` in orange `#ff6b1a` when unreviewed and not locked, bolder border for the first two unlocked dates; `locked` cells at `opacity: 0.55` with `cursor: default` and a "today" label; `—` when `contentId` is null. A column with `error` shows one cell spanning the rows: `Couldn't load: {error}` in `#ff6b6b`.
  - Row header has "Approve all" (POSTs every unlocked, scheduled, unreviewed cell in that row to `/approve`); column header has the same for its column. Hide the button when there is nothing to approve.
  - Clicking an unlocked cell opens a side panel (fixed right, `width: min(420px, 100vw)`, full height, `#1c1c1e`, close button and Escape to close). It shows the current preview (title, subtitle, image if `imageUrl`, link "Open in {name} admin" to `adminHref`), an **Approve** button, then "Alternates" fetched from `/alternates?game=&date=` on open (show "Loading…", then the list or "No alternates — add content in {name} admin" with the link). Each alternate shows its preview with **Swap** and **Swap + retire**. **Swap + retire** first changes to an inline "Retire "{current title}"? It won't be picked again. [Confirm] [Cancel]" row.
  - Every action disables the panel's buttons while in flight, then refetches the grid and closes the panel on success. A 409 shows the code in the panel: `STALE` → "That pick changed since you opened this — alternates reloaded." and refetches alternates; `LOCKED` → "Today's daily is locked."
  - Reuse the inline style constants pattern from `app/admin/ball-knowledge/page.tsx` (`btnStyle`, `cardStyle`, `muted`), copied locally into this file.

- [ ] **Step 2: Hub card** in `app/admin/page.tsx`: above the `ADMIN_GAMES` list, add a `Link` card to `/admin/review` styled like the game cards with accent `#ff6b1a`, title "Review dailies", description "Approve or swap the next 10 days of dailies before they go live." Fetch `GET /api/admin/daily-review` in a `useEffect` and, when `summary.total > 0`, show a pill badge `{total} need review` (same pill style as the existing "Soon" badge but orange border/text). Ignore fetch errors (the card still links).

- [ ] **Step 3: Typecheck and lint the touched files**

Run: `pnpm typecheck && pnpm eslint app/admin/review/page.tsx app/admin/page.tsx`
Expected: no errors in these files (the `react-hooks/set-state-in-effect` disable comment used by other admin pages is acceptable on the initial fetch).

- [ ] **Step 4: Manual check in the browser** (Task 11 covers the full run): the grid renders, a cell opens the panel, and the page has no horizontal scroll at 375px wide.

- [ ] **Step 5: Commit**

```bash
git add app/admin/review/page.tsx app/admin/page.tsx
git commit -m "feat(admin): review page for the next 10 days of dailies, linked from the admin hub"
```

---

### Task 10: Ball Knowledge retired list

**Files:**
- Create: `app/api/admin/ball-knowledge/retired/route.ts`
- Modify: `app/admin/ball-knowledge/page.tsx`
- Test: `tests/api/ball-knowledge-retired.test.ts`

**Interfaces:**
- Consumes: `listRetiredCategories`, `unretireCategory` (Task 5), `checkAdmin`.
- Produces: `GET /api/admin/ball-knowledge/retired` → `{ retired: string[] }`; `DELETE /api/admin/ball-knowledge/retired` `{ category }` → `{ ok: true }`.

- [ ] **Step 1: Failing test** `tests/api/ball-knowledge-retired.test.ts`

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/chainlink/admin-guard", () => ({ checkAdmin: vi.fn(async () => ({ email: "j@x.com" })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/ball-knowledge/schedule-service", () => ({
  listRetiredCategories: vi.fn(async () => ["NBA MVPs"]),
  unretireCategory: vi.fn(async () => {}),
}));

import { unretireCategory } from "@/lib/ball-knowledge/schedule-service";
import { DELETE, GET } from "@/app/api/admin/ball-knowledge/retired/route";

describe("ball knowledge retired route", () => {
  it("lists retired categories", async () => {
    expect(await (await GET()).json()).toEqual({ retired: ["NBA MVPs"] });
  });

  it("un-retires a category", async () => {
    const res = await DELETE(new Request("https://x.test", { method: "DELETE", body: JSON.stringify({ category: "NBA MVPs" }) }));
    expect(res.status).toBe(200);
    expect(unretireCategory).toHaveBeenCalledWith(expect.anything(), "NBA MVPs");
  });

  it("requires a category", async () => {
    const res = await DELETE(new Request("https://x.test", { method: "DELETE", body: "{}" }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run tests/api/ball-knowledge-retired.test.ts`
Expected: FAIL, route missing.

- [ ] **Step 3: Implement** `app/api/admin/ball-knowledge/retired/route.ts`

```ts
import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { listRetiredCategories, unretireCategory } from "@/lib/ball-knowledge/schedule-service";
import { createAdminClient } from "@/lib/supabase/admin";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 403 });

export async function GET() {
  if (!(await checkAdmin())) return unauthorized();
  const retired = await listRetiredCategories(createAdminClient());
  return NextResponse.json({ retired });
}

/** Puts a retired category back into the rotation. */
export async function DELETE(req: Request) {
  if (!(await checkAdmin())) return unauthorized();
  let category: unknown;
  try {
    category = (await req.json())?.category;
  } catch {
    category = null;
  }
  if (typeof category !== "string" || !category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  await unretireCategory(createAdminClient(), category);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: UI.** In `app/admin/ball-knowledge/page.tsx`: add `retired` state loaded from `GET /api/admin/ball-knowledge/retired` alongside `fetchSchedule`. In the "Category pool" card, render retired categories with `opacity: 0.5`, a "retired" label instead of the last-used text, and an "Un-retire" `btnStyle` button that sends `DELETE` with `{ category }`, then reloads the retired list and shows `Un-retired "{category}".` in the existing message banner.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm vitest run tests/api/ball-knowledge-retired.test.ts && pnpm typecheck && pnpm eslint app/admin/ball-knowledge/page.tsx app/api/admin/ball-knowledge/retired/route.ts`
Expected: PASS, no lint errors in these files.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/ball-knowledge/retired tests/api/ball-knowledge-retired.test.ts app/admin/ball-knowledge/page.tsx
git commit -m "feat(ball-knowledge): show retired categories with an un-retire button"
```

---

### Task 11: Spec sync and end-to-end verification

**Files:**
- Modify: `docs/superpowers/specs/2026-10-15-weekly-daily-review-design.md` (record the two agreed deviations)

- [ ] **Step 1: Update the spec.** In "Review page", replace "Each game's existing admin page gets a small **Retired** list with an Un-retire button, which calls the unretire route." with "Ball Knowledge's admin page gets a **Retired** list with an Un-retire button. The other four games restore retired content through their existing status controls (`rejected`/`archived` → `approved`)." Remove `GET /retired?game=` and `POST /unretire` from "API routes" and add `GET`/`DELETE /api/admin/ball-knowledge/retired`. Replace "Must work in both light and dark themes and at phone width" with "Matches the existing dark admin styling (`AdminShell`) and works at phone width".

- [ ] **Step 2: Full automated gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all pass. Then `pnpm lint` and confirm no errors are reported in any file this plan touched (the repo has a pre-existing red baseline elsewhere).

- [ ] **Step 3: Manual run against the hosted DB is NOT allowed without the human.** The migration has not been applied there. Instead, report to the human:
  - The migration file to apply (`pnpm db:push`) before deploying.
  - Env to set in Vercel: `SMTP_USER`, `SMTP_PASS` (Google app password), optionally `REVIEW_EMAIL_EVERY_DAYS`; confirm `NEXT_PUBLIC_SITE_URL` and `ADMIN_EMAILS` are set.
  - How to check after deploy: open `/admin/review`, approve one slot, swap one slot, and trigger the cron once with `curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/daily` to receive the email.

  If the human wants a local run first: start local Supabase per the dev-environment notes (scratch `--workdir`, grants to `service_role`), apply migrations, run `pnpm dev` on a spare port with `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=` and local Supabase env overrides, `ADMIN_EMAILS` set to the developer, and check the review page at 375px and desktop widths.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-15-weekly-daily-review-design.md
git commit -m "Spec: record the Ball Knowledge-only retired list and dark admin styling"
```
