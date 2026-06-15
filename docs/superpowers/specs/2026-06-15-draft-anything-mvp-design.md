# Draft Anything MVP Design

**Date:** 2026-06-15
**Status:** Approved design
**Product:** Draft Anything

## 1. Product Definition

Draft Anything turns informal debates among friends into structured, competitive
drafts. The MVP is a responsive web application for private, real-time rooms in
which two to six friends draft items, defend their rosters, receive AI analysis,
vote, and share the result.

The product's primary value is competition, debate, trash talk, judgment, and
sharing. Draft mechanics support that loop rather than define the product by
themselves.

## 2. MVP Goals

The MVP must support this complete journey:

1. A guest creates a private room.
2. Other guests join with an invite code.
3. The host configures the draft.
4. AI generates an item pool and scoring rubric.
5. The host reviews and locks the pool while players may submit suggestions.
6. Players complete a real-time draft.
7. Players optionally defend their rosters.
8. The room uses AI, player voting, or hybrid judging.
9. The app produces a permanent result page and downloadable image card.

Success means a group can finish this journey without creating accounts, without
gameplay depending on AI availability, and without client-side authority over
turns or results.

## 3. MVP Scope

### Included

- Private rooms with short invite codes
- Guest display names and server-issued guest sessions
- Two to six players
- Manual topics and AI-generated topic suggestions
- Snake, standard, and randomized draft order
- Configurable round count and optional turn timer
- AI-generated item pools
- Host pool editing, regeneration, and locking
- Player suggestions for pool additions and removals
- Real-time drafting and reconnect recovery
- Selective AI commissioner commentary
- Four host-selectable AI personalities:
  - Serious Analyst
  - Toxic Friend
  - Sports Desk
  - Internet Mode
- Optional text defenses
- AI, player, and hybrid judging
- Player-only voting with no self-votes
- Permanent result page
- Downloadable result image
- Responsive parity across mobile, tablet, and desktop

### Deferred

- Accounts, profiles, statistics, and draft history
- Public matchmaking and public draft challenges
- Spectators and public voting
- Pass-and-play
- Solo play and AI opponents
- Asynchronous drafts
- Auction drafts
- Voice defenses
- Native mobile applications

## 4. System Architecture

The application uses a Supabase-authoritative modular monolith.

### Next.js App Router

Next.js owns:

- Responsive application UI
- Server-rendered room and result entry points
- Server routes or actions for authenticated mutations
- OpenAI orchestration
- Input and output schema validation
- Share-card image generation
- Rate-limit enforcement

### Supabase

Supabase Postgres is the canonical source of game state. Supabase Realtime
delivers presence and database changes to connected clients.

Postgres functions and constraints enforce:

- Turn ownership
- Item availability
- Pick uniqueness
- Pick sequence
- Phase transitions
- Host-only actions
- Vote eligibility
- Vote uniqueness

Clients do not write authoritative game state directly.

### Zustand

Zustand stores ephemeral interface state only, including:

- Selected pool item
- Search and filter values
- Active mobile tab
- Open drawers and panels
- Temporary optimistic presentation

Canonical room state always comes from Supabase.

### OpenAI

OpenAI provides structured outputs for:

- Topic suggestions
- Pool generation and hidden metadata
- Selective commissioner commentary
- Final judging and awards

All requests run server-side. AI output is untrusted until it passes schema,
length, normalization, and safety validation.

### Hosting

- Vercel hosts the Next.js application and image routes.
- Supabase hosts Postgres, Realtime, and database functions.

## 5. Draft Lifecycle

Every draft has exactly one authoritative phase:

```text
LOBBY
  -> POOL_REVIEW
  -> DRAFTING
  -> DEFENSE
  -> VOTING or JUDGING
  -> JUDGING when required
  -> COMPLETE
```

Mode-specific behavior:

- AI judging moves from `DEFENSE` to `JUDGING`.
- Community judging moves from `DEFENSE` to `VOTING`, then `COMPLETE`.
- Hybrid judging moves from `DEFENSE` to `VOTING`; AI judging may run in
  parallel, but completion waits for both valid inputs.

Only validated server mutations may change the phase.

## 6. Room Flow

### Create Room

The host enters a display name and configures:

- Topic or AI topic generation
- Maximum players, from two through six
- Round count
- Draft type
- Timer enabled and duration
- Judging mode
- AI personality
- Pool review mode

The server creates:

- An unguessable internal draft identifier
- A short human-friendly invite code
- A guest session tied to the host

Draft-order semantics are fixed:

- Standard uses the same seat order in every round.
- Snake reverses the seat order on alternating rounds.
- Randomized shuffles the seat order independently for each round when the draft
  starts, then stores the complete immutable sequence.

### Join Lobby

Guests join with an invite code and display name. The lobby shows:

- Occupied and open seats
- Ready state
- Connected, disconnected, and reconnecting state
- Draft configuration
- Host controls

The host may remove players before the draft starts. The room may start only
when at least two players are present and all required configuration is valid.

### Pool Review

The generated pool size is:

```text
players * rounds * 2
```

The host may:

- Edit item names
- Add items
- Remove items
- Regenerate the pool
- Accept or reject player suggestions
- Lock the final pool

Players may suggest additions or removals. Suggestions are non-binding; the host
makes every final pool decision.

Locking validates that:

- Normalized item names are unique
- The pool contains at least `players * rounds` items
- No item violates content or length rules
- Hidden metadata exists for deterministic fallback judging

### Live Draft

The server computes the complete pick sequence when drafting begins.

Each pick uses one atomic database function that:

1. Locks the relevant draft state.
2. Verifies the draft is in `DRAFTING`.
3. Verifies the guest maps to the current player.
4. Verifies the submitted expected pick number is current.
5. Verifies the item is available.
6. Inserts the pick.
7. Marks the item unavailable.
8. Advances the pick index and deadline.
9. Completes the draft when no picks remain.

Database uniqueness constraints provide a second line of defense against duplicate
items and duplicate pick positions.

### Timer Behavior

The server stores an absolute `turn_deadline` timestamp. Browsers render a
countdown from server time but do not determine expiry.

When a deadline passes, an idempotent server operation selects the highest-ranked
remaining item using hidden metadata and the locked rubric. The operation uses
the same atomic pick path and records `is_auto_pick = true`.

Delayed clients cannot submit a stale pick because they must provide the expected
pick number.

### Reconnect Behavior

On reconnect, a client:

1. Re-establishes the guest session.
2. Fetches a fresh safe room projection.
3. Re-subscribes to room changes and presence.
4. Replaces local canonical state rather than replaying missed client events.

Disconnecting never pauses the room.

## 7. AI Commissioner

Commentary is asynchronous and never blocks a pick or turn transition.

A deterministic trigger decides whether a pick warrants commentary based on:

- Value relative to hidden item metadata
- Unexpected early or late selection
- A developing roster strategy
- A meaningful category run
- A limited minimum interval since the previous comment

The model receives only the topic, locked rubric, public board state, recent
picks, roster summaries, and chosen personality. It does not receive guest
tokens or private infrastructure data.

Each persisted comment includes:

- Draft and optional pick reference
- Personality
- Commentary text
- Trigger tags
- Provider model and prompt version
- Idempotency key

Failed commentary retries within a bounded policy and is then omitted.

## 8. Defense and Judging

### Defense

Each player may submit one text defense or explicitly skip. The host may advance
after every player has responded or may end the defense phase early.

### Community Judging

Only active draft players may vote. A player:

- Gets one vote
- Cannot vote for themselves
- Can vote only during `VOTING`

Community ties produce shared winners.

### AI Judging

The AI judge evaluates rosters and optional defenses using the rubric locked
during pool generation. It returns:

- Category scores per player
- Overall score per player
- Ordered ranking
- Winner or shared winners
- Best pick
- Worst pick
- Biggest steal
- Concise explanation

The server validates arithmetic consistency and references before accepting the
result.

### Hybrid Judging

Hybrid judging uses:

```text
70% normalized AI score + 30% normalized community score
```

Community score is each player's vote share among valid non-self votes. AI scores
are normalized to a common zero-to-ten scale before weighting.

Hybrid ties resolve in this order:

1. Higher normalized AI score
2. Higher aggregate hidden metadata score across the roster
3. Shared win

## 9. AI Reliability and Fallbacks

AI enhances the game but never controls its availability.

- Pool generation failure offers retry and manual pool construction. Manually
  entered items receive deterministic neutral metadata based on the locked rubric;
  successful later enrichment may replace it only before the pool is locked.
- Commentary failure is retried and then omitted.
- Judging failure is automatically retried.
- If AI judging still fails, deterministic judging uses the locked rubric and
  stored hidden metadata.
- Hybrid mode uses the deterministic AI component if the live AI judge fails.
- Idempotency keys prevent duplicate AI jobs and duplicate persisted outputs.
- Provider errors use neutral user-facing messages and never expose prompts,
  raw responses, or credentials.

Deterministic fallback judging computes each item's weighted rubric score,
averages item scores per roster, and derives awards from value relative to pick
position. This method is fixed for the duration of a draft by the stored rubric
and metadata.

## 10. Data Model

### `drafts`

- `id`
- `room_code`
- `topic`
- `phase`
- `host_guest_id`
- `max_players`
- `rounds`
- `draft_type`
- `judging_mode`
- `ai_personality`
- `timer_seconds`
- `pick_order`
- `current_pick_index`
- `turn_deadline`
- `rubric`
- `created_at`
- `completed_at`

### `draft_players`

- `id`
- `draft_id`
- `guest_id`
- `display_name`
- `seat`
- `is_ready`
- `removed_at`
- `joined_at`

Connection state is presence-derived rather than trusted as durable truth.

### `draft_items`

- `id`
- `draft_id`
- `name`
- `normalized_name`
- `source`
- `hidden_metadata`
- `is_available`
- `created_at`

### `picks`

- `id`
- `draft_id`
- `player_id`
- `item_id`
- `overall_pick`
- `round`
- `pick_in_round`
- `is_auto_pick`
- `created_at`

### `pool_suggestions`

- `id`
- `draft_id`
- `player_id`
- `action`
- `target_item_id`
- `suggested_name`
- `status`
- `decided_at`

### `commentary`

- `id`
- `draft_id`
- `pick_id`
- `personality`
- `text`
- `trigger_tags`
- `model`
- `prompt_version`
- `idempotency_key`
- `created_at`

### `arguments`

- `id`
- `draft_id`
- `player_id`
- `defense_text`
- `skipped`
- `submitted_at`

### `votes`

- `id`
- `draft_id`
- `voter_player_id`
- `selected_player_id`
- `created_at`

### `judgments`

- `id`
- `draft_id`
- `source`
- `player_scores`
- `ranking`
- `winner_player_ids`
- `awards`
- `explanation`
- `model`
- `prompt_version`
- `idempotency_key`
- `created_at`

## 11. Guest Identity and Security

A guest session is a high-entropy random token issued by the server and stored in
an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Only a cryptographic token hash
is persisted.

Room codes provide discovery, not authority.

Security requirements:

- Browser projections never expose hidden item metadata before completion.
- Every mutation verifies guest identity and room membership.
- Host actions verify the guest against `host_guest_id`.
- Database functions enforce authoritative game invariants.
- Votes reject duplicates, self-votes, non-players, and invalid phases.
- AI output is rendered as text, never raw HTML.
- Inputs have explicit length and character limits.
- Room creation, joining, regeneration, suggestions, AI requests, voting, and
  image generation are rate limited.
- Result pages expose no guest session information.

## 12. UX Design

The approved visual direction is **Broadcast Arena**: dark, high-contrast sports
coverage with bold timers, draft-position labels, analyst callouts, and dramatic
result reveals.

### Home

Create-room and join-by-code actions have equal prominence.

### Lobby

The lobby emphasizes invite sharing, player seats, readiness, configuration, and
clear host authority.

### Pool Review

The screen combines a searchable pool board, host editing controls, suggestion
queue, regeneration, and a deliberate lock confirmation.

### Draft Room

Desktop uses three columns:

1. Available pool
2. Current turn, timer, and commentary
3. Player rosters and pick history

Mobile keeps current player and timer permanently visible. Pool, rosters, and AI
desk use accessible tabs or sheets. Tablet uses two columns with collapsible
commentary.

### Defense and Voting

Defense uses one focused response surface. Voting presents roster comparisons
without AI scores to avoid anchoring player votes.

### Results

Results include:

- Winner reveal
- Final ranking and scores
- AI verdict
- Community totals when applicable
- Best pick
- Worst pick
- Biggest steal
- Roster summaries
- Rematch action
- Share link
- Downloadable image card

### Accessibility

- Full keyboard operation
- Visible focus states
- Semantic labels and live-region announcements
- Contrast-compliant colors
- No critical information conveyed by color alone
- Reduced-motion support for timers and reveals
- No required horizontal scrolling at supported viewport sizes

## 13. Error Handling

User-facing states must distinguish:

- Reconnecting
- Stale turn or already-taken item
- Host changed configuration
- Room full or unavailable
- Pool generation unavailable
- Commentary unavailable
- Judging delayed and fallback applied
- Result image generation retry

Mutations return stable error codes for interface handling. Clients recover by
fetching a fresh room projection after conflict errors.

## 14. Testing Strategy

### Unit Tests

- Snake, standard, and randomized pick-order generation
- Timer deadline calculations
- Pool normalization and duplicate detection
- Commentary trigger selection
- Rubric normalization
- Hybrid weighting
- Tie resolution
- Deterministic auto-picks and fallback judging

### Database Tests

- Atomic pick success
- Simultaneous pick rejection
- Duplicate item prevention
- Stale expected-pick rejection
- Host-only phase transitions
- Guest membership checks
- Vote uniqueness and self-vote rejection
- Idempotent timer and AI job behavior

### Integration Tests

- Create and join a room
- Generate, edit, suggest, and lock a pool
- Complete each draft type
- Submit and skip defenses
- Complete all three judging modes
- Recover from malformed and timed-out AI responses
- Persist complete result data

### End-to-End Tests

- Two browser sessions complete a draft
- Two players attempt the same pick
- A player disconnects and reconnects during a turn
- A timer expires and produces one auto-pick
- Player voting excludes self-votes
- Hybrid judging combines valid inputs
- A result link opens without a guest session
- A result image downloads successfully

### Responsive and Accessibility Tests

- Core flow at representative mobile, tablet, and desktop widths
- Keyboard-only completion
- Automated accessibility scans
- Reduced-motion behavior

Live OpenAI calls are excluded from the default test suite. Contract tests use
fixtures for valid, malformed, timed-out, and refused responses.

## 15. Delivery Milestones

1. Foundation, schema, guest sessions, and room lobby
2. Pool generation and collaborative review
3. Authoritative real-time draft engine
4. Defenses, all judging modes, and AI fallbacks
5. Results, downloadable cards, responsive polish, and production hardening

## 16. Release Acceptance Criteria

The MVP is releasable when:

- Two to six guests can complete the entire private-room journey.
- No client-authoritative mutation can alter turns, picks, votes, or winners.
- Reconnecting restores canonical state without manual intervention.
- Simultaneous and stale picks cannot corrupt a draft.
- AI failures never block drafting and have defined judging fallbacks.
- AI, community, and hybrid judging produce persisted results.
- Permanent result links and downloadable image cards work.
- Core flows pass supported responsive and accessibility checks.
- Unit, database, integration, and end-to-end suites pass with no known errors.
