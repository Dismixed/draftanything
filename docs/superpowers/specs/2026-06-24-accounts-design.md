# Stim Labs Accounts

**Date:** 2026-06-24
**Status:** Draft

## Overview

Add persistent user accounts to Stim Labs while preserving the existing guest session system. Users can sign up with email/password or Google OAuth via Supabase Auth, link their guest history, unlock leaderboards and stats pages, and carry a consistent identity across all games.

---

## 1. Schema Changes

### 1.1 New table: `profiles`

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_nonempty
    check (char_length(btrim(display_name)) between 1 and 40)
);
```

- One row per authenticated user, created by a **Supabase Auth trigger** (`on_auth_user_created`). This trigger is the **canonical creator** — the row is inserted automatically when the `auth.users` row is created.
- `display_name` source depends on sign-up method:
  - **Email/password**: collected from the sign-up form.
  - **Google OAuth**: pulled from the Google profile `name` field. Falls back to the first part of the email (before `@`) if `name` is absent.
- `avatar_url` source depends on sign-up method:
  - **Email/password**: Gravatar URL derived from the email's MD5 hash.
  - **Google OAuth**: pulled from the Google profile `picture` field. Falls back to Gravatar if absent.

### 1.2 Modify: `guest_sessions`

```sql
alter table public.guest_sessions
  add column user_id uuid references public.profiles(id) on delete set null;
```

- Nullable FK to `profiles`.
- A signed-in account claims guest session(s) via this column.
- `on delete set null` preserves guest history if the account is deleted.

### 1.3 Modify: `chain_puzzle_attempts`

```sql
alter table public.chain_puzzle_attempts
  add column guest_id uuid references public.guest_sessions(id) on delete set null;
```

- Adds device-level identity alongside the existing `user_id` column.
- A check constraint ensures at least one of `guest_id` or `user_id` is set.
- Daily puzzle completion and streaks use `guest_id` (no account required).

### 1.4 Modify: `brain_dead_leaderboard`

Replace `player_token uuid not null` with dual identity columns:

```sql
alter table public.brain_dead_leaderboard
  add column guest_id uuid references public.guest_sessions(id) on delete set null,
  add column user_id uuid references public.profiles(id) on delete set null;

-- Migrate existing rows: set guest_id from player_token join
-- Drop the player_token column and old unique constraint
-- Add new unique constraint: unique (coalesce(guest_id, user_id), play_date)
```

- Guest entries use `guest_id` + display name entered before the run.
- Account entries use `user_id` + profile display name + avatar.
- Daily unique constraint per identity: `(guest_id, play_date)` or `(user_id, play_date)`.

### 1.5 New RPC: `link_guest_to_account`

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

- Called server-side after a guest signs up.
- Links the current guest session to the new account.
- Idempotent — safe to call multiple times.

---

## 2. Auth UI & Account Flow

### 2.1 Sign-in/Sign-up page: `/auth`

Two tabs on a single page:

| Feature | Sign In | Sign Up |
|---------|---------|---------|
| Email + password | `signInWithPassword` | `signUpWithPassword` |
| Google OAuth | `signInWithOAuth(google)` | Same button (creates account on first use) |
| Post-auth redirect | `?redirect=/previous-path` | Same |

- Styled to match Stim Labs dark theme.
- No email confirmation required (`enable_confirmations = false` already set in config).
- On sign-up success, the page calls `POST /api/auth/merge` to link the guest session.

### 2.2 Guest-to-account merge

Flow:

1. Guest plays a game (guest cookie exists).
2. Guest clicks "Sign in" or hits a post-game prompt.
3. Guest arrives at `/auth?redirect=/game`.
4. Guest signs up (email+password or Google).
5. Supabase calls `supabase.auth.signUp()` or `signInWithOAuth()`.
6. Server-side callback `/auth/callback` detects OAuth return, exchanges code for session.
7. Supabase Auth trigger creates the `profiles` row automatically (with `display_name` and `avatar_url` from the Google profile, falling back to first-part-of-email and Gravatar).
8. The callback route calls `POST /api/auth/merge`:
   - Reads `guest_token` cookie.
   - Calls `link_guest_to_account(token_hash, user_id)` RPC.
   - Does **not** create the profile row — the auth trigger owns that. Uses `ON CONFLICT DO NOTHING` as a safety net if the row is somehow missing.
9. Redirect to the original game page. Guest data is now linked.

For direct email+password sign-up (no OAuth callback):

1. React component calls `signUpWithPassword`.
2. Supabase Auth trigger creates the `profiles` row automatically (with `display_name` from the sign-up form, `avatar_url` from Gravatar).
3. On success, the page calls `POST /api/auth/merge` directly (client-to-server).
4. The merge endpoint calls `link_guest_to_account(RPC)` — it does **not** create the profile row. The auth trigger owns that. The merge endpoint uses `ON CONFLICT DO NOTHING` if the profile row doesn't exist yet (safety net for race conditions).

### 2.3 Account prompt (post-game)

Trigger points:

- **Draft Anything**: after the COMPLETE phase renders (results screen)
- **Chainlink**: after daily puzzle completion or infinite run ends
- **Brain Dead**: after a run ends and score is shown

Prompt UI:

> **Save your progress?**  
> Create an account to keep your stats and appear on the leaderboard.  
> [Create account →] [Maybe later]

- "Maybe later": stores a `lastPrompted` timestamp in localStorage, suppresses prompt for 24h.
- Always dismissable. No forced account creation.
- Checks `supabase.auth.getUser()` — if already signed in, never shows.

### 2.4 Profile menu (header)

Added to the root layout alongside the existing `SoundToggle`:

**Signed out:**
```
[SoundToggle]                     [Sign in]
```

**Signed in:**
```
[SoundToggle]               [👤 ▼]
                              ┌─────────┐
                              │ Display  │
                              │ Name     │
                              │─────────│
                              │ My Stats │
                              │ Sign out │
                              └─────────┘
```

- The profile icon shows a Gravatar image (if available) or the first letter of display name.
- "My Stats" links to a future aggregate stats page.
- "Sign out" calls `supabase.auth.signOut()` and reloads.
- Rendered as a server component reading the Supabase session cookie.

---

## 3. Solo Game Identity & Device Tracking

### 3.1 Device identity

`guest_sessions` already provides device identity via a 30-day HTTP-only cookie. No new system needed.

| Feature | Mechanism |
|---------|-----------|
| Daily puzzle completion | Query `chain_puzzle_attempts` by `guest_id` + today's puzzle |
| Streaks | Window function over `chain_puzzle_attempts` by `guest_id` ordered by date |
| Brain Dead daily leaderboard | Query `brain_dead_leaderboard` by `guest_id` + today's date |
| Session persistence | Existing 30-day cookie, auto-renewed on each page load |

### 3.2 RLS strategy

Maintain the existing pattern: **server-side admin client for writes, no RLS on writes, read access open to `anon`/`authenticated`**.

- `profiles`: managed server-side only.
- `chain_puzzle_attempts`: reads served server-side.
- `brain_dead_leaderboard`: reads served server-side, inserts via existing API patterns.

---

## 4. Leaderboards & Stats Pages

### 4.1 Brain Dead leaderboard (`/brain-dead/leaderboard`)

**Two views**, tabbed:

**Daily leaderboard** (public, no account needed):

| # | Player | Score | Correct | Date |
|---|--------|-------|---------|------|
| 1 | Alice  | 950   | 14      | Today |
| 2 | Bob    | 820   | 12      | Today |

- Shows entries from today.
- Guest entries show the display name the guest entered before playing.
- Account entries show profile name + Gravatar.

**All-time leaderboard** (requires account to appear; readable by anyone):

| # | Player | Best Score | Games Played |
|---|--------|-----------|--------------|
| 1 | Alice  | 950       | 23           |
| 2 | Bob    | 820       | 15           |

- Shows personal best per player (grouped by `user_id`, with `display_name` from `profiles`).
- Guests are not shown here (no persistent identity).

### 4.2 Chainlink stats (`/chainlink/stats`)

New page, requires sign-in:

- Total puzzles completed (all modes)
- Current streak (from `guest_id` tracking, shown even without account)
- Best score ever
- Average difficulty completed
- Daily puzzle completion heatmap (simple calendar grid with filled/unfilled cells, last 90 days)

### 4.3 Draft Anything stats (future)

Not in scope for this release. Accounts will eventually show:
- Drafts participated in (list filtered by `user_id` → `guest_sessions` → `draft_players`)
- Wins, top-3 finishes
- Favorite categories

---

## 5. Component Inventory

### 5.1 New components

| Component | Location | Purpose |
|-----------|----------|---------|
| `sign-in-form.tsx` | `components/auth/` | Email/password + Google sign-in form |
| `sign-up-form.tsx` | `components/auth/` | Email/password + Google sign-up form |
| `account-prompt.tsx` | `components/auth/` | Post-game "create account?" modal |
| `profile-menu.tsx` | `components/auth/` | Top-right profile dropdown |
| `guest-merge-handler.tsx` | `components/auth/` | Client hook that calls POST /api/auth/merge |

### 5.2 Modified files

| File | Change |
|------|--------|
| `app/layout.tsx` | Add profile menu in header area |
| `app/providers.tsx` | Add session context (read Supabase session cookie) |
| `app/page.tsx` | Add sign-in link to top area |
| `components/results/*` | Wire account-prompt after game completion |
| `components/brain-dead/game.tsx` | Wire account-prompt after run ends |
| `components/chainlink/game.tsx` | Wire account-prompt after puzzle/run |

### 5.3 New pages

| Page | Route |
|------|-------|
| Auth | `/auth` |
| Chainlink stats | `/chainlink/stats` |

### 5.4 New / modified API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/merge` | POST | Link guest session to account |
| `/api/chainlink/stats` | GET | Return user's Chainlink stats |
| `/api/brain-dead/leaderboard` | GET | Return daily/all-time leaderboard (rework existing) |

---

## 6. Migration Order

Five new migration files, applied sequentially:

1. **`202606250001_profiles_table.sql`** — Create `profiles` table, auth trigger, RLS
2. **`202606250002_guest_sessions_user_id.sql`** — Add `user_id` column, index
3. **`202606250003_chain_puzzle_attempts_guest_id.sql`** — Add `guest_id`, check constraint, index
4. **`202606250004_brain_dead_leaderboard_rework.sql`** — Add dual identity columns, migrate data, drop old
5. **`202606250005_link_guest_rpc.sql`** — `link_guest_to_account` RPC

---

## 7. Non-goals

- No avatar upload — Gravatar only.
- No email confirmation flow (Supabase config already has `enable_confirmations = false`).
- No Draft Anything stats page (future scope).
- No password reset flow (Supabase built-in handled separately).
- No account deletion flow (future scope).
- No friends/social features.

---

## 8. Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Auth methods | Email + password + Google OAuth via Supabase |
| Guest migration | Yes, automatic merge on sign-up |
| Solo game tracking | Device-level via guest_sessions, account unlocks leaderboards/stats |
| Profile fields | Display name + Gravatar avatar |
| Prompt timing | Subtle header link + post-game modal |
| Leaderboard scope | Daily (public) + All-time (requires account) |
