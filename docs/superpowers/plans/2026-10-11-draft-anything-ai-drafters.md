# Draft Anything AI Drafters and Solo Play Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One person can play a full Draft Anything draft against AI drafters, and hosts can fill empty seats in friend rooms with AI drafters.

**Architecture:** An AI drafter is a `draft_players` row with `is_bot = true` and no guest session. Its picks are made by the server when a connected human's browser calls `POST /api/drafts/[draftId]/bot-pick`; pool picks are computed from stored item scores, Off the Dome picks come from one Gemini call. Every phase rule that counts players is changed to count humans only, and seats are compacted when a draft leaves the lobby so no turn belongs to an empty seat.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres (plpgsql RPCs, pgTAP), Gemini via `features/ai/gemini.ts`, Vitest, Playwright, PostHog.

**Spec:** `docs/superpowers/specs/2026-10-10-draft-anything-ai-drafters-design.md`

## Global Constraints

- Work in the worktree `/Users/joshoguh/WebstormProjects/draft-anything-landing`, branch `feature/draft-anything-landing`.
- `.env.local` points at the **hosted production database**. Never run `pnpm db:push`, and never run the dev server, e2e tests or scripts that create rooms without the local Supabase environment variables set (Task 1 step 2).
- The migration is applied to the local database only. Applying it to the hosted database is a separate step that needs the owner's explicit go-ahead.
- Commit only when the owner asks. "Commit" steps below mean "stage and report"; do not run `git commit` without a go-ahead.
- Roster, in deal order: Chalk (`chalk`), Specialist (`specialist`), Wildcard (`wildcard`), Balancer (`balancer`), Hipster (`hipster`). Name clash with an existing player appends " II".
- Delays: host browser 1500 ms, other browsers 6000 ms, retry every 4000 ms. Off the Dome AI call timeout 10000 ms (the AI service rejects anything shorter), three candidates.
- Solo: opponents 1 to 5, default 3; no timer; judging mode `ai`.
- A draft that starts with exactly one human has its judging mode set to `ai`.
- AI tag text is `AI`. Lobby button text is `+ Add AI drafter`. Solo button text is `Start solo draft`. Landing button text is `Play solo`.
- Vitest runs with globals off: import `describe/it/expect/vi/afterEach` and call `afterEach(cleanup)` in component tests. Server-render tests start with `// @vitest-environment node`.
- Lint baseline is already red; the gate is "no new lint errors in touched files".

## Review Focus

1. A draft with AI drafters where the host closes the tab mid-draft: another human's browser must take over requesting AI picks (Task 5 hook test: non-host fires at 6000 ms).
2. Two browsers requesting the same AI pick: exactly one pick row, second request answered without error (Task 1 pgTAP stale test; Task 4 service test returns `stale`).
3. A hand-added pool item with no scores, and a pool where nothing has scores: AI drafters still pick (Task 2 tests).
4. Gemini returns names that differ only by case or spacing from taken picks, or fails: turn is forfeited, draft continues (Task 3 tests).
5. Three humans in a four-seat room, one of whom sat in seat 4 after seat 2 left: seats are compacted to 1 to 3 and the draft completes (Task 1 pgTAP compaction test).

---

### Task 1: Database migration and pgTAP tests

**Files:**
- Create: `supabase/migrations/202610110000_ai_drafters.sql`
- Create: `supabase/tests/ai_drafters.test.sql`
- Modify: `lib/supabase/database.types.ts` (regenerated)

**Interfaces:**
- Produces RPCs:
  - `add_bot_player(p_draft_id uuid, p_host_guest_id uuid, p_display_name text, p_bot_style text) returns uuid`
  - `remove_bot_player(p_draft_id uuid, p_host_guest_id uuid, p_player_id uuid) returns void`
  - `commence_off_the_dome(p_draft_id uuid, p_guest_id uuid) returns void`
  - `submit_bot_pick(p_draft_id uuid, p_expected_pick integer, p_item_id uuid default null, p_item_name text default null, p_forfeited boolean default false) returns table (o_current_pick_index integer, o_phase text, o_turn_deadline timestamptz)`
- Produces columns: `draft_players.is_bot`, `draft_players.bot_style`, `drafts.vetoed_names`.
- Error strings: `NOT_HOST`, `INVALID_PHASE`, `ROOM_FULL`, `NAME_TAKEN`, `NOT_A_BOT`, `NOT_BOT_TURN`, `STALE_STATE`, `ITEM_UNAVAILABLE`, `NOT_ENOUGH_PLAYERS`.

- [ ] **Step 1: Start the local database and record the baseline**

```bash
cd /Users/joshoguh/WebstormProjects/draft-anything-landing
pnpm db:start
pnpm db:reset
pnpm db:test
```
Expected: all existing pgTAP files pass. If any fail before the migration exists, note which, so later failures are not blamed on this work.

- [ ] **Step 2: Capture the local environment for later tasks**

Run `pnpm exec supabase status -o env` and write a file `scratch-local.env` in the session scratchpad (not the repo) with:
```
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY or PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```
Later tasks start Next with `env $(cat <that file> | xargs) pnpm next dev -p 3212`. Process variables override `.env.local`, so the hosted database is not touched.

- [ ] **Step 3: Write the failing pgTAP test**

`supabase/tests/ai_drafters.test.sql`, following the fixture style of `supabase/tests/draft_rpcs.test.sql` (`begin; create extension if not exists pgtap with schema extensions; select plan(N); ... select * from finish(); rollback;`). Fixtures: three guest sessions; draft A (`LOBBY`, pool, `max_players` 4, 1 round, `judging_mode` `community`) with the host in seat 1 and a second human in seat 4; draft B (`LOBBY`, `off_the_dome`, `max_players` 3, 1 round) with only the host. Assertions:

1. `has_function` for the four new RPCs; `has_column` for the three new columns.
2. `add_bot_player` on A by a non-host throws `NOT_HOST`.
3. `add_bot_player` on A by the host returns an id; the row has `is_bot`, `guest_id is null`, `seat = 2`, `is_ready`.
4. Adding with a taken name throws `NAME_TAKEN`.
5. Fill A (seat 3) then add again throws `ROOM_FULL`.
6. `remove_bot_player` on a human's id throws `NOT_A_BOT`; on a bot sets `removed_at`.
7. Compaction: after removing the seat 2 bot, call `start_pool_review(A, host)`. Expect seats `{1,2,3}` in old seat order (host, seat 3 bot, seat 4 human), `max_players = 3`, phase `POOL_REVIEW`, `judging_mode` still `community` (two humans).
8. One human: add two bots to B, `commence_off_the_dome(B, host)`. Expect phase `DRAFTING`, `max_players = 3`, `judging_mode = 'ai'`.
9. `commence_off_the_dome` on a room with one filled seat throws `NOT_ENOUGH_PLAYERS`.
10. On B set `pick_order` to seats 2,3,1 (bots first) via `start_draft`. `submit_bot_pick(B, 0, null, 'Alpha')` lives and returns index 1; `submit_bot_pick(B, 0, null, 'Beta')` throws `STALE_STATE`; `submit_bot_pick(B, 1, null, 'alpha ')` throws `ITEM_UNAVAILABLE`; `submit_bot_pick(B, 1, null, null, true)` lives and inserts a forfeited pick; `submit_bot_pick(B, 2, null, 'Gamma')` throws `NOT_BOT_TURN` (seat 1 is human).
11. Veto: `initiate_veto(B, host)` is refused for the forfeited pick as today; instead test on a fresh draft C (off the dome, host + one bot, bot picks first): after the bot's pick, `initiate_veto(C, host)` lives, `submit_veto_vote(C, host, true)` deletes the pick, phase returns to `DRAFTING`, and `drafts.vetoed_names` contains the name.
12. On C, after the human picks, `initiate_veto` by the host on their own pick is impossible as today, and there is no other human; assert the eligible count path: insert a second pick by the human and call `initiate_veto` as the host → `PICKER_CANNOT_INITIATE` (unchanged), confirming bots cannot be the route to a challenge.
13. Defense: move C to `DRAFT_COMPLETE`, `start_defense(C, host)`. Expect one `arguments` row for the bot with `skipped`. `submit_defense(C, host, 'x')` moves the phase to `JUDGING`.
14. Voting: draft D (`VOTING`, `community`, two humans and one bot). After both humans `submit_vote`, phase is `JUDGING`. One human may vote for the bot.
15. `leave_draft`: lobby draft E with host seat 1, bot seat 2, human seat 3. Host leaves; `host_guest_id` is the seat 3 human.
16. `reset_draft_for_rematch` on a `COMPLETE` draft with `vetoed_names = '["X"]'` leaves `'[]'`.

- [ ] **Step 4: Run it and confirm it fails**

Run: `pnpm db:test`
Expected: `ai_drafters.test.sql` fails on the first `has_function`.

- [ ] **Step 5: Write the migration**

`supabase/migrations/202610110000_ai_drafters.sql`:

```sql
-- AI drafters: players with no guest session, and the rules that must ignore them.

alter table public.draft_players
  add column if not exists is_bot boolean not null default false,
  add column if not exists bot_style text;

alter table public.draft_players alter column guest_id drop not null;

alter table public.draft_players
  add constraint draft_players_bot_shape check (
    (is_bot and guest_id is null and bot_style in ('chalk','specialist','wildcard','balancer','hipster'))
    or (not is_bot and guest_id is not null and bot_style is null)
  );

alter table public.drafts
  add column if not exists vetoed_names jsonb not null default '[]'::jsonb;

create or replace function public.add_bot_player(
  p_draft_id uuid, p_host_guest_id uuid, p_display_name text, p_bot_style text
) returns uuid language plpgsql security definer as $$
declare
  v_draft drafts%rowtype;
  v_seat integer;
  v_player_id uuid;
begin
  select * into v_draft from public.drafts where id = p_draft_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_draft.host_guest_id != p_host_guest_id then raise exception 'NOT_HOST' using errcode = 'P0001'; end if;
  if v_draft.phase != 'LOBBY' then raise exception 'INVALID_PHASE' using errcode = 'P0001'; end if;

  if (select count(*) from public.draft_players dp
      where dp.draft_id = p_draft_id and dp.removed_at is null) >= v_draft.max_players then
    raise exception 'ROOM_FULL' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.draft_players dp
             where dp.draft_id = p_draft_id and dp.removed_at is null
               and lower(dp.display_name) = lower(p_display_name)) then
    raise exception 'NAME_TAKEN' using errcode = 'P0001';
  end if;

  select s into v_seat
  from generate_series(1, v_draft.max_players) as s
  where s not in (select dp.seat from public.draft_players dp
                  where dp.draft_id = p_draft_id and dp.removed_at is null)
  order by s limit 1;

  insert into public.draft_players (draft_id, guest_id, display_name, seat, is_ready, is_bot, bot_style)
  values (p_draft_id, null, p_display_name, v_seat, true, true, p_bot_style)
  returning id into v_player_id;

  return v_player_id;
end; $$;

create or replace function public.remove_bot_player(
  p_draft_id uuid, p_host_guest_id uuid, p_player_id uuid
) returns void language plpgsql security definer as $$
declare v_draft drafts%rowtype;
begin
  select * into v_draft from public.drafts where id = p_draft_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_draft.host_guest_id != p_host_guest_id then raise exception 'NOT_HOST' using errcode = 'P0001'; end if;
  if v_draft.phase != 'LOBBY' then raise exception 'INVALID_PHASE' using errcode = 'P0001'; end if;

  update public.draft_players set removed_at = now()
  where id = p_player_id and draft_id = p_draft_id and is_bot and removed_at is null;
  if not found then raise exception 'NOT_A_BOT' using errcode = 'P0001'; end if;
end; $$;

-- Called while the draft row is locked, as a draft leaves the lobby.
-- Renumbers active seats to 1..N in seat order, shrinks the room to N,
-- and forces AI judging when only one human is playing.
create or replace function public._prepare_draft_start(p_draft_id uuid)
returns void language plpgsql security definer as $$
declare
  v_row record;
  v_rank integer := 0;
  v_humans integer;
begin
  for v_row in
    select id, seat from public.draft_players
    where draft_id = p_draft_id and removed_at is null
    order by seat
  loop
    v_rank := v_rank + 1;
    if v_row.seat != v_rank then
      update public.draft_players set seat = v_rank where id = v_row.id;
    end if;
  end loop;

  if v_rank < 2 then raise exception 'NOT_ENOUGH_PLAYERS' using errcode = 'P0001'; end if;

  select count(*) into v_humans from public.draft_players
  where draft_id = p_draft_id and removed_at is null and not is_bot;

  update public.drafts
  set max_players = v_rank,
      judging_mode = case when v_humans = 1 then 'ai'::public.judging_mode else judging_mode end
  where id = p_draft_id;
end; $$;
```

The ascending loop is safe against the unique `(draft_id, seat)` index: the row of rank k moves to seat k, which is either its own seat or one vacated earlier.

Then, in the same file, re-create these existing functions. Copy each body from the migration named and make only the change listed:

| Function | Copy from | Change |
| --- | --- | --- |
| `start_pool_review` | `202606150008` | Before the `update ... set phase = 'POOL_REVIEW'`, add `perform public._prepare_draft_start(p_draft_id);` |
| `_resolve_veto_voting` | `202606230005` | Add `and not is_bot` to the `v_eligible_count` query. In the vetoed branch, before `delete from public.picks`, add: `update public.drafts set vetoed_names = vetoed_names \|\| to_jsonb((select item_name from public.picks where id = v_draft.pending_pick_id)) where id = p_draft_id and (select item_name from public.picks where id = v_draft.pending_pick_id) is not null;` |
| `initiate_veto` | `202606230005` | Add `and not is_bot` to the `v_eligible_count` query |
| `start_defense` | `202606170009` | After the phase update add: `insert into public.arguments (draft_id, player_id, defense_text, skipped) select p_draft_id, dp.id, null, true from public.draft_players dp where dp.draft_id = p_draft_id and dp.removed_at is null and dp.is_bot on conflict on constraint arguments_draft_id_player_id_key do nothing;` |
| `maybe_advance_from_voting` | `202606230011` | Add `and not is_bot` to the `v_active_player_count` query |
| `advance_phase` | `202606230011` | Add `and not is_bot` to the `v_active_player_count` query in the `VOTING` branch |
| `leave_draft` | `202606230007` | Add `and not dp.is_bot` to the new-host query |
| `reset_draft_for_rematch` | `202606230010` | Add `vetoed_names = '[]'::jsonb` to the `update public.drafts` |

`maybe_advance_from_defense` is unchanged: bots have an `arguments` row, so its count still works.

New functions, also in this file:

```sql
create or replace function public.commence_off_the_dome(p_draft_id uuid, p_guest_id uuid)
returns void language plpgsql security definer as $$
declare v_draft drafts%rowtype;
begin
  select * into v_draft from public.drafts where id = p_draft_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_draft.host_guest_id != p_guest_id then raise exception 'NOT_HOST' using errcode = 'P0001'; end if;
  if v_draft.phase != 'LOBBY' then raise exception 'INVALID_PHASE' using errcode = 'P0001'; end if;
  if v_draft.picking_mode != 'off_the_dome' then raise exception 'INVALID_INPUT: not off-the-dome' using errcode = 'P0001'; end if;
  perform public._prepare_draft_start(p_draft_id);
  update public.drafts set phase = 'DRAFTING' where id = p_draft_id;
end; $$;

create or replace function public.submit_bot_pick(
  p_draft_id uuid,
  p_expected_pick integer,
  p_item_id uuid default null,
  p_item_name text default null,
  p_forfeited boolean default false
) returns table (o_current_pick_index integer, o_phase text, o_turn_deadline timestamptz)
language plpgsql security definer as $$
declare
  v_draft drafts%rowtype;
  v_player_id uuid;
  v_slot jsonb;
  v_available boolean;
begin
  select * into v_draft from public.drafts where id = p_draft_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_draft.phase != 'DRAFTING' then raise exception 'INVALID_PHASE' using errcode = 'P0001'; end if;
  if p_expected_pick != v_draft.current_pick_index then
    raise exception 'STALE_STATE: expected pick %, current pick %', p_expected_pick, v_draft.current_pick_index using errcode = 'P0001';
  end if;
  if v_draft.current_pick_index >= jsonb_array_length(v_draft.pick_order) then
    raise exception 'INVALID_PHASE: draft is complete' using errcode = 'P0001';
  end if;

  v_slot := v_draft.pick_order -> v_draft.current_pick_index;

  select id into v_player_id from public.draft_players
  where draft_id = p_draft_id and seat = (v_slot->>'seat')::integer
    and removed_at is null and is_bot;
  if not found then raise exception 'NOT_BOT_TURN' using errcode = 'P0001'; end if;

  if p_forfeited then
    insert into public.picks (draft_id, player_id, item_id, item_name, overall_pick, round, pick_in_round, is_auto_pick, forfeited)
    values (p_draft_id, v_player_id, null, null, (v_slot->>'overallPick')::integer,
            (v_slot->>'round')::smallint, (v_slot->>'pickInRound')::smallint, true, true);
  elsif v_draft.picking_mode = 'off_the_dome' then
    if p_item_name is null or length(btrim(p_item_name)) = 0 then
      raise exception 'INVALID_INPUT: item_name is required' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.picks where draft_id = p_draft_id
               and lower(btrim(item_name)) = lower(btrim(p_item_name))) then
      raise exception 'ITEM_UNAVAILABLE: duplicate item name' using errcode = 'P0001';
    end if;
    insert into public.picks (draft_id, player_id, item_id, item_name, overall_pick, round, pick_in_round, is_auto_pick, forfeited)
    values (p_draft_id, v_player_id, null, btrim(p_item_name), (v_slot->>'overallPick')::integer,
            (v_slot->>'round')::smallint, (v_slot->>'pickInRound')::smallint, false, false);
  else
    select is_available into v_available from public.draft_items
    where id = p_item_id and draft_id = p_draft_id;
    if not found then raise exception 'INVALID_INPUT: item not found in draft' using errcode = 'P0001'; end if;
    if not v_available then raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001'; end if;
    insert into public.picks (draft_id, player_id, item_id, overall_pick, round, pick_in_round, is_auto_pick)
    values (p_draft_id, v_player_id, p_item_id, (v_slot->>'overallPick')::integer,
            (v_slot->>'round')::smallint, (v_slot->>'pickInRound')::smallint, false);
    update public.draft_items set is_available = false where id = p_item_id;
  end if;

  return query
  select adv.o_current_pick_index, adv.o_phase, adv.o_turn_deadline
  from public._advance_draft_after_pick(p_draft_id, v_draft.current_pick_index + 1, v_draft.timer_seconds)
    as adv(o_current_pick_index, o_phase, o_turn_deadline, o_confirmed_pick_id);
end; $$;

revoke all on function public.add_bot_player(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.remove_bot_player(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.commence_off_the_dome(uuid, uuid) from public, anon, authenticated;
revoke all on function public.submit_bot_pick(uuid, integer, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public._prepare_draft_start(uuid) from public, anon, authenticated;
```

Before writing the revokes, read how `202606150002_policies.sql` and later migrations grant or revoke execute on existing RPCs and match that pattern exactly. Also read the `picks_valid_pick` check in `202606170003_off_the_dome.sql` and confirm a forfeited row with null item and null name passes it, as `auto_pick` already inserts one.

- [ ] **Step 6: Apply locally and run the tests**

```bash
pnpm db:reset && pnpm db:test
```
Expected: `ai_drafters.test.sql` passes; the three older files pass as in the baseline. If `draft_rpcs.test.sql` relied on a room starting with an empty seat, fix the test fixture, not the migration.

- [ ] **Step 7: Regenerate types**

```bash
pnpm db:types && pnpm typecheck
```
Expected: `database.types.ts` gains the new columns and functions; typecheck passes. Review the diff: only additions related to this migration should appear. If the local schema differs from the hosted one in unrelated ways and the diff is noisy, revert the file and add the new columns and four function signatures by hand instead.

- [ ] **Step 8: Stage**

`git add supabase/migrations/202610110000_ai_drafters.sql supabase/tests/ai_drafters.test.sql lib/supabase/database.types.ts`

---

### Task 2: Roster and pool picking (pure)

**Files:**
- Create: `features/bots/roster.ts`, `features/bots/pool-pick.ts`
- Test: `features/bots/roster.test.ts`, `features/bots/pool-pick.test.ts`

**Interfaces:**
- Consumes: `seededRandom`, `RandomSource` from `features/draft/order.ts`.
- Produces:

```ts
// roster.ts
export type BotStyle = "chalk" | "specialist" | "wildcard" | "balancer" | "hipster";
export interface BotProfile { style: BotStyle; name: string; blurb: string; domePersona: string }
export const BOT_ROSTER: readonly BotProfile[];
export function nextBot(existing: ReadonlyArray<{ displayName: string; botStyle: BotStyle | null }>): BotProfile;
// returns the first roster entry whose style is not already seated (wraps to the first if all five are),
// with " II" appended to name when a seated player already has that name (case-insensitive).

// pool-pick.ts
export interface ScoredItem { id: string; name: string; scores: Record<string, number> }
export interface PoolPickInput {
  style: BotStyle;
  available: ScoredItem[];          // non-empty
  rubric: Record<string, number>;   // key -> weight; may be empty
  ownLineup: ScoredItem[];
  specialistKey: string | null;     // from specialistCategory()
  random: RandomSource;
}
export function compositeScore(scores: Record<string, number>, rubric: Record<string, number>): number;
export function specialistCategory(rubric: Record<string, number>, draftId: string, seat: number): string | null;
export function pickFromPool(input: PoolPickInput): ScoredItem;
```

- [ ] **Step 1: Write failing tests**

`roster.test.ts`: empty room → Chalk; with Chalk seated → Specialist; all five seated → Chalk (wrap); a human named "chalk" seated and no bots → name `Chalk II`, style `chalk`.

`pool-pick.test.ts`, with rubric `{ fame: 50, skill: 50 }` and items A `{fame:9,skill:9}`, B `{fame:10,skill:2}`, C `{fame:6,skill:6}`, D `{fame:3,skill:3}`, E `{}` (unscored), F `{fame:1,skill:1}`:
- `chalk` → A.
- `specialist` with `specialistKey: "fame"` → B (fame weighted three times).
- `hipster` → the fourth by score (skips top three); with only three items available → the best.
- `balancer` with empty lineup → A; with lineup `[B]` (weak in skill) → the available item with the highest skill.
- `wildcard` with `random: () => 0` → the best of the top half; with `() => 0.99` → the last of the top half; never an item from the bottom half.
- Unscored item E ranks at the median of scored items (between C and D for these numbers; assert it is neither first nor last under `chalk` ordering by removing A to F one at a time).
- All items unscored and empty rubric: every style returns an item without throwing; `chalk` returns the first by name.
- One item available: every style returns it.
- `compositeScore({fame:10,skill:0},{fame:50,skill:50})` is 5; with empty rubric it is the plain mean.
- `specialistCategory` is stable for the same draft id and seat, returns `null` for an empty rubric.
- Determinism: two calls with `seededRandom("draft:7")` return the same item.

- [ ] **Step 2: Run and confirm failure**

Run: `pnpm vitest run features/bots`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

`roster.ts`: the five entries with `blurb` (one short lobby line each) and `domePersona` copied from the spec's roster table.

`pool-pick.ts` rules:
- `compositeScore`: weighted mean over rubric keys present in `scores`; if the rubric is empty, mean of all score values; if `scores` is empty, `NaN`.
- Unscored items: replace `NaN` with the median composite of scored items, or 0 when none are scored.
- Sort available items by score descending, ties by name ascending then id.
- `chalk`: first. `hipster`: index 3 if length > 3, else first. `wildcard`: `sorted[Math.floor(random() * Math.ceil(length / 2))]`.
- `specialist`: re-score with `specialistKey` weight multiplied by 3 (if the key is null, behave as `chalk`).
- `balancer`: if the lineup is empty or the rubric is empty, behave as `chalk`; otherwise find the rubric key with the lowest mean across the lineup and take the available item with the highest value for that key (missing value counts as the item's composite), ties by composite.
- `specialistCategory`: `Object.keys(rubric).sort()[Math.floor(seededRandom(draftId + ":" + seat)() * n)]`.

- [ ] **Step 4: Run and confirm pass**

Run: `pnpm vitest run features/bots`
Expected: PASS.

- [ ] **Step 5: Stage** the four files.

---

### Task 3: Off the Dome picking

**Files:**
- Create: `features/bots/dome-pick.ts`
- Test: `features/bots/dome-pick.test.ts`

**Interfaces:**
- Consumes: `generateJson` from `features/ai/gemini.ts`; `BotProfile` from Task 2.
- Produces:

```ts
export interface DomePickInput {
  topic: string;
  bot: BotProfile;
  takenNames: string[];   // every non-forfeited pick in the draft
  ownLineup: string[];
  vetoedNames: string[];
}
export type DomePickResult = { kind: "pick"; name: string } | { kind: "forfeit"; reason: "ai_error" | "all_taken" };
export function firstUsableCandidate(candidates: string[], taken: string[], vetoed: string[]): string | null;
export async function pickOffTheDome(input: DomePickInput): Promise<DomePickResult>;
```

- [ ] **Step 1: Write failing tests** (`// @vitest-environment node`, `vi.mock("@/features/ai/gemini")`, and the existing `tests/__mocks__/server-only.ts` alias)

- `firstUsableCandidate(["Heat","  heat ","Alien"], ["HEAT"], [])` → `"Alien"`.
- Vetoed names are skipped case-insensitively.
- Blank candidates and candidates longer than 200 characters are skipped; the result is trimmed.
- All taken → `null`.
- `pickOffTheDome` returns `{kind:"pick"}` with the first usable candidate when `generateJson` resolves `{ candidates: [...] }`.
- Returns `{kind:"forfeit", reason:"all_taken"}` when none are usable.
- Returns `{kind:"forfeit", reason:"ai_error"}` when `generateJson` rejects.
- `generateJson` is called with `timeoutMs: 8000` and a user prompt containing the topic, each taken name and each vetoed name.

- [ ] **Step 2: Run and confirm failure** — `pnpm vitest run features/bots/dome-pick.test.ts`.

- [ ] **Step 3: Implement**

Schema: `z.object({ candidates: z.array(z.string().min(1).max(200)).min(1).max(5) })` from `zod/v4`. System prompt: the drafter persona (`bot.domePersona`), instruction to return exactly three distinct real things that fit the topic, most preferred first, each a short name with no commentary, none of which appear in the taken or vetoed lists. User prompt: topic, taken list, own lineup, vetoed list. `maxOutputTokens: 256`, `timeoutMs: 8000`, `schemaName: "bot_dome_pick"`. Wrap the call in try/catch.

- [ ] **Step 4: Run and confirm pass.**

- [ ] **Step 5: Stage** the two files.

---

### Task 4: Server wiring — projections, bot service, routes, start flow

**Files:**
- Modify: `features/room/schema.ts` (`RoomPlayer.isBot`), `features/room/service.ts` (`buildProjection`)
- Modify: `features/draft/types.ts` (`SafePlayer.isBot`), `features/draft/projection.ts`
- Create: `features/bots/service.ts`, `features/bots/service.test.ts`
- Create: `app/api/drafts/[draftId]/bots/route.ts`, `app/api/drafts/[draftId]/bot-pick/route.ts`
- Modify: `app/api/drafts/[draftId]/pool/route.ts` (`commence-draft` case)
- Modify: `app/api/drafts/[draftId]/start/route.ts` (add `bot_count` to `draft_started`)
- Modify: `features/room/service.test.ts`, `features/draft/projection.test.ts` (new field)

**Interfaces:**
- Consumes: Task 1 RPCs; Task 2 `nextBot`, `pickFromPool`, `specialistCategory`, `BOT_ROSTER`; Task 3 `pickOffTheDome`; `handleCommentaryForPick` from `features/ai/commentary.ts`; `seededRandom`.
- Produces:

```ts
// features/bots/service.ts
export async function addBot(draftId: string, hostGuestId: string): Promise<RoomProjection>;
export async function removeBot(draftId: string, hostGuestId: string, playerId: string): Promise<RoomProjection>;
export type BotPickOutcome =
  | { status: "picked"; style: BotStyle; forfeited: boolean; phase: string }
  | { status: "stale" };
export async function makeBotPick(draftId: string, expectedPick: number): Promise<BotPickOutcome>;
```
- Routes:
  - `POST /api/drafts/[draftId]/bots` → 200 `RoomProjection`; `DELETE` with body `{ playerId }` → 200 `RoomProjection`. Errors: 403 `NOT_HOST`, 400 `INVALID_PHASE`, 409 `ROOM_FULL`, 400 `NOT_A_BOT`.
  - `POST /api/drafts/[draftId]/bot-pick` body `{ expectedPick: number }` → 200 `{ status: "picked" | "stale" }`; 401 if the caller is not a player; 409 `NOT_BOT_TURN`.

- [ ] **Step 1: Add `isBot` to both projections, test first**

In `features/room/service.test.ts` and `features/draft/projection.test.ts` add a case with a player row `{ is_bot: true, guest_id: null, bot_style: "chalk" }` and assert `isBot: true`, `isHost: false`, and that a human row gives `isBot: false`. Run, see failure, then add `isBot: Boolean(p.is_bot)` in both `buildProjection` functions and the field to `RoomPlayer` and `SafePlayer`. Widen the `guest_id` parameter type in `features/room/service.ts` to `string | null`. Run `pnpm typecheck`; fix every fixture the compiler flags by adding `isBot: false`.

- [ ] **Step 2: Write failing service tests**

`features/bots/service.test.ts` (`// @vitest-environment node`), mocking `@/lib/supabase/admin` with a small fake that returns canned rows for `from(...).select(...)` chains and records `rpc` calls (copy the mocking approach from `features/room/service.test.ts`), and mocking `./dome-pick` and `@/features/ai/commentary`:
- `addBot` calls `add_bot_player` with `Chalk`/`chalk` for an empty roster, and retries once with the next roster entry when the RPC answers `NAME_TAKEN`.
- `addBot` maps `ROOM_FULL` and `NOT_HOST` to `AppError` with those codes.
- `makeBotPick` returns `{status:"stale"}` without calling an RPC when the draft's `current_pick_index` differs from `expectedPick` or the phase is not `DRAFTING`.
- `makeBotPick` throws `AppError("NOT_BOT_TURN")` when the seat on the clock is human.
- Pool mode: calls `submit_bot_pick` with the `p_item_id` chosen by `pickFromPool` for the bot's style; available items only; own lineup built from the bot's earlier picks.
- Off the Dome: passes taken names (non-forfeited picks), own lineup and `vetoed_names` to `pickOffTheDome`; on `{kind:"forfeit"}` calls the RPC with `p_forfeited: true`.
- RPC error containing `STALE_STATE` or `ITEM_UNAVAILABLE` → `{status:"stale"}`; any other error is thrown.

- [ ] **Step 3: Implement `features/bots/service.ts`**

`makeBotPick` loads, with the admin client: the draft row (`phase, pick_order, current_pick_index, picking_mode, topic, rubric, vetoed_names`), active players, picks ordered by `overall_pick`, and (pool mode) items. Random source: `seededRandom(draftId + ":" + overallPick)`. Use the `AppError` codes already defined in `lib/errors`; if `NOT_BOT_TURN` or `NOT_A_BOT` is not in its code union, add it there.

- [ ] **Step 4: Routes**

Follow the structure of `app/api/drafts/[draftId]/pick/route.ts` (request id, `requireGuestSession`, `checkRateLimit`, `logRoute`, error mapping).
- `bots/route.ts`: rate limit `bots:${draftId}:${guestId}` 30 per minute. Capture `draft_bot_added` / `draft_bot_removed` with `draft_id` and `style`.
- `bot-pick/route.ts`: rate limit `botpick:${draftId}:${guestId}` 120 per minute; reject callers for whom `getMyPlayerId` is empty; on `picked` run `after(() => { void handleCommentaryForPick(draftId); })` and capture `draft_bot_pick` with `draft_id`, `style`, `picking_mode`, `forfeited`.

- [ ] **Step 5: Start flow**

In `pool/route.ts`, replace the body of the `commence-draft` case with:
```ts
const { error } = await createAdminClient().rpc("commence_off_the_dome", { p_draft_id: draftId, p_guest_id: guestId });
if (error) { /* map NOT_HOST, INVALID_PHASE, NOT_ENOUGH_PLAYERS, else INVALID_INPUT to AppError */ }
await startDraft(draftId, guestId);
responseData = await getRoom(draftId);
```
`startDraft` and `lock_pool` already read `max_players`, which `_prepare_draft_start` has set to the number of filled seats, so they need no change. In `features/pool/service.ts` `startPoolReview`, map `NOT_ENOUGH_PLAYERS` to an `AppError`.

- [ ] **Step 6: Run** `pnpm vitest run features && pnpm typecheck`. Expected: PASS.

- [ ] **Step 7: Stage** the files listed above.

---

### Task 5: AI turns in the draft room

**Files:**
- Create: `features/draft/use-bot-turns.ts`, `features/draft/use-bot-turns.test.tsx`
- Modify: `components/draft/draft-board.tsx`, `components/draft/player-rosters.tsx`, `components/draft/pick-history.tsx`, `components/draft/current-turn.tsx`
- Modify: `components/draft/defense-panel.tsx`, `components/draft/voting-panel.tsx`, `components/draft/veto-panel.tsx`
- Create: `components/draft/ai-tag.tsx`

**Interfaces:**
- Consumes: `SafePlayer.isBot`; `POST /api/drafts/[draftId]/bot-pick`.
- Produces:

```ts
export const BOT_PICK_HOST_DELAY_MS = 1500;
export const BOT_PICK_OTHER_DELAY_MS = 6000;
export const BOT_PICK_RETRY_MS = 4000;
export function useBotTurns(opts: {
  draftId: string;
  active: boolean;        // phase is DRAFTING and the seat on the clock is an AI drafter
  pickIndex: number;
  isHost: boolean;
  onPicked: () => void;   // refetch the projection
}): void;
// components/draft/ai-tag.tsx
export function AiTag(): JSX.Element; // <span aria-label="AI drafter">AI</span>, styled like the lobby Host badge
```

- [ ] **Step 1: Write failing hook tests** with `vi.useFakeTimers()` and a stubbed `fetch`:
- Host, active: no call at 1499 ms, one call at 1500 ms with body `{"expectedPick": <pickIndex>}`.
- Non-host: no call before 6000 ms, one at 6000 ms.
- Not active: never calls.
- `fetch` rejects or answers 500: called again 4000 ms later, and again after that.
- `pickIndex` changes before the delay elapses: the pending call is cancelled and a new delay starts.
- Unmount cancels pending timers.
- A 200 answer calls `onPicked` once and schedules no retry.

- [ ] **Step 2: Run and confirm failure**, then implement the hook with one `useEffect` keyed on `[draftId, active, pickIndex, isHost]`, a `cancelled` flag, and `setTimeout` chaining for retries. A 409 answer (stale or not a bot turn) counts as done: call `onPicked`, no retry.

- [ ] **Step 3: Wire into `draft-board.tsx`**

Near the existing `currentPlayer` / `isMyTurn` (about line 223):
```ts
const isBotTurn = isDrafting && !!currentPlayer?.isBot;
const iAmHost = draft.hostPlayerId === myPlayerId;
useBotTurns({ draftId: draft.id, active: isBotTurn, pickIndex: draft.currentPickIndex, isHost: iAmHost, onPicked: () => void refetchProjection() });
```
Do not render `<TurnTimer>` when `isBotTurn`. Where the turn label shows `currentPlayer.displayName`, append `<AiTag />` for AI drafters and show "thinking…" in place of the "on the clock" suffix. Pass nothing new to `OffTheDomeInput`; its "waiting for {name}" text is fine.

- [ ] **Step 4: AI tag and human-only counts**

- `player-rosters.tsx`, `pick-history.tsx`, `current-turn.tsx`: render `<AiTag />` beside an AI drafter's name.
- `defense-panel.tsx` line 73: `allDefensesIn` already works because AI drafters have a defense row. Hide AI drafters' "skipped" rows from the list of who has responded, or label them `AI`; read the component and choose whichever needs the smaller change.
- `voting-panel.tsx` lines 40 and 139: compare against `players.filter((p) => !p.isBot).length`.
- `veto-panel.tsx` line 25: exclude AI drafters from the eligible voter list.
- `judging-panel.tsx`, `complete-panel.tsx`, and the results components under `components/` that list players: add `<AiTag />` where a name is rendered from `SafePlayer`. For the public results page, check `features/results/build-public-result.ts`; if it carries player names only, add an `isBot` flag there and render the tag.

- [ ] **Step 5: Run** `pnpm vitest run && pnpm typecheck`. Expected: PASS.

- [ ] **Step 6: Stage.**

---

### Task 6: AI drafters in the lobby

**Files:**
- Modify: `components/lobby/player-seat.tsx`, `components/lobby/lobby.tsx`, `components/lobby/lobby-config-form.tsx`, `components/lobby/lobby-config-summary.tsx`
- Test: `tests/components/lobby-ai-drafters.test.tsx`

**Interfaces:**
- Consumes: `RoomPlayer.isBot`; `POST` / `DELETE /api/drafts/[draftId]/bots`.
- Produces: `SeatList` props gain `canManageBots: boolean`, `onAddBot: () => void`, `onRemoveBot: (playerId: string) => void`, `busy: boolean`.

- [ ] **Step 1: Write failing component tests** for `SeatList`:
- Host view (`canManageBots`): each empty seat has a button named `+ Add AI drafter`; clicking calls `onAddBot`.
- Non-host view: no such button; the empty seat reads "Waiting for player…".
- An AI drafter's seat shows the `AI` tag and, for the host, a button named `Remove <name>`; clicking calls `onRemoveBot` with its id. No remove button for humans.
- AI drafters show no `Ready` badge and no `Host` badge.

- [ ] **Step 2: Run and confirm failure; implement** in `player-seat.tsx`. An empty seat with a button drops the 0.5 opacity so the button is readable.

- [ ] **Step 3: Lobby wiring** in `lobby.tsx`:
- `handleAddBot` → `POST /api/drafts/${room.draftId}/bots`, `handleRemoveBot` → `DELETE` with `{ playerId }`; both `setRoom` with the response and show failures in a small inline message under the seat list (reuse the existing text style; no alerts).
- `canStart` already counts all players; change the waiting text to "Waiting for at least 2 players. Add an AI drafter or share the code."
- `const humanCount = room.players.filter((p) => !p.isBot).length;`
- Hide the Room code section and `<RoomChat>` when `humanCount === 1 && room.players.length === room.maxPlayers`.
- Pass `humanCount` to `LobbyConfigForm` and `LobbyConfigSummary`; when it is 1 and the judging mode is not `ai`, show beside the judging setting: "With one human player, the AI judge decides."

- [ ] **Step 4: Run** `pnpm vitest run tests/components && pnpm typecheck`. Expected: PASS.

- [ ] **Step 5: Stage.**

---

### Task 7: Solo entry

**Files:**
- Modify: `lib/draft-landing/play-href.ts`, `tests/lib/draft-landing/play-href.test.ts`
- Modify: `features/room/schema.ts` (add `soloRoomSchema`), add cases to `features/room/schema` tests if a test file exists, otherwise create `features/room/solo-schema.test.ts`
- Create: `features/bots/solo.ts`, `features/bots/solo.test.ts`
- Create: `app/api/drafts/solo/route.ts`
- Create: `components/lobby/solo-form.tsx`
- Modify: `components/lobby/draft-lobby-page.tsx`, `app/draft-anything/play/page.tsx`, `tests/components/draft-lobby-page.test.tsx`
- Modify: `components/pool/pool-review.tsx` (hide share and chat for a solo room)

**Interfaces:**
- Consumes: `createRoom`, `getRoom`, `startPoolReview`, `startDraft`, Task 4 `addBot`.
- Produces:

```ts
// play-href.ts
export type PlayTab = "create" | "join" | "solo";
// playHref({ tab: "solo", topic }) → "/draft-anything/play?tab=solo&topic=…"; code still forces join.

// schema.ts
export const soloRoomSchema; // displayName, topic, opponents (int 1..5), rounds (1..10),
                             // draftType, pickingMode, aiPersonality, customJudgePrompt (same rule as createRoomSchema)
export type SoloRoomInput = z.infer<typeof soloRoomSchema>;

// features/bots/solo.ts
export async function createSoloRoom(input: SoloRoomInput, guestId: string): Promise<RoomProjection>;
```
- Route: `POST /api/drafts/solo` → 201 `RoomProjection` (phase `POOL_REVIEW` or `DRAFTING`).

- [ ] **Step 1: `play-href` tests first**: `playHref({tab:"solo"})`, with topic, `parsePlayParams({tab:"solo", topic:"x"})` → `{tab:"solo", topic:"x", code:""}`, and `{tab:"solo", code:"abc123"}` → join. Run, fail, implement, pass.

- [ ] **Step 2: Schema tests first**: opponents 0 and 6 rejected, 1 and 5 accepted; custom personality without a prompt rejected; a prompt without custom rejected. Implement `soloRoomSchema` by reusing the field definitions and the same `superRefine` as `createRoomSchema`.

- [ ] **Step 3: `createSoloRoom` tests first** (mock `@/features/room/service`, `./service`, `@/features/pool/service`, `@/features/draft/service`, admin client):
- Calls `createRoom` with `maxPlayers: opponents + 1`, `judgingMode: "ai"`, `timerSeconds: null`.
- Calls `addBot` `opponents` times.
- Pool mode: calls `startPoolReview`, not `startDraft`.
- Off the Dome: calls the `commence_off_the_dome` RPC then `startDraft`.
- Returns `getRoom(draftId)`.

Implement. Extract the three lines from Task 4 step 5 into `export async function commenceOffTheDome(draftId, guestId)` in `features/draft/service.ts` and use it from both the pool route and here.

- [ ] **Step 4: Route** `app/api/drafts/solo/route.ts`, modelled on `app/api/drafts/route.ts`, sharing its create rate limit key (`create:${guestId}`, 5 per hour). Capture `draft_solo_started` with `draft_id`, `opponents`, `picking_mode`, `rounds`.

- [ ] **Step 5: Solo form**

`components/lobby/solo-form.tsx` (client), props `{ initialTopic?: string }`. Build it from the same field markup and class names as `create-room-form.tsx`: display name, topic (`id="solo-topic"`, `maxLength` 80, with the same topic suggestions component), AI opponents (1 to 5 stepper or select, default 3, `id="solo-opponents"`), rounds, picking mode, draft type, judge personality and the custom prompt field. Submit: `POST /api/guest` then `POST /api/drafts/solo`, then `router.push('/draft/' + data.roomCode)`, with the same error display as the create form. Button: `Start solo draft`.

If shared markup between the two forms exceeds a screen of duplicated JSX, extract the repeated field groups into `components/lobby/room-fields.tsx` and use them from both forms; otherwise leave `create-room-form.tsx` untouched.

- [ ] **Step 6: Tab**

Component test first in `tests/components/draft-lobby-page.test.tsx`: `initialTab="solo"` shows the solo panel with `#solo-topic` filled from `initialTopic`; three tabs are present and named Create Room, Join Room, Solo. Then add the third tab to `draft-lobby-page.tsx`, pass `initialTopic` to `SoloForm`, and include `"solo"` in the existing `draft_lobby_tab_changed` event values. `app/draft-anything/play/page.tsx` needs no change beyond the widened type.

- [ ] **Step 7: Pool screen for solo**

In `pool-review.tsx`, compute `humanCount` from `room.players`; when it is 1, hide any room-code or invite prompt and `<RoomChat>`. Read the component first; change only what it actually renders.

- [ ] **Step 8: Run** `pnpm vitest run && pnpm typecheck`. Expected: PASS.

- [ ] **Step 9: Stage.**

---

### Task 8: Landing page and copy

**Files:**
- Modify: `components/draft-landing/landing.tsx`, `components/draft-landing/landing-link.tsx`, `app/draft-anything.css`
- Modify: `lib/games/content/draft-anything.ts`
- Modify: `tests/components/draft-landing.test.tsx`, `tests/components/draft-landing.server.test.tsx`, `tests/e2e/draft-landing.spec.ts`
- Check: `tests/lib/games/content.test.ts`, `tests/seo.test.ts` for assertions on FAQ count or description text

- [ ] **Step 1: Tests first**: the hero and the closing section each have a link named `Play solo` with href `/draft-anything/play?tab=solo`; the eyebrow reads "Draft Anything · a party game for 1 to 6"; six FAQ questions including "Can I play Draft Anything alone?"; the FAQ JSON-LD contains that question.

- [ ] **Step 2: Implement**
- `landing-link.tsx`: allow `cta: "solo"`.
- `landing.tsx`: add the third action after Join a room in both action groups, styled as a quiet text-weight button (`dal-btn dal-btn-ghost`); three buttons stack full-width on phones as the two do now.
- `draft-anything.ts`: add the FAQ item. Answer: "Yes. Choose Play solo, pick how many AI drafters to face, and draft against them. They pick on their turns and the AI judge ranks every lineup, yours included. You can also add AI drafters to empty seats in a room with friends." Update any "2 to 6 players" wording in that file to "1 to 6", and mention AI drafters in the "Setting up a room" section in one sentence.
- Step 4 of "How a draft works" stays as is.

- [ ] **Step 3: Run** `pnpm vitest run tests && pnpm typecheck`. Fix any content or SEO test that asserts the old FAQ count.

- [ ] **Step 4: Stage.**

---

### Task 9: End to end, verification and visual check

**Files:**
- Create: `tests/e2e/solo-draft.spec.ts`
- Create (scratchpad, not the repo): a Playwright config with `baseURL: "http://localhost:3212"`

- [ ] **Step 1: Start the app against the local database**

Stop the dev server on port 3210 first if it is still running (`TaskStop`), because Next allows one dev server per project directory. Then:
```bash
env $(cat <scratch-local.env> | xargs) GEMINI_API_KEY=$GEMINI_FROM_ENV_LOCAL pnpm next dev -p 3212
```
Confirm in the server log or by `curl` that a created room appears in the local database (`pnpm exec supabase db query` or Studio at the URL printed by `supabase status`), not the hosted one, before running anything else.

- [ ] **Step 2: Write `tests/e2e/solo-draft.spec.ts`**

1. Solo, From a Pool: open `/draft-anything/play?tab=solo`, fill name and topic, 2 opponents, 1 round, start. On the pool screen generate the pool (real Gemini call; allow 90 s) and start the draft. Pick the first available item on the human's turn. Wait for the draft-complete screen, continue to defense, skip the defense, wait for results. Assert three ranked lineups and two `AI` tags.
2. Solo, Off the Dome: same form with Off the Dome; intercept nothing on the server, but type a pick on the human's turn; assert AI picks appear in the pick history within 20 s each and the draft reaches results.
3. Friend room: create a 3-seat room, add one AI drafter in the lobby, assert the start button enables, remove it, assert it disables.

Use `test.setTimeout(240_000)`. These tests are tagged `@local-db` in their titles and skipped unless `process.env.E2E_LOCAL_DB === "1"`, so nobody runs them against the hosted database by accident.

- [ ] **Step 3: Run**

```bash
E2E_LOCAL_DB=1 pnpm exec playwright test tests/e2e/solo-draft.spec.ts tests/e2e/draft-landing.spec.ts tests/e2e/responsive.spec.ts --config <scratch config>
```
Expected: PASS. A stuck draft here is a real defect: use the server log and the local database to find which phase rule still counts AI drafters, fix it in the migration, `pnpm db:reset`, re-run `pnpm db:test`.

- [ ] **Step 4: Full gate**

```bash
pnpm typecheck && pnpm test && pnpm db:test && pnpm build
pnpm exec eslint <every file touched in Tasks 1 to 8>
```
Expected: typecheck, unit tests, pgTAP and build pass; no lint errors that are not already on the baseline.

- [ ] **Step 5: Visual check**

With the local-database server running, capture the Solo tab, the lobby with two AI drafters, an AI turn on the draft board, and the results screen at 1280 px and 390 px in both themes. Fix anything that overlaps, wraps badly or fails contrast, then re-run the affected tests.

- [ ] **Step 6: Report**

State what passed, what was not tested, and that the hosted database still needs the migration before this can ship. Ask the owner about committing, applying the migration to the hosted database, and merging.
