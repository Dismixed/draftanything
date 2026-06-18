# Rematch & Lobby Config Editing

## Overview

Two features for the Draft Anything host experience:

1. **Rematch** — When a draft completes, the host can click "Rematch" to reset the room to LOBBY phase. Same room code, same players, all draft data cleared.
2. **Editable Config in Lobby** — The host can edit all game configuration settings while in the lobby, before starting the draft.

## Goals

- Seamless rematch flow: host clicks one button, all players return to the lobby
- Full config editing for the host in the lobby (topic, rounds, timer, draft type, picking mode, judging mode, AI personality, max players)
- Block config changes that conflict with current state (e.g., can't reduce maxPlayers below current player count)
- Non-hosts see config as read-only but update in real-time when the host makes changes

## Constraints

- Only the host can trigger rematch or edit config
- Room must be in COMPLETE phase to rematch
- Room must be in LOBBY phase to edit config
- Config validation mirrors `createRoomSchema` (same rules as room creation, including `superRefine` for `aiPersonality`/`customJudgePrompt` bidirectional constraints)

---

## Feature 1: Rematch

### Database

New migration: `202606180001_rematch_rpc.sql`

RPC `reset_draft_for_rematch(p_draft_id uuid, p_host_guest_id uuid)`:

1. Lock the `drafts` row with `SELECT ... FOR UPDATE`
2. Validate caller is the host (`host_guest_id = p_host_guest_id`), else `RAISE EXCEPTION 'NOT_HOST'`
3. Validate phase is `COMPLETE`, else `RAISE EXCEPTION 'INVALID_PHASE'`
4. Delete all child data:
   - `DELETE FROM picks WHERE draft_id = p_draft_id`
   - `DELETE FROM draft_items WHERE draft_id = p_draft_id`
   - `DELETE FROM pool_suggestions WHERE draft_id = p_draft_id`
   - `DELETE FROM commentary WHERE draft_id = p_draft_id`
   - `DELETE FROM arguments WHERE draft_id = p_draft_id`
   - `DELETE FROM votes WHERE draft_id = p_draft_id`
   - `DELETE FROM judgments WHERE draft_id = p_draft_id`
5. Reset the `drafts` row:
   - `phase = 'LOBBY'`
   - `pick_order = NULL`
   - `current_pick_index = 0`
   - `turn_deadline = NULL`
   - `completed_at = NULL`
   - `rubric = NULL`
   - `judging_started_at = NULL`
6. Keep `draft_players` intact (display_name, seat, guest_id unchanged)

### API

`POST /api/drafts/[draftId]/rematch`

- Rate limited via `checkRateLimit()` (same pattern as other endpoints)
- Reads `guest_token` cookie, hashes it to get `guest_id`
- Calls `reset_for_rematch(draftId, guestId)` service function
- Returns updated `RoomProjection`

Error mapping in service layer:
- `NOT_HOST` → `AppError("NOT_HOST", "Only the host can start a rematch")`
- `INVALID_PHASE` → `AppError("INVALID_PHASE", "Room must be in COMPLETE phase to rematch")`

### UI

**`components/draft/complete-panel.tsx`:**
- Add `myPlayerId: string` to `CompletePanelProps`
- Host sees a "Rematch" button alongside existing share/download buttons
- Non-hosts see "Waiting for host to start rematch..."
- Button calls `POST /api/drafts/[draftId]/rematch`
- On success, `router.refresh()` brings everyone back to lobby

**`components/draft/phase-panel.tsx`:**
- Pass `myPlayerId` to `CompletePanel` (currently missing, unlike all other phase panels)

**`components/results/share-actions.tsx`:**
- The Rematch button is **only shown in the in-draft COMPLETE view** (via `CompletePanel`), not on the public `/results/[draftId]` page
- The public results page has no guest session context, so it cannot determine `isHost`
- Remove the broken rematch `<a>` link from `ShareActions` entirely — rematch lives only in `CompletePanel`

### Data flow

1. Host clicks Rematch → `POST /api/drafts/[draftId]/rematch`
2. RPC locks draft row, validates host + COMPLETE phase, resets draft, deletes child data
3. Realtime fires `UPDATE` on `drafts` table → all clients receive event
4. Clients' `fetchRoom()` runs → sees `phase: "LOBBY"` → `router.refresh()` → Lobby component renders
5. All players are still in `draft_players` → they appear in the lobby automatically

### Public results page behavior

The `/results/[draftId]` page already handles non-COMPLETE phases gracefully (line 58-75 of `page.tsx`): if `phase !== "COMPLETE"`, it shows "Results are not ready yet." After a rematch resets the draft to LOBBY, visiting the old results URL will show this message. No additional changes needed.

---

## Feature 2: Editable Config in Lobby

### Database

New migration: `202606180002_update_config_rpc.sql`

No schema changes needed. All config columns already exist on the `drafts` table.

RPC `update_draft_config(
  p_draft_id uuid,
  p_host_guest_id uuid,
  p_topic text,
  p_max_players smallint,
  p_rounds smallint,
  p_timer_seconds smallint,
  p_draft_type text,
  p_picking_mode text,
  p_judging_mode text,
  p_ai_personality text,
  p_custom_judge_prompt text
)`:

1. Lock the `drafts` row with `SELECT ... FOR UPDATE`
2. Validate caller is the host, else `RAISE EXCEPTION 'NOT_HOST'`
3. Validate phase is `LOBBY`, else `RAISE EXCEPTION 'INVALID_PHASE'`
4. Count current active players; validate `p_max_players >= current_count`, else `RAISE EXCEPTION 'ROOM_FULL'`
5. Validate field ranges (same as DB constraints):
   - `p_topic`: 2–200 chars
   - `p_max_players`: 2–6
   - `p_rounds`: 1–10
   - `p_timer_seconds`: NULL or 15–180
   - `p_draft_type`: 'standard', 'snake', 'random'
   - `p_picking_mode`: 'pool', 'off_the_dome'
   - `p_judging_mode`: 'ai', 'community', 'hybrid'
   - `p_ai_personality`: 'analyst', 'hype', 'roast', 'custom'
   - If `p_ai_personality = 'custom'`, `p_custom_judge_prompt` must be 10–500 chars
   - If `p_ai_personality != 'custom'`, `p_custom_judge_prompt` must be NULL
6. UPDATE the `drafts` row with all new values

### API

`PATCH /api/drafts/[draftId]/config`

- Rate limited via `checkRateLimit()`
- Reads `guest_token` cookie, hashes it to get `guest_id`
- Validates body with `updateConfigSchema` (see below)
- Calls `update_room_config(draftId, guestId, config)` service function
- Returns updated `RoomProjection`

Error mapping in service layer:
- `NOT_HOST` → `AppError("NOT_HOST", "Only the host can edit configuration")`
- `INVALID_PHASE` → `AppError("INVALID_PHASE", "Room must be in LOBBY phase to edit configuration")`
- `ROOM_FULL` → `AppError("ROOM_FULL", "Cannot reduce max players below current player count")`

### Schema

`features/room/schema.ts` — add `updateConfigSchema`:

```ts
export const updateConfigSchema = z.object({
  topic: z.string().min(2).max(80),
  maxPlayers: z.number().int().min(2).max(6),
  rounds: z.number().int().min(1).max(10),
  timerSeconds: z.union([z.literal(null), z.number().int().min(15).max(180)]).nullable(),
  draftType: z.enum(["standard", "snake", "random"]),
  pickingMode: z.enum(["pool", "off_the_dome"]),
  judgingMode: z.enum(["ai", "community", "hybrid"]),
  aiPersonality: z.enum(["analyst", "hype", "roast", "custom"]),
  customJudgePrompt: z.string().trim().min(10).max(500).optional().nullable(),
}).superRefine((data, ctx) => {
  // Same bidirectional constraint as createRoomSchema
  if (data.aiPersonality === "custom" && !data.customJudgePrompt) {
    ctx.addIssue({ code: "custom", message: "Custom judge instructions are required when using a custom judge", path: ["customJudgePrompt"] });
  }
  if (data.aiPersonality !== "custom" && data.customJudgePrompt) {
    ctx.addIssue({ code: "custom", message: "Custom judge instructions are only allowed for the custom judge", path: ["customJudgePrompt"] });
  }
});
```

### UI

**`components/lobby/lobby.tsx`:**
- Config section shows an "Edit" button for the host (top-right of the config card)
- Clicking it toggles to `ConfigEditor` inline (replaces the read-only `<dl>` display)
- Non-hosts see the current read-only display (no change from today)

**`components/lobby/config-editor.tsx` (new):**
- Reuses the same form fields as `CreateRoomForm` (topic, maxPlayers, rounds, timerSeconds, pickingMode, draftType, judgingMode, aiPersonality, customJudgePrompt)
- Pre-filled with current room values from `RoomProjection`
- Inline validation: blocks `maxPlayers` < current player count with error message
- Save button → `PATCH /api/drafts/[draftId]/config` → on success, switches back to read-only view
- Cancel button → discards changes, back to read-only view
- Loading/error states handled inline

### Data flow

1. Host edits config → clicks Save → `PATCH /api/drafts/[draftId]/config`
2. RPC validates and updates `drafts` row
3. Realtime fires `UPDATE` on `drafts` table → all clients receive event
4. Clients' `fetchRoom()` runs → config section updates with new values
5. Host's `ConfigEditor` closes, read-only view shows updated config

---

## Validation Rules

| Field | Constraint |
|-------|-----------|
| topic | 2–80 chars |
| maxPlayers | 2–6, must be >= current player count |
| rounds | 1–10 |
| timerSeconds | null or 15–180 |
| draftType | "standard", "snake", "random" |
| pickingMode | "pool", "off_the_dome" |
| judgingMode | "ai", "community", "hybrid" |
| aiPersonality | "analyst", "hype", "roast", "custom" |
| customJudgePrompt | required (10–500 chars) when aiPersonality="custom"; must be null/empty otherwise |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/202606180001_rematch_rpc.sql` | Create | `reset_draft_for_rematch` RPC |
| `supabase/migrations/202606180002_update_config_rpc.sql` | Create | `update_draft_config` RPC |
| `features/room/service.ts` | Modify | Add `resetForRematch()` and `updateRoomConfig()` functions with error code mapping |
| `features/room/schema.ts` | Modify | Add `updateConfigSchema` |
| `app/api/drafts/[draftId]/rematch/route.ts` | Create | POST endpoint for rematch (rate limited) |
| `app/api/drafts/[draftId]/config/route.ts` | Create | PATCH endpoint for config update (rate limited) |
| `components/draft/complete-panel.tsx` | Modify | Add `myPlayerId` prop, rematch button wired to API |
| `components/draft/phase-panel.tsx` | Modify | Pass `myPlayerId` to `CompletePanel` |
| `components/results/share-actions.tsx` | Modify | Remove broken rematch link (rematch lives in `CompletePanel` only) |
| `components/lobby/lobby.tsx` | Modify | Edit button, ConfigEditor integration |
| `components/lobby/config-editor.tsx` | Create | Config editing form component |

## Out of Scope

- Changing display names in lobby
- Kicking players
- Player "ready" status enforcement
- Config changes after draft starts (already blocked by phase check)
- Rematch button on public results page (no guest session context available)
