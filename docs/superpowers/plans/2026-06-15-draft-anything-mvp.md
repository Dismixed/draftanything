# Draft Anything MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, guest-first multiplayer Draft Anything MVP from room creation through shareable judged results.

**Architecture:** Use a Next.js 16 App Router modular monolith with Supabase Postgres as the authoritative game engine. Browser state is a read projection synchronized through Supabase Realtime; all game mutations pass through server routes and atomic Postgres functions. OpenAI Responses API calls sit behind typed adapters and never block draft progression.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase Postgres/Realtime, Zustand, OpenAI JavaScript SDK, Zod, Vitest, Testing Library, Playwright, axe-core, Vercel

---

## File Map

```text
app/
  api/
    ai/commentary/route.ts          Queue or execute selective commentary
    ai/judge/route.ts               Execute AI judgment with fallback
    ai/pool/route.ts                Generate topic pool and rubric
    drafts/route.ts                 Create rooms
    drafts/[draftId]/join/route.ts  Join a room
    drafts/[draftId]/pick/route.ts  Submit authoritative picks
    drafts/[draftId]/phase/route.ts Advance validated phases
    drafts/[draftId]/vote/route.ts  Submit a player vote
    results/[draftId]/image/route.ts Render downloadable result card
  draft/[roomCode]/page.tsx         Canonical room entry
  results/[draftId]/page.tsx        Public result page
  page.tsx                          Create/join landing page
  layout.tsx                        Root metadata and providers
components/
  draft/                            Live board, timer, rosters, AI desk
  lobby/                            Seats, invite code, configuration
  pool/                             Pool editor and suggestions
  results/                          Rankings, awards, share actions
  ui/                               Focused reusable primitives
features/
  ai/                               OpenAI schemas, prompts, adapters, fallbacks
  draft/                            Order, timers, projections, UI store
  guest/                            Cookie session creation and verification
  judging/                          Vote normalization and hybrid scoring
  pool/                             Item normalization and fallback metadata
  room/                             Room schemas and server services
lib/
  env.ts                            Validated environment configuration
  errors.ts                         Stable application error codes
  rate-limit.ts                     Mutation rate-limit abstraction
  supabase/                         Browser, server, and admin clients
supabase/
  migrations/                       Schema, RLS, RPC, and realtime migrations
  tests/                            pgTAP authority and constraint tests
tests/
  e2e/                              Multi-context user journeys
  fixtures/ai.ts                    Deterministic OpenAI fixtures
```

## Task 1: Scaffold the Application and Quality Gates

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `tests/setup.ts`
- Create: `lib/env.ts`
- Test: `lib/env.test.ts`

- [ ] **Step 1: Scaffold Next.js without replacing the existing docs**

Run:

```bash
npx create-next-app@latest /tmp/draft-anything-web \
  --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" \
  --use-pnpm --yes
rsync -a --exclude='.git' /tmp/draft-anything-web/ ./
rm -rf /tmp/draft-anything-web
```

Expected: the existing `docs/` remains and the root gains a runnable Next.js app.

- [ ] **Step 2: Install runtime and test dependencies**

Run:

```bash
pnpm add @supabase/ssr @supabase/supabase-js openai zod zustand server-only
pnpm add -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom \
  @playwright/test @axe-core/playwright supabase
```

Expected: `pnpm install` completes without peer-dependency errors.

- [ ] **Step 3: Add deterministic scripts**

Set `package.json` scripts to:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "db:start": "supabase start",
  "db:stop": "supabase stop",
  "db:reset": "supabase db reset",
  "db:test": "supabase test db",
  "db:types": "supabase gen types typescript --local --schema public > lib/supabase/database.types.ts",
  "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
}
```

- [ ] **Step 4: Write the failing environment test**

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("rejects missing server configuration", () => {
    expect(() => parseEnv({})).toThrow("Invalid environment");
  });
});
```

- [ ] **Step 5: Implement validated environment configuration**

```ts
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default("gpt-5.5"),
  GUEST_TOKEN_PEPPER: z.string().min(32),
  APP_URL: z.string().url(),
});

export function parseEnv(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error("Invalid environment");
  return result.data;
}
```

Do not eagerly parse `process.env` at module load in browser-importable files.

- [ ] **Step 6: Add `.env.example`**

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
GUEST_TOKEN_PEPPER=replace-with-at-least-32-random-characters
APP_URL=http://localhost:3000
```

- [ ] **Step 7: Run the initial quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: all four commands pass.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml app lib tests \
  next.config.ts tsconfig.json vitest.config.ts playwright.config.ts \
  .env.example .gitignore
git commit -m "Establish a verifiable foundation for the game"
```

Include Lore trailers for constraints, tests, and known gaps.

## Task 2: Implement Pure Draft and Judging Rules

**Files:**
- Create: `features/draft/types.ts`
- Create: `features/draft/order.ts`
- Create: `features/draft/order.test.ts`
- Create: `features/pool/normalize.ts`
- Create: `features/pool/normalize.test.ts`
- Create: `features/judging/hybrid.ts`
- Create: `features/judging/hybrid.test.ts`
- Create: `features/ai/fallback.ts`
- Create: `features/ai/fallback.test.ts`

- [ ] **Step 1: Define domain types**

```ts
export type DraftType = "standard" | "snake" | "random";
export type JudgingMode = "ai" | "community" | "hybrid";
export type DraftPhase =
  | "LOBBY"
  | "POOL_REVIEW"
  | "DRAFTING"
  | "DEFENSE"
  | "VOTING"
  | "JUDGING"
  | "COMPLETE";

export type PickSlot = {
  overallPick: number;
  round: number;
  pickInRound: number;
  seat: number;
};
```

- [ ] **Step 2: Write order tests**

Cover:

```ts
expect(buildPickOrder(3, 2, "standard", () => 0.5).map(x => x.seat))
  .toEqual([1, 2, 3, 1, 2, 3]);
expect(buildPickOrder(3, 2, "snake", () => 0.5).map(x => x.seat))
  .toEqual([1, 2, 3, 3, 2, 1]);
expect(buildPickOrder(3, 2, "random", seededRandom("draft-1")))
  .toEqual(buildPickOrder(3, 2, "random", seededRandom("draft-1")));
```

- [ ] **Step 3: Implement immutable order generation**

Use Fisher-Yates for each random round. Reject players outside `2..6` and rounds
outside `1..10`. Return the complete `PickSlot[]`; never calculate random order
incrementally during play.

- [ ] **Step 4: Write pool normalization tests**

Verify trimming, case-insensitive duplicate keys, punctuation folding, empty-name
rejection, and `players * rounds * 2` target size.

- [ ] **Step 5: Implement pool normalization**

Expose:

```ts
export function normalizeItemName(name: string): string;
export function assertUniqueItems(names: string[]): void;
export function poolTargetSize(players: number, rounds: number): number;
```

- [ ] **Step 6: Write hybrid and tie tests**

Verify:

- AI `8/10` plus community `50%` produces `7.1/10`.
- Community ties share the win.
- Hybrid ties prefer AI score, then metadata, then shared win.
- Players with no valid votes receive zero community score.

- [ ] **Step 7: Implement scoring functions**

Expose pure functions:

```ts
normalizeAiScore(score: number): number;
communityVoteShares(playerIds: string[], votes: Vote[]): Record<string, number>;
hybridScores(ai: Record<string, number>, community: Record<string, number>): Record<string, number>;
resolveWinners(scores: Record<string, number>, tieBreak: TieBreakInput): string[];
```

- [ ] **Step 8: Test and implement deterministic fallback scoring**

The fallback must:

- Compute weighted item scores from the locked rubric.
- Average item scores per roster.
- Select auto-picks by highest weighted remaining score.
- Derive best pick, worst pick, and biggest steal from score versus pick position.
- Resolve equal values by normalized item name for deterministic output.

Run: `pnpm test -- features`

Expected: all domain tests pass.

- [ ] **Step 9: Commit**

```bash
git add features
git commit -m "Make draft outcomes deterministic before adding persistence"
```

## Task 3: Create the Authoritative Database Schema

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202606150001_initial_schema.sql`
- Create: `supabase/migrations/202606150002_policies.sql`
- Create: `supabase/migrations/202606150003_realtime.sql`
- Create: `supabase/tests/schema.test.sql`
- Create: `lib/supabase/database.types.ts`

- [ ] **Step 1: Initialize local Supabase**

Run: `pnpm exec supabase init && pnpm db:start`

Expected: local API, database, Studio, and mail services become healthy.

- [ ] **Step 2: Write the schema migration**

Create enums for draft phase/type/judging mode/personality/suggestion status.
Create the nine approved tables with:

- UUID primary keys
- `citext` or normalized-name uniqueness for items
- unique `(draft_id, overall_pick)` and `(draft_id, item_id)` picks
- unique `(draft_id, voter_player_id)` votes
- checks for two-to-six players, positive rounds, and valid timer values
- JSONB rubric, metadata, scores, rankings, and awards
- no durable connection-state column

Add `guest_sessions` with only `token_hash`, creation, and expiry timestamps.

- [ ] **Step 3: Add indexes and RLS**

Enable RLS on every public table. Browser roles receive read-only safe projections
through database views:

```sql
create view public.safe_draft_items
with (security_invoker = true) as
select id, draft_id, name, source, is_available, created_at
from public.draft_items;
```

Do not grant browser roles access to `hidden_metadata`, guest hashes, service job
payloads, or unrestricted mutation policies.

- [ ] **Step 4: Configure Realtime**

Add `drafts`, `draft_players`, `draft_items`, `picks`, `pool_suggestions`,
`commentary`, `arguments`, `votes`, and `judgments` to the Supabase realtime
publication. Presence remains an ephemeral channel feature.

- [ ] **Step 5: Write pgTAP schema tests**

Assert:

- Required tables, enums, constraints, and indexes exist.
- Hidden metadata is absent from `safe_draft_items`.
- Anonymous roles cannot insert picks or votes directly.
- Duplicate room codes, picks, items, and voters fail.

- [ ] **Step 6: Reset, test, and generate types**

Run:

```bash
pnpm db:reset
pnpm db:test
pnpm db:types
pnpm typecheck
```

Expected: migrations apply cleanly, pgTAP passes, and generated types compile.

- [ ] **Step 7: Commit**

```bash
git add supabase lib/supabase/database.types.ts
git commit -m "Put canonical room state behind database constraints"
```

## Task 4: Add Guest Sessions and Supabase Clients

**Files:**
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `features/guest/token.ts`
- Create: `features/guest/token.test.ts`
- Create: `features/guest/session.ts`
- Create: `app/api/guest/route.ts`

- [ ] **Step 1: Test guest token hashing**

Verify that:

- Generated tokens contain at least 256 bits of entropy.
- The database hash is stable for the same token and pepper.
- Raw tokens never appear in the persisted session object.
- Expired sessions are rejected.

- [ ] **Step 2: Implement token primitives**

Use `crypto.randomBytes(32).toString("base64url")` and
`createHmac("sha256", pepper).update(token).digest("hex")`.

- [ ] **Step 3: Implement server session helpers**

Use async Next.js `cookies()` and set:

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30
}
```

Expose `ensureGuestSession()` and `requireGuestSession()`.

- [ ] **Step 4: Implement three Supabase clients**

- Browser client: publishable key only.
- Server client: publishable key and request cookies for safe reads.
- Admin client: service-role key, imported only from `server-only` modules.

The admin client must never be imported by a client component.

- [ ] **Step 5: Add the guest bootstrap route**

`POST /api/guest` ensures a guest session and returns only `{ guestId }`.

- [ ] **Step 6: Verify**

Run:

```bash
pnpm test -- features/guest
pnpm lint
pnpm typecheck
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add app/api/guest features/guest lib/supabase
git commit -m "Let guests join securely without introducing accounts"
```

## Task 5: Build Room Creation, Joining, and Lobby

**Files:**
- Create: `features/room/schema.ts`
- Create: `features/room/service.ts`
- Create: `features/room/service.test.ts`
- Create: `app/api/drafts/route.ts`
- Create: `app/api/drafts/[draftId]/join/route.ts`
- Create: `app/draft/[roomCode]/page.tsx`
- Create: `components/lobby/create-room-form.tsx`
- Create: `components/lobby/join-room-form.tsx`
- Create: `components/lobby/lobby.tsx`
- Create: `components/lobby/player-seat.tsx`
- Modify: `app/page.tsx`
- Test: `tests/e2e/lobby.spec.ts`

- [ ] **Step 1: Write room schema tests**

Test valid and invalid combinations for:

- display names from 1–30 visible characters
- player count `2..6`
- rounds `1..10`
- timers off or `15..180` seconds
- supported draft types, judging modes, and personalities
- topic from 2–80 characters

- [ ] **Step 2: Implement schemas and stable error codes**

Use Zod request schemas and return:

```ts
type ApiErrorCode =
  | "INVALID_INPUT"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "NAME_TAKEN"
  | "NOT_HOST"
  | "INVALID_PHASE"
  | "STALE_STATE"
  | "RATE_LIMITED";
```

- [ ] **Step 3: Implement room service**

Generate a six-character invite code from an ambiguity-free alphabet. Retry on a
database uniqueness conflict. Creation inserts host player at seat one. Join uses
a transaction or RPC to lock the draft, enforce capacity, and allocate the lowest
open seat.

- [ ] **Step 4: Add create and join routes**

Routes must:

- validate body
- require guest session
- apply rate limit
- call service
- return a safe room projection
- map known conflicts to stable HTTP status and error code

- [ ] **Step 5: Build the Broadcast Arena landing and lobby**

Implement equal primary actions for create and join. Lobby includes:

- room code copy action
- configuration summary
- seats and ready state
- host badge and controls
- connection status
- start disabled until requirements are met

- [ ] **Step 6: Add presence**

Subscribe to `draft:{draftId}` and track `{ playerId, displayName }`. Presence is
display-only and never authorizes an action.

- [ ] **Step 7: Write Playwright lobby flow**

Use two isolated browser contexts:

1. Host creates a room.
2. Guest joins by code.
3. Both see two occupied seats.
4. Duplicate display name is rejected.
5. A seventh join is rejected for a six-seat room fixture.

- [ ] **Step 8: Verify and commit**

Run:

```bash
pnpm test -- features/room
pnpm test:e2e -- tests/e2e/lobby.spec.ts
pnpm verify
```

Commit:

```bash
git add app components/lobby features/room tests/e2e/lobby.spec.ts
git commit -m "Make private rooms playable from a shared invite code"
```

## Task 6: Generate, Review, Suggest, and Lock Pools

**Files:**
- Create: `features/ai/client.ts`
- Create: `features/ai/schemas.ts`
- Create: `features/ai/pool.ts`
- Create: `features/ai/pool.test.ts`
- Create: `features/ai/prompts/pool.ts`
- Create: `features/pool/service.ts`
- Create: `features/pool/service.test.ts`
- Create: `app/api/ai/pool/route.ts`
- Create: `app/api/drafts/[draftId]/pool/route.ts`
- Create: `app/api/drafts/[draftId]/suggestions/route.ts`
- Create: `components/pool/pool-review.tsx`
- Create: `components/pool/pool-editor.tsx`
- Create: `components/pool/suggestion-queue.tsx`
- Create: `tests/fixtures/ai.ts`
- Test: `tests/e2e/pool-review.spec.ts`

- [ ] **Step 1: Define structured AI schemas**

Use Zod as the source of truth for:

```ts
const PoolOutput = z.object({
  items: z.array(z.object({
    name: z.string().min(1).max(60),
    metadata: z.record(z.string(), z.number().min(0).max(10))
  })),
  rubric: z.record(z.string(), z.number().min(0).max(100))
});
```

Require rubric weights to sum to 100 and item count to meet the requested target.

- [ ] **Step 2: Implement the OpenAI adapter**

Use the Responses API with Structured Outputs and Zod SDK helpers. Read the model
from `OPENAI_MODEL`; default to `gpt-5.5`, `reasoning.effort: "low"`, and concise
text output. Set an application timeout with `AbortSignal.timeout`.

The rest of the app calls `generatePool(input)` and never imports OpenAI directly.

- [ ] **Step 3: Write contract tests with fixtures**

Cover:

- valid result
- duplicate names
- insufficient items
- malformed rubric
- timeout
- refusal

Mock the adapter; default tests must not make live API calls.

- [ ] **Step 4: Implement fallback metadata**

Manual items receive the midpoint `5` for every locked rubric category. Before
locking, successful regeneration may enrich them. After locking, metadata is
immutable.

- [ ] **Step 5: Implement pool mutations**

Host may add, edit, remove, regenerate, accept/reject suggestions, and lock.
Players may submit additions/removals. Locking validates uniqueness and minimum
draftable count, then transitions to `DRAFTING` only through the start RPC.

- [ ] **Step 6: Build pool review UI**

Include search, item count, inline host editing, suggestion queue, regenerate,
manual add, and lock confirmation. Non-hosts see suggestion controls instead of
authoritative editing.

- [ ] **Step 7: Write the E2E pool flow**

Verify host generation, guest suggestion, host acceptance, duplicate rejection,
pool lock, and hidden metadata absence from browser network-visible responses.

- [ ] **Step 8: Verify and commit**

Run:

```bash
pnpm test -- features/ai features/pool
pnpm test:e2e -- tests/e2e/pool-review.spec.ts
pnpm verify
```

Commit:

```bash
git add app/api components/pool features/ai features/pool tests
git commit -m "Make every draft pool reviewable before competition starts"
```

## Task 7: Implement Atomic Drafting, Timers, and Reconnects

**Files:**
- Create: `supabase/migrations/202606150004_draft_rpcs.sql`
- Create: `supabase/tests/draft_rpcs.test.sql`
- Create: `features/draft/projection.ts`
- Create: `features/draft/projection.test.ts`
- Create: `features/draft/store.ts`
- Create: `features/draft/use-draft-room.ts`
- Create: `app/api/drafts/[draftId]/pick/route.ts`
- Create: `app/api/drafts/[draftId]/auto-pick/route.ts`
- Create: `components/draft/draft-board.tsx`
- Create: `components/draft/available-pool.tsx`
- Create: `components/draft/current-turn.tsx`
- Create: `components/draft/player-rosters.tsx`
- Create: `components/draft/turn-timer.tsx`
- Test: `tests/e2e/draft.spec.ts`

- [ ] **Step 1: Write failing pgTAP authority tests**

Test:

- valid current player pick succeeds
- wrong player fails
- stale expected pick fails
- unavailable item fails
- two concurrent same-item attempts produce one pick
- turn advances once
- last pick transitions to `DEFENSE`
- expired timer produces one idempotent auto-pick

- [ ] **Step 2: Implement `start_draft`, `submit_pick`, and `auto_pick` RPCs**

Each function uses transaction-level row locks. `submit_pick` accepts:

```sql
p_draft_id uuid,
p_guest_id uuid,
p_item_id uuid,
p_expected_pick integer
```

It returns the new current pick index, phase, and deadline. All checks happen
inside the function before writes.

- [ ] **Step 3: Add server routes**

Routes authenticate the guest and call typed `supabase.rpc(...)`. They never
duplicate game-rule checks in JavaScript beyond input validation and error mapping.

- [ ] **Step 4: Implement safe room projection**

Create one function that maps database rows into:

```ts
type DraftRoomProjection = {
  draft: SafeDraft;
  players: SafePlayer[];
  availableItems: SafeItem[];
  picks: SafePick[];
  commentary: SafeCommentary[];
  serverNow: string;
};
```

No hidden metadata may enter this type.

- [ ] **Step 5: Implement realtime synchronization**

`useDraftRoom` subscribes to relevant table changes, debounces a canonical
projection refetch, and replaces Zustand state. On channel reconnect, fetch first
and then resume event handling. Never replay missed mutations locally.

- [ ] **Step 6: Build responsive draft board**

- Desktop: pool / current-turn-plus-AI / rosters columns.
- Tablet: pool and rosters with collapsible AI desk.
- Mobile: sticky current turn and timer; accessible pool/rosters/AI tabs.

The pick button is optimistic only visually and remains disabled until the server
confirms or rejects the mutation.

- [ ] **Step 7: Implement timer display and expiry trigger**

Calculate display time from `turn_deadline` and `serverNow`. When the browser
observes expiry, call the idempotent auto-pick endpoint. Also expose the endpoint
for Vercel Cron or an equivalent scheduled worker so expiry does not require an
open client.

- [ ] **Step 8: Write multi-context E2E tests**

Verify:

- snake direction reversal
- simultaneous same-item picks
- stale client recovery
- reconnect during current turn
- timer auto-pick
- final transition to defense

- [ ] **Step 9: Verify and commit**

Run:

```bash
pnpm db:reset
pnpm db:test
pnpm test -- features/draft
pnpm test:e2e -- tests/e2e/draft.spec.ts
pnpm verify
```

Commit:

```bash
git add supabase app/api/drafts components/draft features/draft tests/e2e/draft.spec.ts
git commit -m "Keep every live pick authoritative through contention and reconnects"
```

## Task 8: Add Selective AI Commissioner Commentary

**Files:**
- Create: `features/ai/commentary-trigger.ts`
- Create: `features/ai/commentary-trigger.test.ts`
- Create: `features/ai/commentary.ts`
- Create: `features/ai/commentary.test.ts`
- Create: `features/ai/prompts/commentary.ts`
- Create: `app/api/ai/commentary/route.ts`
- Create: `components/draft/ai-desk.tsx`

- [ ] **Step 1: Test deterministic commentary triggers**

Cover reach, steal, category run, roster trend, minimum pick interval, and a
no-comment ordinary pick. The trigger returns tags and priority without calling AI.

- [ ] **Step 2: Implement trigger rules**

Use hidden metadata server-side to compare item rank with pick position. Enforce
at most one comment per pick and a configurable minimum interval of two picks.

- [ ] **Step 3: Implement personality prompts and output schema**

Output is:

```ts
z.object({
  text: z.string().min(1).max(240),
  tags: z.array(z.enum(["reach", "steal", "trend", "run", "surprise"])).max(3)
});
```

All personalities prohibit protected-class harassment, threats, sexual content,
and targeted abuse. “Toxic Friend” permits playful criticism of picks only.

- [ ] **Step 4: Implement idempotent commentary**

Use idempotency key `commentary:{draftId}:{pickId}:{promptVersion}`. Retry bounded
provider errors twice, then record nothing. The pick response must not await this
work; enqueue after the mutation or invoke through an asynchronous job endpoint.

- [ ] **Step 5: Render AI desk**

Show newest commentary, trigger label, loading-independent empty state, and
collapsible history. Announce new commentary through a polite live region.

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm test -- features/ai/commentary-trigger.test.ts features/ai/commentary.test.ts
pnpm verify
```

Commit:

```bash
git add app/api/ai/commentary components/draft/ai-desk.tsx features/ai
git commit -m "Add commentary only when the draft has something worth saying"
```

## Task 9: Implement Defenses, Voting, AI Judging, and Hybrid Results

**Files:**
- Create: `supabase/migrations/202606150005_judging_rpcs.sql`
- Create: `supabase/tests/judging_rpcs.test.sql`
- Create: `features/judging/service.ts`
- Create: `features/judging/service.test.ts`
- Create: `features/ai/judge.ts`
- Create: `features/ai/judge.test.ts`
- Create: `features/ai/prompts/judge.ts`
- Create: `app/api/drafts/[draftId]/defense/route.ts`
- Create: `app/api/drafts/[draftId]/vote/route.ts`
- Create: `app/api/drafts/[draftId]/phase/route.ts`
- Create: `app/api/ai/judge/route.ts`
- Create: `components/draft/defense-panel.tsx`
- Create: `components/draft/voting-panel.tsx`
- Test: `tests/e2e/judging.spec.ts`

- [ ] **Step 1: Write database tests**

Verify one defense per player, explicit skip, one vote per voter, no self-vote,
player-only voting, phase enforcement, host early advance, and idempotent judgment
insert.

- [ ] **Step 2: Implement defense and phase RPCs**

Host may end defense early. AI mode enters `JUDGING`; community and hybrid enter
`VOTING`. Community completes after all eligible votes or host closure. Hybrid
waits for both the closed vote set and one accepted AI/fallback judgment.

- [ ] **Step 3: Implement judge schema and adapter**

Validate:

- every active player appears once
- category scores use the locked rubric keys
- overall scores are within `0..10`
- awards reference real picks and players
- winners match the ranking

Use Responses API Structured Outputs. Store model and prompt version.

- [ ] **Step 4: Implement fallback and hybrid orchestration**

On timeout/refusal/malformed output:

1. retry twice
2. compute deterministic fallback
3. persist source as `fallback`
4. continue hybrid calculation

Normalize votes and AI scores using the pure functions from Task 2.

- [ ] **Step 5: Build defense and voting UI**

Defense supports submit or skip. Voting shows roster comparisons without AI scores,
disables the current player, and clearly records the submitted vote.

- [ ] **Step 6: Write E2E tests for all modes**

Use fixtures to complete:

- AI mode with valid AI output
- AI mode with fallback
- community mode with shared winner
- hybrid mode with 70/30 weighting and AI tie-break

- [ ] **Step 7: Verify and commit**

Run:

```bash
pnpm db:reset
pnpm db:test
pnpm test -- features/judging features/ai/judge.test.ts
pnpm test:e2e -- tests/e2e/judging.spec.ts
pnpm verify
```

Commit:

```bash
git add supabase app/api components/draft features tests/e2e/judging.spec.ts
git commit -m "Turn completed rosters and arguments into defensible winners"
```

## Task 10: Build Public Results and Downloadable Cards

**Files:**
- Create: `features/results/projection.ts`
- Create: `features/results/projection.test.ts`
- Create: `app/results/[draftId]/page.tsx`
- Create: `app/api/results/[draftId]/image/route.ts`
- Create: `components/results/winner-reveal.tsx`
- Create: `components/results/rankings.tsx`
- Create: `components/results/awards.tsx`
- Create: `components/results/share-actions.tsx`
- Test: `tests/e2e/results.spec.ts`

- [ ] **Step 1: Test public result projection**

Ensure it includes topic, rosters, ranking, winner, awards, explanation, community
totals, and completed timestamp while excluding guest IDs, tokens, raw metadata,
internal prompts, and rate-limit keys.

- [ ] **Step 2: Implement permanent result page**

The page is publicly readable only when phase is `COMPLETE`. Add Open Graph
metadata using the result image route.

- [ ] **Step 3: Implement image generation**

Use `ImageResponse` from `next/og` with a fixed 1200×630 layout. Include topic,
winner, score, rosters, best pick, and Draft Anything branding. Return
`Content-Disposition: attachment` when `?download=1`.

- [ ] **Step 4: Implement share actions**

Support:

- copy permanent link
- native Web Share when available
- download PNG
- rematch link that pre-fills configuration without carrying picks or identities

- [ ] **Step 5: Write result E2E test**

Verify unauthenticated access, image response content type, download header, copied
URL, and absence of private fields in rendered output.

- [ ] **Step 6: Verify and commit**

Run:

```bash
pnpm test -- features/results
pnpm test:e2e -- tests/e2e/results.spec.ts
pnpm verify
```

Commit:

```bash
git add app/results app/api/results components/results features/results tests/e2e/results.spec.ts
git commit -m "Make every finished argument easy to share"
```

## Task 11: Add Rate Limits, Observability, and Recovery UX

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `lib/rate-limit.test.ts`
- Create: `lib/logger.ts`
- Create: `lib/request-id.ts`
- Create: `components/ui/error-banner.tsx`
- Create: `components/ui/connection-status.tsx`
- Create: `app/error.tsx`
- Create: `app/not-found.tsx`
- Modify: all mutation routes
- Test: `tests/e2e/recovery.spec.ts`

- [ ] **Step 1: Define rate-limit policy**

Use a storage-backed abstraction with local in-memory implementation for tests.
Keys combine guest ID, IP prefix, and action. Initial limits:

- create: 5/hour
- join: 30/hour
- regenerate: 10/hour/draft
- suggestion: 30/hour/draft
- pick: 20/minute/draft
- vote: 10/minute/draft
- AI judge: 5/hour/draft
- image: 30/hour/draft

- [ ] **Step 2: Add structured logging**

Every route logs request ID, action, draft ID when present, result code, duration,
and provider latency. Never log guest tokens, defenses, prompts, or raw AI output.

- [ ] **Step 3: Standardize recovery UI**

Map stable errors to explicit states for reconnecting, stale turn, taken item,
room full, changed configuration, AI unavailable, fallback judging, and image retry.
Conflict errors trigger a fresh canonical projection fetch.

- [ ] **Step 4: Test recovery**

E2E coverage:

- rate-limited regeneration
- stale pick refresh
- realtime disconnect/reconnect
- AI timeout with continued play
- failed image request retry

- [ ] **Step 5: Verify and commit**

Run: `pnpm test && pnpm test:e2e -- tests/e2e/recovery.spec.ts && pnpm verify`

Commit:

```bash
git add app components/ui lib tests/e2e/recovery.spec.ts
git commit -m "Keep failures explicit without stopping the room"
```

## Task 12: Responsive, Accessibility, and Production Verification

**Files:**
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `vercel.json`
- Create: `README.md`
- Modify: `app/globals.css`
- Modify: affected components under `components/`

- [ ] **Step 1: Add accessibility tests**

For home, lobby, pool, draft, voting, and results:

- run axe and require zero serious/critical violations
- complete key flows by keyboard
- verify focus after dialogs and tab changes
- verify timer and commentary live regions
- verify reduced-motion styling

- [ ] **Step 2: Add responsive tests**

Capture and assert core controls at:

- 390×844 mobile
- 820×1180 tablet
- 1440×900 desktop

Fail if the page has horizontal overflow or the current-turn/pick controls are
outside the viewport during drafting.

- [ ] **Step 3: Configure scheduled expiry**

Add a protected cron route that processes due drafts in bounded batches through
the idempotent `auto_pick` RPC. Configure `vercel.json` to invoke it once per
minute. Require `CRON_SECRET` in production.

- [ ] **Step 4: Write operational README**

Document:

- prerequisites
- environment variables
- local Supabase startup/reset
- generated database types
- OpenAI fixture mode versus live mode
- test commands
- Vercel and Supabase deployment
- migration order
- cron configuration
- rollback procedure

- [ ] **Step 5: Run the complete release gate**

Run:

```bash
pnpm db:reset
pnpm db:test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Expected: every command exits zero with no known console errors.

- [ ] **Step 6: Manually verify with live services**

Using a non-production Supabase project and a restricted OpenAI key:

1. Complete a two-player snake draft.
2. Disconnect and reconnect one player.
3. Allow one timer to expire.
4. Confirm selective commentary.
5. Submit one defense and one skip.
6. Complete hybrid judging.
7. Open the public result in a signed-out browser.
8. Download the image card.

Record exact evidence in the commit body or release notes.

- [ ] **Step 7: Commit**

```bash
git add README.md vercel.json app components tests/e2e
git commit -m "Prove the complete friend-draft loop across supported devices"
```

## Final Acceptance Checklist

- [ ] Private invite rooms support two to six guests.
- [ ] Standard, snake, and independently randomized rounds are correct.
- [ ] Pool generation, manual editing, suggestions, and locking work.
- [ ] Hidden metadata never appears in pre-result browser projections.
- [ ] Picks are atomic under contention and stale clients recover.
- [ ] Timer expiry is server-authoritative and idempotent.
- [ ] Reconnect replaces state from canonical storage.
- [ ] Commentary is selective, safe, and non-blocking.
- [ ] Optional defenses work.
- [ ] AI, community, and hybrid judging work, including fallback and ties.
- [ ] Public result links and downloadable cards work without guest sessions.
- [ ] Mobile, tablet, desktop, keyboard, contrast, and reduced motion pass.
- [ ] Database, unit, integration, build, and E2E verification all pass.
