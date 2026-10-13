# Draft Anything: AI drafters and solo play

Date: 2026-10-10
Status: awaiting review
Branch: `feature/draft-anything-landing` (built on top of the landing page work, before it is merged)

## Why

Draft Anything needs at least two people in a room. Someone who finds the game alone cannot play it, and a group of three in a four-seat room cannot fill the table.

The owner's request: "I also want to make draft anything single player possible."

Decisions made during brainstorming:

- Playing alone means **me against AI drafters**: computer opponents take the other seats and pick on their turns, and the AI judge ranks everyone.
- Scope is **solo plus optional filling of empty seats**: a solo way in, and hosts of normal rooms can add AI drafters to empty seats.
- AI drafters work in **both picking modes**. In Off the Dome they invent their picks ("Let AI invent picks why not").

## Goals

1. One person can start and finish a full draft with no one else present.
2. A host can fill any empty seat in a friend room with an AI drafter, and remove it again.
3. A draft with AI drafters never waits on them: not in drafting, defense, veto voting or voting.
4. AI drafters are clearly marked as AI wherever players are shown.
5. Existing rooms with only humans behave as they do today, apart from the stuck-draft fix in section 7.

## Out of scope

- AI drafters writing defenses, chatting or trash talking.
- Difficulty levels. Styles vary how an AI drafter picks; none is tuned to be weak or strong.
- AI drafters voting, in community judging or in veto challenges.
- Choosing a specific style when adding an AI drafter. Styles are dealt in a fixed order.
- A visual redesign of the lobby, draft board or results.

## 1. What an AI drafter is

A row in `draft_players` with no guest session. It has a seat, a display name and a style. It can win.

### Roster

Five AI drafters, dealt in this order as they are added to a room. The name is the display name; an "AI" tag is shown beside it.

| Name | Style key | How it picks from a pool | How it is described to the AI in Off the Dome |
| --- | --- | --- | --- |
| Chalk | `chalk` | Highest overall score available | The obvious, consensus best pick |
| Specialist | `specialist` | Weights one rubric category three times as heavily. The category is chosen once per draft from the draft id and seat | Obsessed with one angle of the topic and picks for it every time |
| Wildcard | `wildcard` | A random item from the top half of what is left | Unpredictable; a defensible pick nobody saw coming |
| Balancer | `balancer` | The item that most raises the weakest rubric category in its own lineup; highest overall score for its first pick | Builds a balanced lineup; fills whatever its lineup lacks |
| Hipster | `hipster` | Skips the three highest-scoring items left and takes the best of the rest; takes the best if three or fewer remain | Avoids the obvious; picks underrated favourites |

If a human in the room already uses one of these names, the AI drafter's name gets " II" appended.

### Picking from a pool

No AI call. The server scores each available item using the per-item scores already stored in `draft_items.hidden_metadata` and the weights in `drafts.rubric`, then applies the style. An item with no stored scores (one a player added by hand) is treated as having the median score of the scored items. Randomness is seeded from the draft id and the overall pick number, so a retried request picks the same item.

### Picking Off the Dome

One AI call per pick. The prompt contains the topic, the style description, every pick already made in the draft, the AI drafter's own lineup, and any names vetoed earlier in this draft. The AI returns three candidate names in order of preference. The server takes the first that is not already picked (compared case-insensitively after trimming, as human picks are) and not on the vetoed list.

If all three are taken, or the AI call fails or times out (10 seconds, the shortest limit the AI service accepts), the turn is recorded as forfeited, exactly as when a human's timer runs out in Off the Dome.

### How a pick is triggered

Nothing runs on a schedule. A connected human's browser asks the server to make the pick, as browsers already do for timer auto-picks.

- When the seat on the clock belongs to an AI drafter, the host's browser waits 1.5 seconds ("thinking") and calls `POST /api/drafts/[draftId]/bot-pick` with the pick index it expects.
- Every other human's browser does the same after 6 seconds, in case the host has gone.
- While it is still that AI drafter's turn, a failed request is retried every 4 seconds.
- The server checks the caller is a player in the draft and that the current seat is an AI drafter. The database function locks the draft row and rejects a stale pick index, so two requests for the same turn produce one pick.
- After a successful pick the server runs the same commentary step that follows a human pick.

The turn timer does not apply to AI seats. The countdown is hidden while an AI drafter is on the clock, and the existing timer auto-pick already refuses to act for a seat the caller does not hold.

### What AI drafters do in each phase

| Phase | Behaviour |
| --- | --- |
| Lobby | Shown in their seat with the AI tag. Always count as ready. |
| Pool review | Nothing. They do not suggest items. |
| Drafting | Pick as described above. |
| Veto challenge (Off the Dome) | Never start a challenge and never vote. Their picks can be challenged by humans; the eligible voters are the humans other than the picker. If a pick is vetoed, the name is added to the draft's vetoed list and the AI drafter picks again. A human's pick can be challenged only if another human is present. |
| Defense | A skipped defense is recorded for every AI drafter when the phase begins, so the phase ends when every human has submitted or skipped. |
| Voting | Do not vote. Voting ends when every human has voted. Humans may vote for an AI drafter's lineup. |
| Judging and results | Judged and ranked like anyone else. Results show the AI tag. |
| Rematch | Stay in their seats. |
| Chat | Silent. |

### Judging mode with one human

Community and hybrid judging need at least two humans to mean anything. When a draft starts with exactly one human, judging is AI-only for that draft regardless of the room setting, and the lobby says so beside the judging setting.

## 2. Solo

### Getting there

- The landing page gains a third action, **Play solo**, in the hero and in the closing section, after Start a draft and Join a room. It links to `/draft-anything/play?tab=solo`.
- The room screen gains a third tab, **Solo**, beside Create Room and Join Room.
- `playHref` and `parsePlayParams` accept `tab=solo`. A `topic` parameter fills the topic on the Solo tab as it does on Create Room. `code` still implies Join.
- The hero eyebrow changes from "a party game for 2 to 6" to "a party game for 1 to 6", and the FAQ in `lib/games/content/draft-anything.ts` gains "Can I play Draft Anything alone?".

### The Solo tab

Fields: topic, your name, AI opponents (1 to 5, default 3), rounds, picking mode (From a Pool or Off the Dome), draft type, judge personality (with the custom prompt field when Custom is chosen). There is no turn timer field and no judging mode field: solo has no timer and is always judged by the AI.

Button: **Start solo draft**.

### What happens on start

One request creates the room with `max_players` set to one plus the number of opponents, seats the human as host in seat 1, adds the AI drafters, and moves the draft forward:

- **From a Pool:** to pool review. The player lands on the existing pool screen, generates and edits the pool, and starts the draft from there.
- **Off the Dome:** straight to drafting.

The waiting lobby is skipped. The room is full, so nobody can join it by code, and share-the-code prompts are hidden whenever a room is full and has one human.

After the results, **Rematch** returns to the lobby as it does today, showing the player and the same AI drafters, where settings can be changed before starting again.

## 3. Friend rooms

- In the lobby, the host sees **+ Add AI drafter** on each empty seat. Other players see the empty seat as they do today.
- The host sees a remove control on each AI drafter.
- A human joining takes the lowest empty seat as today. AI drafters are never displaced automatically; if the room is full of AI drafters, the host removes one to make room.
- The room can start when two or more seats are filled, AI drafters included.
- If the host leaves the lobby, hosting passes to the next human by seat. AI drafters never host. If the last human leaves, the room is abandoned as it is today when everyone leaves.
- Lowering the room's maximum players below the number of filled seats is refused, as today, with AI drafters counted.

## 4. Database

One new migration.

**`draft_players`**
- `is_bot boolean not null default false`
- `bot_style text` (null for humans; one of the five style keys for AI drafters)
- `guest_id` becomes nullable, with a check that a row is either a human with a `guest_id` or an AI drafter without one.

**`drafts`**
- `vetoed_names jsonb not null default '[]'`: names vetoed in the current draft. Cleared on rematch.

**New functions** (service role only, like the existing ones)
- `add_bot_player(draft, host guest)`: lobby only, host only, room not full; takes the lowest empty seat and the next unused roster entry.
- `remove_bot_player(draft, host guest, player)`: lobby only, host only, target must be an AI drafter.
- `submit_bot_pick(draft, expected pick index, item id or item name, forfeited)`: requires the current seat to belong to an AI drafter; otherwise the same checks and the same advance step as `submit_pick`.

**Changed functions**
- Starting a draft: pick order length and the pool's minimum size use the number of filled seats (section 7).
- `_resolve_veto_voting`, `initiate_veto` and the Off the Dome veto skip: eligible voters exclude AI drafters; a vetoed AI pick appends its name to `vetoed_names`.
- The step that moves a finished draft (DRAFT_COMPLETE) into DEFENSE: inserts skipped defenses for AI drafters. The defense advance check is otherwise unchanged.
- `maybe_advance_from_voting`, `submit_vote`, `advance_phase`: the number of votes required counts humans only.
- `leave_draft`: host transfer picks a human; a room with no humans left is treated as empty.
- `reset_draft_for_rematch`: clears `vetoed_names`.
- Any policy or view that assumes `draft_players.guest_id` is present is updated to tolerate null.

Development and testing use a local Supabase in Docker. The migration is not applied to the hosted database as part of building this; that is a separate step, done only on the owner's say-so, and the feature cannot ship before it.

## 5. Server and client units

| Unit | Kind | Purpose |
| --- | --- | --- |
| `features/bots/roster.ts` | pure | The five AI drafters: name, style key, descriptions; picks the next unused entry |
| `features/bots/pool-pick.ts` | pure | Given available items with scores, rubric weights, style, own lineup and a random source, returns the item to take |
| `features/bots/dome-pick.ts` | server | Builds the prompt, calls the AI, returns the first usable candidate or a forfeit |
| `features/bots/service.ts` | server | `addBot`, `removeBot`, `makeBotPick`: load state, call the two pickers, call the database functions |
| `app/api/drafts/[draftId]/bots/route.ts` | route | `POST` add, `DELETE` remove (host only) |
| `app/api/drafts/[draftId]/bot-pick/route.ts` | route | Makes the current AI drafter's pick |
| `app/api/drafts/solo/route.ts` | route | Creates a solo room and moves it to its first screen |
| `features/draft/use-bot-turns.ts` | client hook | Watches whose turn it is and calls `bot-pick` with the delays in section 1 |
| `components/lobby/solo-form.tsx` | client | The Solo tab |
| Lobby seat list, draft board, results, complete panel | client | AI tag; add and remove controls in the lobby |

The composite-score helper currently private to `features/ai/commentary-trigger.ts` is exported and shared with `pool-pick.ts`.

## 6. Analytics

- `draft_solo_started`: `opponents`, `picking_mode`, `rounds`.
- `draft_bot_added` and `draft_bot_removed`: `draft_id`, `style`.
- `draft_bot_pick`: `draft_id`, `style`, `picking_mode`, `forfeited`.
- `draft_landing_cta_clicked` gains the value `solo` for `cta`.
- The existing draft-started event gains `bot_count`.

## 7. Fix included: drafts with an empty seat get stuck

Today the pick order is built from the room's maximum players, while the lobby allows starting with two or more. A four-seat room started with three people gives a turn to seat 4, which nobody holds, and no request can take it. The draft cannot continue.

Fix: when a draft starts, active players are renumbered into seats 1 to N in their current seat order, `max_players` is set to N, and the pick order and the pool's minimum size are built from N. The lobby already shows who is in the room, so nothing changes for players except that the draft finishes.

## 8. Failure handling

| What goes wrong | What happens |
| --- | --- |
| AI call fails or times out on an Off the Dome pick | Turn forfeited; draft moves on |
| All three AI candidates are already taken or vetoed | Turn forfeited |
| Two browsers request the same AI pick | The second is rejected as stale and ignored |
| The host's browser is gone | Another human's browser requests the pick after 6 seconds |
| The `bot-pick` request fails | Retried every 4 seconds while it is still that turn |
| Every human has left mid-draft | Nothing requests picks; the room is abandoned, as today |
| Pool item has no stored scores | Treated as median |

## 9. Testing

Unit (Vitest):
- `roster`: deal order, skipping used entries, name clash suffix.
- `pool-pick`: each style on a fixed pool; unscored items; three or fewer items left for Hipster; one item left; same seed gives same pick.
- `dome-pick`: takes first unused candidate; skips taken and vetoed names case-insensitively; forfeits when all are taken; forfeits on AI error and on timeout.
- `play-href`: `tab=solo`, with and without a topic; `code` still wins.
- Solo form validation: opponents 1 to 5; custom judge prompt required for Custom.

Database (against local Supabase):
- Add and remove an AI drafter: host only, lobby only, full room refused.
- `submit_bot_pick`: refused when the current seat is human; stale index refused; the last pick ends drafting as a human's last pick does.
- Defense ends with only human submissions; voting ends with only human votes.
- Veto: AI pick vetoed by the one human in a solo draft; name lands in `vetoed_names`; a human's pick cannot be challenged when no other human is present.
- Three humans in a four-seat room: draft starts with a three-seat pick order and completes.
- Host leaves a room with one other human and two AI drafters: the human becomes host.

Component:
- Lobby shows the AI tag, and add and remove controls for the host only.
- Room screen opens on the Solo tab for `tab=solo` with the topic filled.
- Landing page has Play solo in the hero and the closing section.

End to end (Playwright, local Supabase only):
- Solo, From a Pool, 1 round, 2 opponents: reaches results with three ranked lineups.
- Solo, Off the Dome with the AI call stubbed: reaches results.

Verification gate as before: typecheck, Vitest, production build, no new lint errors in touched files, and a visual check of the Solo tab, the lobby with AI drafters and a solo draft at desktop and phone widths in both themes.
