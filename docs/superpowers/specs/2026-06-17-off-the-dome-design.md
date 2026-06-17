# Off the Dome Drafting — Design Spec

**Date:** 2026-06-17
**Status:** Draft

## Overview

Add a new "Off the Dome" drafting mode where players type freeform picks instead of selecting from a pre-built pool. This mode skips pool review, goes straight to drafting, and validates picks for uniqueness against other players' choices.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Duplicate picks | Not allowed | Maintains draft tension and uniqueness |
| Input mechanism | Text input + button + Enter | Works for mouse and keyboard users |
| Pool review phase | Skip entirely | No pool to review in freeform mode |
| Left column content | Pick History | Shows what's been picked so players know what's off-limits |
| Input placement | Bottom sticky bar | Always accessible, doesn't push content around |
| Post-draft flow | Unchanged | Defense, voting, judging, results all work the same |
| Data model | New `picking_mode` field | Clean separation from turn order (`draft_type`) |
| Auto-pick behavior | Skip/forfeit turn | Simpler than generating a random pick |

## Data Model Changes

### `drafts` table

New column:
```sql
picking_mode TEXT NOT NULL DEFAULT 'pool' CHECK (picking_mode IN ('pool', 'off_the_dome'))
```

### `picks` table

Changes:
```sql
-- Make item_id nullable (off-the-dome picks have no pool item)
ALTER TABLE picks ALTER COLUMN item_id DROP NOT NULL;

-- Add freeform pick name column
ALTER TABLE picks ADD COLUMN item_name TEXT;

-- Add forfeit indicator (for auto-pick skip in off-the-dome mode)
ALTER TABLE picks ADD COLUMN forfeited BOOLEAN NOT NULL DEFAULT FALSE;

-- Constraint: normal picks must have either item_id or item_name;
-- forfeited picks have both null
ALTER TABLE picks ADD CHECK (
  (forfeited = TRUE AND item_id IS NULL AND item_name IS NULL) OR
  (forfeited = FALSE AND item_id IS NOT NULL AND item_name IS NULL) OR
  (forfeited = FALSE AND item_id IS NULL AND item_name IS NOT NULL)
);
```

Forfeited turns are stored as pick rows with `forfeited = TRUE`, `item_id = NULL`, `item_name = NULL`. This preserves pick order history and makes roster rendering clear (forfeited rounds show as empty).

### Types (`features/draft/types.ts`)

```typescript
type PickingMode = "pool" | "off_the_dome";

// Add to SafeDraft
interface SafeDraft {
  // ... existing fields
  pickingMode: PickingMode;
}

// Add to SafePick
interface SafePick {
  // ... existing fields
  itemName: string | null; // null for pool mode, set for off-the-dome
  forfeited: boolean; // true if player forfeited this turn (auto-pick skip)
}
```

### Room creation schema (`features/room/schema.ts`)

```typescript
const createRoomSchema = z.object({
  // ... existing fields
  pickingMode: z.enum(["pool", "off_the_dome"]).default("pool"),
});
```

## Room Creation UI

### Create Room Form (`components/lobby/create-room-form.tsx`)

New UI element — segmented control / toggle:
```
Draft Mode: [From a Pool] [Off the Dome]
```

- Placed above the existing form fields
- Default: "From a Pool"
- When "Off the Dome" is selected:
  - "Rounds" field still shows (controls picks per player)
  - All other fields remain unchanged
  - No pool-related options appear

### Lobby (`components/lobby/lobby.tsx`)

- Display `pickingMode` in the configuration summary
- "Commence Draft" button behavior:
  - Pool mode: transitions to `POOL_REVIEW` (current)
  - Off the dome: transitions directly to `DRAFTING` (skip pool review)

## Draft Flow

### Starting the draft (`features/draft/service.ts`)

`startDraft()` works the same for both modes:
- Computes pick order via `buildPickOrder()` (standard/snake/random)
- Stores pick order, sets `current_pick_index = 0`
- Sets turn deadline if timer configured

### Submitting a pick

**API route** (`app/api/drafts/[draftId]/pick/route.ts`):

Accepts either:
- `{ itemId: string, expectedPick: number }` — pool mode
- `{ itemName: string, expectedPick: number }` — off the dome mode

Validation:
- `itemName` must be 1-200 characters, trimmed
- Mode detection: check `draft.picking_mode` to determine which field to expect

**RPC** (`submit_pick`):

Additional validation for off-the-dome mode:
- Check `item_name` is not already picked in this draft (case-insensitive, trimmed):
  ```sql
  SELECT 1 FROM picks
  WHERE draft_id = $1
    AND LOWER(TRIM(item_name)) = LOWER(TRIM($2))
  LIMIT 1
  ```
- Insert pick with `item_id = NULL`, `item_name = $2`
- Fire commentary (same as pool mode)

### Auto-pick (`auto_pick` RPC)

For off-the-dome mode:
- Insert a pick row with `forfeited = TRUE`, `item_id = NULL`, `item_name = NULL`
- This preserves the pick slot in the order history
- Advance `current_pick_index` to next player
- Roster rendering: forfeited rounds show as empty slots

### Projection (`features/draft/projection.ts`)

Update `buildProjection()`:
- Include `item_name` in picks
- For off-the-dome mode, `availableItems` is always empty array

## Draft Screen Layout

### Draft Board (`components/draft/draft-board.tsx`)

Conditional layout based on `pickingMode`:

**Off the Dome layout:**

| Left Column | Center Column | Right Column |
|-------------|---------------|--------------|
| Pick History | Player Rosters | AI Commentary |

### Left Column: Pick History (`components/draft/pick-history.tsx` — new)

- Running log of all picks, newest at top
- Each entry: `{pickNumber}. {playerName} — {itemName}`
- Current turn indicator: `"{nextPickNumber}. ? — On the clock..."`
- Scrollable if list gets long

### Bottom Sticky Bar (`components/draft/off-the-dome-input.tsx` — new)

- Anchored to bottom of viewport
- Contains: text input + "Draft" button
- Submits on button click or Enter key
- States:
  - **Your turn**: Input enabled, placeholder "Type your pick..."
  - **Not your turn**: Shows "Waiting for {playerName}..." (input hidden)
  - **Submitting**: Disabled state with loading indicator

### Validation feedback

- Duplicate pick: toast/banner "Already picked — choose something else"
- Empty input: button disabled
- Network error: toast with retry option

## Post-Draft Phases

No changes to:
- Defense phase
- Voting phase
- Judging phase
- Results/complete phase

All work identically for off-the-dome drafts. Judging receives the freeform pick names as the roster content.

## Files to Change

### Database
- `supabase/migrations/` — new migration for `picking_mode` column and `picks` table changes

### Types & Schema
- `features/draft/types.ts` — add `PickingMode`, update `SafeDraft`, `SafePick`
- `features/room/schema.ts` — add `pickingMode` to `createRoomSchema`
- `lib/supabase/database.types.ts` — regenerate after migration

### Room Creation
- `components/lobby/create-room-form.tsx` — add picking mode toggle
- `components/lobby/lobby.tsx` — display picking mode in config summary
- `app/api/drafts/route.ts` — pass `pickingMode` to `createRoom`
- `features/room/service.ts` — pass `pickingMode` to RPC

### Draft Flow
- `features/draft/service.ts` — no changes needed (pick order is mode-agnostic)
- `app/api/drafts/[draftId]/pick/route.ts` — accept `itemName`, validate based on mode
- `supabase/migrations/` — update `submit_pick` RPC for off-the-dome validation
- `features/draft/projection.ts` — include `itemName` in picks, empty availableItems for off-the-dome

### Draft Screen
- `components/draft/draft-board.tsx` — conditional layout based on pickingMode
- `components/draft/pick-history.tsx` — **new** component for pick log
- `components/draft/off-the-dome-input.tsx` — **new** component for bottom sticky input
- `components/draft/available-pool.tsx` — hide for off-the-dome mode
- `components/draft/current-turn.tsx` — minor updates for off-the-dome turn display

### Auto-pick
- `supabase/migrations/` — update `auto_pick` RPC to skip/forfeit for off-the-dome
- `app/api/drafts/[draftId]/auto-pick/route.ts` — no changes (calls RPC)

## Edge Cases

1. **Empty pick name**: Rejected by validation (1-200 chars)
2. **Whitespace-only pick**: Trimmed, rejected if empty
3. **Case-insensitive duplicates**: "lebron james" and "LeBron James" are the same pick
4. **Very long pick names**: Capped at 200 characters
5. **All players forfeit**: Draft completes with empty rosters for forfeited players
6. **Mixed forfeit + picks**: Normal picks still count, forfeit rounds are empty
7. **Timer expires in off-the-dome**: Auto-forfeit (skip turn)
