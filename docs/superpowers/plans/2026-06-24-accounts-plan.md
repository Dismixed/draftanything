# Stim Labs Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent user accounts (email/password + Google OAuth) via Supabase Auth with guest-to-account merging, a profile system, leaderboards, and stats pages.

**Architecture:** Supabase Auth (GoTrue) on top of the existing guest session system. New `profiles` table linked to `auth.users` via a trigger. Guest sessions get an optional `user_id` FK for migration. Solo games use `guest_id` for device-level tracking and `user_id` for account-level leaderboards. All writes go through the server-side admin client — same pattern as today.

**Tech Stack:** Next.js 16, Supabase Auth (GoTrue), Supabase JS SDK (@supabase/ssr, @supabase/supabase-js), Zod, PostgreSQL, Gravatar

---

### Task 1: Database Migrations (5 files)

**Files:**
- Create: `supabase/migrations/202606250001_profiles_table.sql`
- Create: `supabase/migrations/202606250002_guest_sessions_user_id.sql`
- Create: `supabase/migrations/202606250003_chain_puzzle_attempts_guest_id.sql`
- Create: `supabase/migrations/202606250004_brain_dead_leaderboard_rework.sql`
- Create: `supabase/migrations/202606250005_link_guest_rpc.sql`

- [ ] **Step 1: Write migration 1 — `profiles` table + auth trigger**

Create the `profiles` table (1:1 with `auth.users`). Create a function and trigger on `auth.users` that auto-creates the profile row. The trigger reads `raw_user_meta_data` for `display_name` and `avatar_url`:
- Email/password sign-up: `display_name` from `raw_user_meta_data->>'display_name'`, `avatar_url` from Gravatar hash of the email
- Google OAuth: `display_name` from `raw_user_meta_data->>'name'`, `avatar_url` from `raw_user_meta_data->>'picture'`

Enable RLS on `profiles`, grant SELECT to `anon`/`authenticated`, create a "can read all profiles" policy (same read-open pattern as all other tables).

- [ ] **Step 2: Write migration 2 — `guest_sessions.user_id`**

```sql
alter table public.guest_sessions
  add column user_id uuid references public.profiles(id) on delete set null;
create index guest_sessions_user_id_idx on public.guest_sessions (user_id) where user_id is not null;
```

Update RLS on `guest_sessions` — the existing policy already allows reads. No change needed since `user_id` is a nullable FK column added to a table that already has wide-open SELECT.

- [ ] **Step 3: Write migration 3 — `chain_puzzle_attempts.guest_id`**

```sql
alter table public.chain_puzzle_attempts
  add column guest_id uuid references public.guest_sessions(id) on delete set null;
alter table public.chain_puzzle_attempts
  add constraint chain_puzzle_attempts_identity_check
    check (num_nonnulls(guest_id, user_id) >= 1);
create index chain_puzzle_attempts_guest_idx on public.chain_puzzle_attempts (guest_id, mode);
```

- [ ] **Step 4: Write migration 4 — `brain_dead_leaderboard` rework**

Replace `player_token` with dual identity columns:
1. Add `guest_id` (nullable FK to `guest_sessions`), `user_id` (nullable FK to `profiles`)
2. Backfill `guest_id` from existing `player_token` values by matching against a new session identifier (see Notes below)
3. Drop `player_token` column and old unique constraint
4. Add check constraint: `num_nonnulls(guest_id, user_id) >= 1`
5. Add partial unique indexes: `unique (guest_id, play_date) where guest_id is not null` and `unique (user_id, play_date) where user_id is not null`
6. Grant same SELECT permissions on the new columns

**Note on backfill:** The existing `player_token` is a client-generated UUID stored in `localStorage`. It has no relationship to `guest_sessions`. For the migration, set `guest_id = NULL` for all existing rows. The backfill is lossy — those entries lose device-level identity but remain visible on the leaderboard with their `display_name`. This is acceptable because `player_token` was already ephemeral (clearing localStorage breaks the link).

- [ ] **Step 5: Write migration 5 — `link_guest_to_account` RPC**

```sql
create or replace function public.link_guest_to_account(
  p_token_hash text,
  p_user_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update public.guest_sessions
  set user_id = p_user_id
  where token_hash = p_token_hash
    and user_id is null;
end;
$$;
```

- [ ] **Step 6: Regenerate TypeScript types and verify**

Run: `pnpm db:types` to regenerate `lib/supabase/database.types.ts`
Run: `supabase db reset --local` (ensure local Supabase is running first) to apply migrations and verify no errors.
Run: `supabase test db` to verify existing DB tests still pass.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/2026062500* lib/supabase/database.types.ts
git commit -m "feat(db): add profiles table, guest session linking, solo game identity columns"
```

---

### Task 2: Auth Server Infrastructure

**Files:**
- Create: `app/api/auth/merge/route.ts`
- Modify: `app/auth/callback/route.ts`
- Create: `components/auth/guest-merge-handler.tsx`

- [ ] **Step 1: Create `POST /api/auth/merge` endpoint**

This route:
1. Reads the `guest_token` cookie from the request
2. Gets the authenticated user from `supabase.auth.getUser()` using the server client
3. Hashes the guest token with the pepper
4. Calls `link_guest_to_account(token_hash, user.id)` RPC via the admin client
5. Returns `{ merged: true }` on success, `{ merged: false, reason }` on failure

Edge cases: no guest cookie (return ok, nothing to merge), already merged (idempotent), no authenticated user (return 401).

Write a test in `tests/api/auth/merge.test.ts` (Vitest) that mocks the cookie and verifies the RPC is called.

- [ ] **Step 2: Create `guest-merge-handler.tsx` component**

A client component (actually a hook, not a visual component) that:
1. On mount, checks if there's a guest token cookie (document.cookie check)
2. Checks if the user is authenticated (via supabase.auth.getSession())
3. If both are true, calls `POST /api/auth/merge`
4. Stores the merge result in a ref to avoid repeated calls
5. Returns `{ merged: boolean, guestId: string | null }`

Keep it minimal — `"use client"`, a single useEffect, a single fetch call.

- [ ] **Step 3: Update `/auth/callback` route**

The existing callback at `app/auth/callback/route.ts` already handles OAuth code exchange. Add guest merge logic:

1. After the code exchange succeeds, read the redirect URL for a potential `guest_token` query param (for OAuth flows that can't read cookies in the callback)
2. If a `guest_token` param exists, call `link_guest_to_account` via the admin client
3. Merge existing returned `next` param behavior

Test: hit the callback URL with a mocked code, verify it redirects correctly.

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/merge/route.ts app/auth/callback/route.ts components/auth/guest-merge-handler.tsx tests/api/auth/merge.test.ts
git commit -m "feat(auth): add guest-to-account merge endpoint and callback integration"
```

---

### Task 3: Auth UI Pages

**Files:**
- Create: `components/auth/sign-in-form.tsx`
- Create: `components/auth/sign-up-form.tsx`
- Create: `app/auth/page.tsx`
- Create: `app/auth/layout.tsx`

- [ ] **Step 1: Create `sign-in-form.tsx`**

A client component with:
- Email input + password input + submit button
- "Sign in with Google" button (OAuth)
- Calls `supabase.auth.signInWithPassword()` for email/password
- Calls `supabase.auth.signInWithOAuth({ provider: 'google' })` for Google
- On success, reads the `?redirect=` query param and navigates there (default: `/`)
- Error state display
- Loading state on submit

The form uses Stim Labs dark theme inline styles (matching the pattern in `admin-sign-in.tsx`).

- [ ] **Step 2: Create `sign-up-form.tsx`**

A client component with:
- Display name input + email input + password input + submit button
- "Sign up with Google" button
- On sign-up, passes `display_name` in `options.data` (so the auth trigger can read it from `raw_user_meta_data`)
- On success, calls `POST /api/auth/merge` to link the guest session
- On Google OAuth sign-up, the redirect includes the guest token in a query param for the callback to handle
- Error state display (including "user already exists" from Supabase)
- Loading state

- [ ] **Step 3: Create `/auth` page and layout**

`app/auth/page.tsx`: A page with two tabs: "Sign In" / "Sign Up". Toggles between `SignInForm` and `SignUpForm`. Reads `?redirect=` from search params. Clean, minimal layout.

`app/auth/layout.tsx`: Simple metadata export (`title: "Sign in — Stim Labs"`), pass children through.

- [ ] **Step 4: Verify the auth flow end-to-end**

Run the dev server + local Supabase. Test:
1. Navigate to `/auth` — tabs render correctly
2. Sign up with email + password — user is created, redirect happens
3. Sign in with email + password — session is established, redirect happens
4. Google OAuth button renders — click shows the OAuth redirect

- [ ] **Step 5: Commit**

```bash
git add components/auth/sign-in-form.tsx components/auth/sign-up-form.tsx app/auth/page.tsx app/auth/layout.tsx
git commit -m "feat(auth): add sign-in/sign-up page with email/password and Google OAuth"
```

---

### Task 4: Profile Menu + Layout Integration

**Files:**
- Create: `components/auth/profile-menu.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `profile-menu.tsx`** (server component wrapper)

Use a **server component** approach to avoid flash-of-wrong-content. Two files:

**1. `components/auth/profile-menu.tsx` — server component**

Reads the Supabase session from the request cookie using `createClient()` from `@/lib/supabase/server`. Passes the session user data as props to a client sub-component:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ProfileMenuClient } from "./profile-menu-client";

export async function ProfileMenu() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return <ProfileMenuClient variant="signed-out" />;
  }
  
  return (
    <ProfileMenuClient
      variant="signed-in"
      displayName={user.user_metadata?.display_name || user.email?.split("@")[0] || "Player"}
      avatarUrl={user.user_metadata?.avatar_url || null}
      email={user.email || ""}
    />
  );
}
```

**2. `components/auth/profile-menu-client.tsx` — client component**

Receives props (no session fetching). Handles the interactive parts:
- "Sign in" link (navigates to `/auth?redirect=current`)
- Dropdown toggle for signed-in state (display name, "My Stats" link, "Sign out" button)
- `"use client"` directive, minimal state

Wrapper positioned absolutely in the top-right. Same visual language as `SoundToggle` (small, subtle, dark-theme).

The "Sign in" link passes `?redirect=${encodeURIComponent(window.location.pathname)}` so the user returns to their current page after auth.

- [ ] **Step 2: Modify `app/layout.tsx`**

Add the `ProfileMenu` component alongside the `SoundToggle` in the root layout. Group them together in a flex row positioned in the top-right corner.

Before:
```tsx
// Currently only SoundToggle in the header area of specific pages
```

After:
```tsx
<div style={{ position: "absolute", top: 0, right: 0, zIndex: 2, display: "flex", gap: "8px", alignItems: "center" }}>
  <ProfileMenu />
  <SoundToggle />
</div>
```

Place this once in the root layout so it appears on all pages, not per-page.

- [ ] **Step 3: Add sign-in link to homepage**

`app/page.tsx` already has a `SoundToggle` rendered in the header area. The `ProfileMenu` in the root layout now handles this — no additional change needed to the homepage. Verify it renders correctly.

- [ ] **Step 4: Verify profile menu works**

1. Signed out: see "Sign in" link in the top-right corner
2. Click "Sign in" → navigates to `/auth`
3. Sign in → see the profile icon/initial in the top-right
4. Click profile → dropdown shows display name and "Sign out"
5. Click "Sign out" → session clears, reverts to "Sign in"

- [ ] **Step 5: Commit**

```bash
git add components/auth/profile-menu.tsx app/layout.tsx
git commit -m "feat(auth): add profile menu and sign-in link to root layout"
```

---

### Task 5: Account Prompt (Post-Game)

**Files:**
- Create: `components/auth/account-prompt.tsx`
- Modify: `components/brain-dead/game.tsx`
- Modify: `components/chainlink/game.tsx`
- Modify: `components/results/results-body.tsx` (or equivalent post-draft component)

- [ ] **Step 1: Create `account-prompt.tsx`**

A client component that:
1. Checks `supabase.auth.getSession()` — if signed in, renders nothing
2. Checks localStorage for `lastAccountPrompt` — if < 24h ago, renders nothing
3. Otherwise, renders a non-intrusive modal/sheet:
   - Title: "Save your progress?"
   - Body: "Create an account to keep your stats and appear on the leaderboard."
   - Two buttons: "Create account →" (navigates to `/auth`) and "Maybe later" (sets localStorage timestamp, dismisses)
4. Accepts an `onDismiss` callback prop
5. Uses portal overlay styling matching the existing modals in the app

- [ ] **Step 2: Wire account prompt into Brain Dead game**

In `components/brain-dead/game.tsx` (or wherever the run-end screen is), import and render `<AccountPrompt />` after the run completes and score is shown. Place it after the score display but before any "Play Again" buttons.

- [ ] **Step 3: Wire account prompt into Chainlink game**

In `components/chainlink/game.tsx`, import and render `<AccountPrompt />` after a daily puzzle is completed or an infinite run ends. Same placement pattern — after results, before next-action buttons.

- [ ] **Step 4: Wire account prompt into Draft Anything results**

In the post-draft result view (identify the right component — likely `components/results/results-body.tsx` or `components/draft/complete-panel.tsx`), render `<AccountPrompt />` after the results are displayed.

- [ ] **Step 5: Verify the prompt appears correctly**

Test each game:
1. Play a game as a guest (not signed in)
2. Complete the game
3. Verify the prompt appears (once per 24h)
4. Click "Maybe later" — prompt dismisses
5. Sign in, play again — prompt does NOT appear

- [ ] **Step 6: Commit**

```bash
git add components/auth/account-prompt.tsx components/brain-dead/game.tsx components/chainlink/game.tsx components/results/results-body.tsx
git commit -m "feat(auth): add post-game account prompt wired into all games"
```

---

### Task 6: Brain Dead Leaderboard Rework

**Files:**
- Create: `app/api/brain-dead/leaderboard/daily/route.ts` (split daily GET from existing route)
- Create: `app/api/brain-dead/leaderboard/all-time/route.ts` (new all-time endpoint)
- Modify: `app/api/brain-dead/leaderboard/route.ts`
- Modify: `lib/brain-dead/storage.ts`
- Modify: `components/brain-dead/leaderboard.tsx`

- [ ] **Step 1: Update `lib/brain-dead/storage.ts`**

Update `saveLeaderboardEntry()` to send the guest cookie alongside `playerToken`. Add a helper to read the guest token from the cookie:

```typescript
function getGuestId(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)guest_token=([^;]*)/);
  return match ? match[1] : null;
}
```

In `saveLeaderboardEntry`, include `guestId` in the request body (nullable). The API route will write to `guest_id` column when `guestId` is provided. Keep `playerToken` as fallback for backward compat.

- [ ] **Step 2: Update `POST /api/brain-dead/leaderboard`**

Accept an optional `guestId` field in the request body alongside `playerToken`. When `guestId` is present:
- Hash it with the pepper to get `token_hash`
- Call `get_active_guest_session_id(token_hash)` to resolve the `guest_id`
- Write `guest_id` to the database
- When `guestId` is absent (legacy clients), write `player_token` as before

Also accept an optional `userId` field (set when the caller detects an authenticated session client-side). Write `user_id` when present.

The upsert now uses the new partial unique indexes. Since the schema migration dropped `(player_token, play_date)` and replaced it with `(guest_id, play_date)` and `(user_id, play_date)`, the upsert `onConflict` target depends on which identity is used.

- [ ] **Step 3: Create `GET /api/brain-dead/leaderboard/daily` route**

Move the existing daily leaderboard query from the root `route.ts` to `daily/route.ts`. Update to also return `guest_id` and `user_id` in the response so the client can identify "you" entries. Same response shape + `identity_type`.

- [ ] **Step 4: Create `GET /api/brain-dead/leaderboard/all-time` route**

New endpoint that returns the all-time best scores per **signed-in user only** (guests are excluded — no persistent identity):

```sql
select
  p.id as player_id,
  p.display_name,
  p.avatar_url,
  max(b.score) as best_score,
  max(b.correct) as best_correct,
  count(*) as games_played
from brain_dead_leaderboard b
inner join profiles p on p.id = b.user_id
where b.user_id is not null
group by p.id, p.display_name, p.avatar_url
order by best_score desc
limit 100
```

- Only entries with `user_id` set are included (guests have no `user_id`).
- JOIN with `profiles` to get the current display_name and avatar_url (avatars update if the user changes their email/Gravatar).
- Return `{ entries: [{ playerId, name, avatarUrl, bestScore, bestCorrect, gamesPlayed }] }`.
- Unauthenticated requests still return the data (readable by anyone), but the entries are all account-linked.

- [ ] **Step 5: Update `components/brain-dead/leaderboard.tsx`**

Rework the leaderboard UI to have two tabs: **Daily** and **All-Time**.

**Daily tab**: existing behavior, but identity matching now also checks `guest_id` against the current guest cookie. Keep the existing `getSubmittedEntryId()` flow as a fallback.

**All-Time tab**: calls `GET /api/brain-dead/leaderboard/all-time`, displays a ranked list. Each entry shows rank number, name (with Gravatar dot if available), best score, and games played. Guest-only entries show no avatar.

Tab state is local (`useState<'daily' | 'all-time'>`). Default to daily.

- [ ] **Step 6: Verify leaderboard works end-to-end**

1. Play Brain Dead as guest → submit score → open leaderboard → daily tab shows entry, marked as "you"
2. Switch to all-time tab → entry appears (marked as "you" if guest_id matches)
3. Sign in → play again → submit score → all-time tab shows entry with profile name and avatar
4. Refresh page → identity persists via cookie

- [ ] **Step 7: Commit**

```bash
git add app/api/brain-dead/leaderboard/daily/route.ts app/api/brain-dead/leaderboard/all-time/route.ts app/api/brain-dead/leaderboard/route.ts lib/brain-dead/storage.ts components/brain-dead/leaderboard.tsx
git commit -m "feat(brain-dead): add all-time leaderboard view and dual identity support"
```

---

### Task 7: Chainlink Identity + Stats Page

**Files:**
- Modify: `app/api/chainlink/attempt/route.ts` (create if it doesn't exist, or modify the puzzle-submission route)
- Create: `app/api/chainlink/stats/route.ts`
- Create: `app/chainlink/stats/page.tsx`

First, explore existing Chainlink API routes to understand how puzzle attempts are submitted:

- [ ] **Step 0: Find and read the Chainlink attempt/puzzle completion route**

Run: `find app/api/chainlink -name "*.ts" | head -10` and read the relevant file(s) that handle puzzle completion/saving attempts. This determines where to add `guest_id`.

- [ ] **Step 1: Add `guest_id` to Chainlink attempt submission**

In the route that creates `chain_puzzle_attempts` rows:
1. Accept `guestId` from the request body or read the `guest_token` cookie server-side
2. Hash it and resolve the `guest_id` via `get_active_guest_session_id`
3. Write `guest_id` alongside the existing `user_id` field
4. If the user is authenticated (Supabase session exists), also set `user_id`

- [ ] **Step 2: Create `GET /api/chainlink/stats`**

A route that returns stats for the current user:
- If authenticated: aggregate by `user_id` across all modes
- If guest: aggregate by `guest_id` for the current session
- Response shape:
```json
{
  "totalAttempts": number,
  "dailyCompleted": number,
  "currentStreak": number,
  "bestScore": number,
  "avgDifficulty": string | null,
  "dailyHistory": string[]
}
```

- `currentStreak`: computed via SQL window function — order `chain_puzzle_attempts` by `created_at` for daily-mode completions, count consecutive days
- `dailyHistory`: array of ISO date strings (YYYY-MM-DD) for each day the user completed a daily puzzle in the last 90 days, for rendering the heatmap

- [ ] **Step 3: Create `/chainlink/stats` page**

A page that:
1. Calls `GET /api/chainlink/stats`
2. Renders stats in a clean, minimal layout (matching Chainlink's visual style, dark theme)
3. Sections:
   - **Stats row**: total attempts, daily puzzles completed, current streak (number with label beneath), best score, average difficulty
   - **Activity heatmap**: a simple 90-day calendar grid. Rows for days of the week (Mon–Sun), columns for weeks. Each cell is a small colored square: filled (green/dark) if the user completed a daily puzzle that day, empty (gray/faint) otherwise. Use CSS grid, no chart library. Self-contained in ~50 lines.
     ```
     Mon ██ ██ ██ ██ ██ ██ ██ ██
     Tue ██ ██ ██ ██ ██ ██ ██ ██
     Wed ██ ██ ██ ██ ██ ██ ██ ██
     ...
     ```
   - Filter `dailyHistory` entries to the last 90 days. Each date maps to a cell in the grid.
4. Guest view: shows stats and heatmap for the current guest session
5. Signed-in view: shows all stats (same UI, richer data set)
6. Footer note for guests: "Sign in to track your stats across devices" with a link to `/auth`

No chart library needed — just CSS grid, conditional cell styling, and date math.

- [ ] **Step 4: Verify Chainlink stats**

Play a Chainlink daily puzzle. Check the stats page — daily completion shows 1. Heatmap shows a filled cell for today. Play again on a different day — streak updates, heatmap shows another filled cell. Sign out — stats still tied to guest session. Sign in — stats persist under the account.

- [ ] **Step 5: Commit**

```bash
git add app/api/chainlink/attempt/route.ts app/api/chainlink/stats/route.ts app/chainlink/stats/page.tsx
git commit -m "feat(chainlink): add guest identity tracking and stats page"
```

---

### Task 8: Verification & Polish

- [ ] **Step 1: Run the full test suite**

```bash
pnpm db:reset && pnpm db:test && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Fix any issues.

- [ ] **Step 2: Manual E2E walkthrough**

Using the dev server + Supabase:
1. Hit the homepage — see "Sign in" link
2. Navigate to `/auth` — see sign-in/sign-up tabs
3. Sign up with email+password — redirects, profile menu shows
4. Play Brain Dead as guest — account prompt appears
5. Play Chainlink as guest — account prompt appears
6. Open Chainlink stats — guest stats show
7. Sign out — profile menu reverts

- [ ] **Step 3: Final commit**

```bash
git commit -m "chore: final verification and polish"
```

---

## Notes

### Auth trigger details

The Supabase Auth trigger function on `auth.users`:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_avatar_url text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'display_name',
    split_part(new.email, '@', 1),
    'Player'
  );
  v_avatar_url := coalesce(
    new.raw_user_meta_data ->> 'picture',
    'https://www.gravatar.com/avatar/' || encode(extensions.digest(lower(trim(new.email)), 'md5'), 'hex') || '?d=mp&s=200'
  );
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, v_display_name, v_avatar_url);
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### Existing auth flow reference

The existing `app/auth/callback/route.ts` and `components/admin/admin-sign-in.tsx` show the Supabase Auth patterns already in use. Follow their conventions.

### Brain Dead `player_token` migration

The existing `player_token` column has no FK relationship. Migration steps:
1. Add new columns
2. No data backfill (lossy but acceptable — entries remain visible with display_names)
3. Drop old column
4. Update unique constraints
5. Update the leaderboard API to write `guest_id` when available
6. Update `storage.ts` to send `guestId` alongside `playerToken`
7. After a transition period, drop `playerToken` support from the API

### Existing guest session helpers

`features/guest/session.ts` provides `ensureGuestSession()` and `requireGuestSession()` which resolve the `guest_id` from the cookie. Use these in API routes to get the current guest's UUID.

### Gravatar

Gravatar URL format: `https://www.gravatar.com/avatar/${md5(email)}?d=mp&s=200`
- `md5` is the hex-encoded MD5 hash of the lowercased, trimmed email
- `d=mp` is the "mystery person" fallback
- `s=200` is the size in pixels
