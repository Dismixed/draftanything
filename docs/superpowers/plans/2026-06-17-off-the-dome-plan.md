# Off the Dome Drafting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Off the Dome" drafting mode where players type freeform picks instead of selecting from a pre-built pool.

**Architecture:** New `picking_mode` field on drafts controls whether picks come from a pool or are typed freely. Off-the-dome mode skips pool review, validates picks for uniqueness, and stores freeform text in a new `item_name` column on picks.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (PostgreSQL + Realtime), Zustand, Zod, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-06-17-off-the-dome-design.md`

---

## File Structure

### Database
- `supabase/migrations/202606170001_off_the_dome.sql` — **Create**: `picking_mode` column, `item_name` column, `forfeited` column, updated constraints

### Types & Schema
- `features/draft/types.ts` — **Modify**: Add `PickingMode`, update `SafeDraft`, `SafePick`
- `features/room/schema.ts` — **Modify**: Add `pickingMode` to `createRoomSchema`
- `lib/supabase/database.types.ts` — **Modify**: Regenerate after migration

### Room Creation
- `components/lobby/create-room-form.tsx` — **Modify**: Add picking mode toggle
- `components/lobby/lobby.tsx` — **Modify**: Display picking mode in config summary
- `app/api/drafts/route.ts` — **Modify**: Pass `pickingMode` to `createRoom`
- `features/room/service.ts` — **Modify**: Pass `pickingMode` to RPC

### Draft Flow
- `features/draft/service.ts` — **Modify**: Skip pool review transition for off-the-dome
- `app/api/drafts/[draftId]/pick/route.ts` — **Modify**: Accept `itemName`, validate based on mode
- `features/draft/projection.ts` — **Modify**: Include `itemName` in picks, empty `availableItems` for off-the-dome

### Draft Screen
- `components/draft/draft-board.tsx` — **Modify**: Conditional layout based on `pickingMode`
- `components/draft/pick-history.tsx` — **Create**: Pick log component for left column
- `components/draft/off-the-dome-input.tsx` — **Create**: Bottom sticky input bar
- `components/draft/available-pool.tsx` — **Modify**: Hide for off-the-dome mode

### Auto-pick
- `app/api/drafts/[draftId]/auto-pick/route.ts` — **Modify**: Handle forfeit for off-the-dome

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/202606170001_off_the_dome.sql`

- [ ] **Step 1: Write the migration SQL**

Create a new migration file that:
1. Adds `picking_mode` column to `drafts` table (TEXT, NOT NULL, DEFAULT 'pool', CHECK constraint)
2. Makes `picks.item_id` nullable
3. Adds `picks.item_name` column (TEXT, nullable)
4. Adds `picks.forfeited` column (BOOLEAN, NOT NULL, DEFAULT FALSE)
5. Adds CHECK constraint ensuring exactly one of: (forfeited=true with both null), (forfeited=false with item_id), (forfeited=false with item_name)
6. Adds index on `(draft_id, LOWER(TRIM(item_name)))` for duplicate checking

- [ ] **Step 2: Run the migration**

Run: `npx supabase db reset` (or `npx supabase migration up`)
Expected: Migration applies successfully

- [ ] **Step 3: Regenerate database types**

Run: `npx supabase gen types typescript --local > lib/supabase/database.types.ts`
Expected: Types file updates with new columns

- [ ] **Step 4: Commit**

Run: `git add supabase/migrations/ lib/supabase/database.types.ts && git commit -m "feat: add off-the-dome database schema"`

---

## Task 2: Types & Schema Updates

**Files:**
- Modify: `features/draft/types.ts`
- Modify: `features/room/schema.ts`

- [ ] **Step 1: Add PickingMode type and update SafeDraft/SafePick**

In `features/draft/types.ts`:
1. Add `type PickingMode = "pool" | "off_the_dome"`
2. Add `pickingMode: PickingMode` to `SafeDraft`
3. Add `itemName: string | null` and `forfeited: boolean` to `SafePick`

- [ ] **Step 2: Update createRoomSchema**

In `features/room/schema.ts`:
1. Add `pickingMode: z.enum(["pool", "off_the_dome"]).default("pool")` to `createRoomSchema`

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck` (or `npx tsc --noEmit`)
Expected: No type errors

- [ ] **Step 4: Commit**

Run: `git add features/draft/types.ts features/room/schema.ts && git commit -m "feat: add picking mode types and schema"`

---

## Task 3: Room Creation UI

**Files:**
- Modify: `components/lobby/create-room-form.tsx`

- [ ] **Step 1: Add picking mode toggle to create room form**

In `components/lobby/create-room-form.tsx`:
1. Add `pickingMode` to form state (default: "pool")
2. Add a segmented control / toggle above the existing fields:
   - Label: "Draft Mode"
   - Options: "From a Pool" | "Off the Dome"
3. Wire the toggle to update `pickingMode` in form state
4. Pass `pickingMode` in the form submission payload

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Test the UI manually**

Run: `pnpm dev`
Expected: Toggle appears on create room form, selection updates state

- [ ] **Step 4: Commit**

Run: `git add components/lobby/create-room-form.tsx && git commit -m "feat: add picking mode toggle to create room form"`

---

## Task 4: Room Creation API

**Files:**
- Modify: `app/api/drafts/route.ts`
- Modify: `features/room/service.ts`

- [ ] **Step 1: Pass pickingMode through the API**

In `app/api/drafts/route.ts`:
1. Ensure `pickingMode` is included in the validated body (from Zod schema)
2. Pass it to `createRoom()`

In `features/room/service.ts`:
1. Pass `pickingMode` to the `create_draft` RPC call

- [ ] **Step 2: Update create_draft RPC**

In `supabase/migrations/202606170001_off_the_dome.sql` (or new migration):
1. Update `create_draft` RPC to accept `p_picking_mode` parameter
2. Insert it into the `drafts` table

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

Run: `git add app/api/drafts/ features/room/ supabase/migrations/ && git commit -m "feat: pass picking mode through room creation API"`

---

## Task 5: Lobby — Display Picking Mode & Skip Pool Review

**Files:**
- Modify: `components/lobby/lobby.tsx`
- Modify: `features/draft/service.ts` (if needed)

- [ ] **Step 1: Display picking mode in lobby config summary**

In `components/lobby/lobby.tsx`:
1. Show `pickingMode` in the configuration summary (e.g., "Mode: Off the Dome" or "Mode: From a Pool")

- [ ] **Step 2: Update "Commence Draft" button behavior**

In `components/lobby/lobby.tsx`:
1. When `pickingMode === "off_the_dome"` and host clicks "Commence Draft":
   - Skip `POOL_REVIEW` phase
   - Transition directly to `DRAFTING` phase
   - Call the appropriate API to start the draft (may need to call `start_draft` RPC directly or update the pool review skip logic)

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

Run: `git add components/lobby/lobby.tsx && git commit -m "feat: display picking mode and skip pool review for off-the-dome"`

---

## Task 6: Pick Submission API — Accept itemName

**Files:**
- Modify: `app/api/drafts/[draftId]/pick/route.ts`

- [ ] **Step 1: Update pick route to accept itemName**

In `app/api/drafts/[draftId]/pick/route.ts`:
1. Update Zod validation to accept either `itemId` or `itemName` based on draft's `pickingMode`
2. For off-the-dome mode:
   - Validate `itemName` is 1-200 characters, trimmed
   - Pass `itemName` to the `submit_pick` RPC

- [ ] **Step 2: Update submit_pick RPC**

In a new migration or append to existing:
1. Update `submit_pick` RPC to accept `p_item_name` parameter
2. For off-the-dome mode:
   - Check duplicate: `SELECT 1 FROM picks WHERE draft_id = ? AND LOWER(TRIM(item_name)) = LOWER(TRIM($2))`
   - Insert pick with `item_id = NULL`, `item_name = $2`, `forfeited = FALSE`

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

Run: `git add app/api/drafts/[draftId]/pick/ supabase/migrations/ && git commit -m "feat: accept item name for off-the-dome picks"`

---

## Task 7: Projection — Include itemName

**Files:**
- Modify: `features/draft/projection.ts`

- [ ] **Step 1: Update projection to include itemName**

In `features/draft/projection.ts`:
1. Include `item_name` in the picks query/select
2. For off-the-dome mode, return `availableItems` as empty array
3. Map `item_name` to `itemName` in `SafePick`

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

Run: `git add features/draft/projection.ts && git commit -m "feat: include item name in draft projection"`

---

## Task 8: Draft Board — Conditional Layout

**Files:**
- Modify: `components/draft/draft-board.tsx`
- Modify: `components/draft/available-pool.tsx`

- [ ] **Step 1: Hide available pool for off-the-dome mode**

In `components/draft/available-pool.tsx`:
1. Accept `pickingMode` prop
2. Return null (or empty) when `pickingMode === "off_the_dome"`

In `components/draft/draft-board.tsx`:
1. Pass `pickingMode` to `AvailablePool`

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

Run: `git add components/draft/draft-board.tsx components/draft/available-pool.tsx && git commit -m "feat: hide available pool for off-the-dome mode"`

---

## Task 9: Pick History Component

**Files:**
- Create: `components/draft/pick-history.tsx`

- [ ] **Step 1: Create pick history component**

Create `components/draft/pick-history.tsx`:
1. Accept props: `picks: SafePick[]`, `players: SafePlayer[]`, `currentPickIndex: number`, `pickOrder: PickSlot[]`
2. Render a scrollable list of picks, newest at top
3. Each entry: `"{pickNumber}. {playerName} — {itemName}"` (or "Forfeited" if forfeited)
4. Show current turn indicator: `"{nextPickNumber}. ? — On the clock..."`
5. Style to match existing design system (dark theme, fonts)

- [ ] **Step 2: Integrate into draft board**

In `components/draft/draft-board.tsx`:
1. Import `PickHistory`
2. Render in left column when `pickingMode === "off_the_dome"`
3. Pass required props from projection

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

Run: `git add components/draft/pick-history.tsx components/draft/draft-board.tsx && git commit -m "feat: add pick history component for off-the-dome"`

---

## Task 10: Off-the-Dome Input Component

**Files:**
- Create: `components/draft/off-the-dome-input.tsx`

- [ ] **Step 1: Create bottom sticky input component**

Create `components/draft/off-the-dome-input.tsx`:
1. Accept props: `isMyTurn: boolean`, `currentPlayerName: string`, `onSubmit: (itemName: string) => void`, `isSubmitting: boolean`
2. Render a bottom sticky bar with:
   - Text input (1-200 chars)
   - "Draft" button
   - Submits on button click or Enter key
3. States:
   - Your turn: Input enabled, placeholder "Type your pick..."
   - Not your turn: Show "Waiting for {playerName}..."
   - Submitting: Disabled with loading indicator
4. Validation: Disable button if input is empty
5. Error handling: Show toast for duplicate picks

- [ ] **Step 2: Integrate into draft board**

In `components/draft/draft-board.tsx`:
1. Import `OffTheDomeInput`
2. Render when `pickingMode === "off_the_dome"`
3. Wire `onSubmit` to call the pick API with `itemName`
4. Handle success/error responses

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

Run: `git add components/draft/off-the-dome-input.tsx components/draft/draft-board.tsx && git commit -m "feat: add off-the-dome input component"`

---

## Task 11: Auto-Pick — Forfeit Behavior

**Files:**
- Modify: `app/api/drafts/[draftId]/auto-pick/route.ts`

- [ ] **Step 1: Update auto-pick for off-the-dome forfeit**

In `app/api/drafts/[draftId]/auto-pick/route.ts`:
1. Check draft's `pickingMode`
2. For off-the-dome mode: call `auto_pick` RPC which inserts a forfeited pick row (`forfeited = TRUE`, `item_id = NULL`, `item_name = NULL`)
3. Advance to next pick

- [ ] **Step 2: Update auto_pick RPC**

In a new migration:
1. Update `auto_pick` RPC to handle off-the-dome mode
2. Insert forfeited pick row instead of picking first available item

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 4: Commit**

Run: `git add app/api/drafts/[draftId]/auto-pick/ supabase/migrations/ && git commit -m "feat: forfeit turn for auto-pick in off-the-dome mode"`

---

## Task 12: AI Commentary Integration

**Files:**
- Modify: `features/ai/commentary.ts` or `features/ai/commentary-trigger.ts` (if needed)

- [ ] **Step 1: Verify commentary works with freeform picks**

Check that `handleCommentaryForPick()` works when picks have `itemName` instead of `itemId`:
1. Commentary triggers should evaluate against `itemName` text
2. AI prompts should include the freeform pick name
3. If any changes needed, update the commentary handler

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 3: Commit**

Run: `git add features/ai/ && git commit -m "feat: ensure AI commentary works with freeform picks"` (only if changes made)

---

## Task 13: End-to-End Testing

- [ ] **Step 1: Create a room with Off the Dome mode**

1. Run `pnpm dev`
2. Create a room with "Off the Dome" selected
3. Verify the toggle works and form submits correctly
4. Verify lobby shows "Mode: Off the Dome"

- [ ] **Step 2: Start the draft**

1. Have host click "Commence Draft"
2. Verify it skips pool review and goes directly to DRAFTING phase
3. Verify the draft board shows: Pick History (left), Rosters (center), AI Desk (right)

- [ ] **Step 3: Make picks**

1. Verify bottom sticky input appears for the current player
2. Type a pick and submit (button and Enter)
3. Verify pick appears in Pick History and Roster
4. Verify duplicate picks are rejected with error message
5. Verify AI commentary fires after picks

- [ ] **Step 4: Test auto-pick forfeit**

1. Create a room with a short timer (15s)
2. Let the timer expire for a player
3. Verify the turn is forfeited (shows as forfeited in history)

- [ ] **Step 5: Complete the draft**

1. Complete all picks
2. Verify transition to DEFENSE phase
3. Verify defense, voting, judging, results all work normally

---

## Task 14: Edge Cases & Polish

- [ ] **Step 1: Test edge cases**

1. Empty/whitespace-only input — should be rejected
2. Very long input (200+ chars) — should be capped
3. Case-insensitive duplicates — "lebron" and "LeBron" should conflict
4. Special characters in pick names — should work
5. All players forfeit — draft should complete

- [ ] **Step 2: Mobile responsiveness**

1. Verify bottom sticky bar works on mobile
2. Verify pick history scrolls properly on small screens
3. Verify input is accessible on touch devices

- [ ] **Step 3: Final commit**

Run: `git add -A && git commit -m "feat: off-the-dome drafting polish and edge cases"`
