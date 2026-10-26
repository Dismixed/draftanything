# Analytics events

PostHog, set up in `instrumentation-client.ts` (autocapture, pageviews, web vitals, exceptions and session replay are on). Client events go through `track()` in `lib/analytics/track.ts`. Server events use `withRequestIdentity()` from `lib/posthog-server.ts`, which credits them to the browser's distinct id so they join the player's client events.

## Dailies

| Event | Sent from | Properties | When |
| --- | --- | --- | --- |
| `daily_started` | client | `game`, `entry` | A fresh run of today's daily begins (`lib/daily-intro/use-daily-intro.ts`). Not sent for a run already in progress or finished, for a start that fails, or for Brain Dead's "See today's result". |
| `daily_completed` | client | `game`, `streak` | First finish of a daily each day, from the localStorage streak store (`lib/streak`). Clearing storage or switching devices sends it again. The activation event. |
| `daily_intro_play_clicked` | client | `game` | Play on a game's intro, including Brain Dead's "See today's result". Not sent when the intro is skipped. |
| `daily_intro_freeplay_clicked` | client | `game` | Brain Dead's Free play button. |
| `home_game_clicked` | client | `game`, `slot`, `position`, `played_today` | A game card on the home page. |
| `finish_next_clicked` | client | `from`, `game`, `slot` | A finish screen link to another daily. |
| `result_shared` | client | `game`, `method` | Share on the finish screen. |
| `game_about_link_clicked` | client | `from_game`, `to_game` | A "More daily games" card in a game's about section. |
| `anyguessr_daily_guess_submitted` | server | `puzzle_id`, `round_index`, `clue_type`, `correct`, `distance_km`, `round_score` | One per guess. |
| `chainlink_guess_submitted` | server | `puzzle_id`, `position`, `correct` | One per guess. |
| `freezeframes_guess_submitted` | server | `round_key`, `skipped`, `correct`, `via_jev` | One per guess. |
| `getting_warmer_guess_submitted` | server | `gave_up`, `correct`, `attempts` | On a right answer or a give-up. |

`daily_started.entry` says how the run began:

- `intro`: Play on the game's intro.
- `share`: Play on the intro of a page opened from a shared result (`?ref=share`).
- `direct`: opened from the home page, which skips the intro.
- `finish`: opened from another daily's finish screen, which skips the intro. Ball Knowledge always shows its intro, so from a finish screen it counts as `intro`; pair it with `finish_next_clicked`.

Brain Dead, Ball Knowledge and Hot Takes send no events between `daily_started` and `daily_completed`.

Coverage of the start event (share of completions with a start before them, same person, game and day):

```sql
SELECT count() AS completions,
  countIf(s.first_start > toDateTime('2020-01-01') AND s.first_start <= c.ts) AS with_start,
  round(100 * with_start / completions, 0) AS pct
FROM (SELECT person_id, toString(properties.game) AS game, toDate(timestamp) AS d, min(timestamp) AS ts
      FROM events WHERE event = 'daily_completed' AND timestamp >= toDateTime('{start}')
      GROUP BY person_id, game, d) AS c
LEFT JOIN (SELECT person_id, toString(properties.game) AS game, toDate(timestamp) AS d, min(timestamp) AS first_start
      FROM events WHERE event = 'daily_started' AND timestamp >= toDateTime('{start}')
      GROUP BY person_id, game, d) AS s
  ON c.person_id = s.person_id AND c.game = s.game AND c.d = s.d
```

The `first_start > 2020` check matters: an unmatched left join row gets a zero date, not null. A run resumed on a later day has its start on an earlier day, so expect a little under 100%.

## Draft Anything

| Event | Sent from | Properties | When |
| --- | --- | --- | --- |
| `draft_landing_cta_clicked` | client | `cta`, `position`, `topic` (topic cards only) | A CTA on `/draft-anything`. |
| `draft_lobby_tab_changed` | client | `tab` | Create, Join or Solo on `/draft-anything/play`. |
| `draft_room_created` | server | `draft_id`, `picking_mode`, `draft_type`, `judging_mode`, `max_players`, `rounds`, `has_timer` | A multiplayer room is created. |
| `draft_room_joined` | server | `draft_id`, `room_code`, `player_count` | A player joins by code. |
| `draft_solo_started` | server | `draft_id`, `opponents`, `picking_mode`, `rounds` | A solo room against AI drafters is created. |
| `draft_bot_added` | server | `draft_id`, `style` | The host seats an AI drafter. |
| `draft_bot_removed` | server | `draft_id` | The host removes an AI drafter. |
| `draft_started` | server | `draft_id`, `picking_mode`, `judging_mode`, `rounds`, `human_players`, `bots` | The first pick opens: the pool is locked, an off-the-dome room commences, or a solo off-the-dome room is created. Credited to the host. |
| `draft_pick_submitted` | server | `draft_id`, `picking_mode`, `pick_index` | A person's pick. |
| `draft_bot_pick` | server | `draft_id`, `style`, `picking_mode`, `forfeited` | An AI drafter's pick. |
| `draft_vote_submitted` | server | `draft_id`, `new_phase` | A community or hybrid vote. |
| `draft_completed` | server | same as `draft_started` | The draft reaches its results (phase `COMPLETE`). Credited to the host. |
| `draft_rematch_initiated` | server | `draft_id` | The host starts a rematch. It keeps the `draft_id`, so the rematch sends `draft_started` and `draft_completed` again under the same id. |

Count the draft funnel by distinct `draft_id`: created (`draft_room_created` + `draft_solo_started`), started, completed. `POST /api/drafts/[draftId]/start` sends nothing; only the e2e suites call it.

## Guests and accounts

| Event | Sent from | Properties | When |
| --- | --- | --- | --- |
| `guest_session_created` | server | `is_new` | Every `POST /api/guest`, which is idempotent. `is_new` is true when the call created the guest (no cookie yet, or its session expired). Events from before `is_new` was added have no value. |
| `account_linked` | server | `provider` | A guest merged into an account. Accounts are hidden, so expect none. |
