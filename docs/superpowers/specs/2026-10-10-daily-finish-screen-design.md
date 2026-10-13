# Daily finish screen

Date: 2026-10-10
Status: design approved in conversation, awaiting review of this document

## Goal

Every daily game ends on the same finish screen. It should do three things:

1. Show the result in the game's own style, and on competitive games show how the player did against everyone else.
2. Move the player into the next daily they have not played, while letting them pick a different one and telling them what each game is.
3. Give them a reason to come back tomorrow.

Each game keeps its colours, fonts and result display. The structure around the result is shared.

## Why

The seven games grew their finish screens separately. Reading the code on 2026-10-09 found:

- Seven different headings, or none.
- Four games show a live countdown under four different labels, two show a static line, and Hot Takes shows nothing.
- Hot Takes has no streak line. AnyGuessr and Getting Warmer show it only on a win.
- Ball Knowledge has its own row of X, Instagram, TikTok and Messages buttons, and no share at all on a return visit.
- Freeze Frames and Hot Takes put the whole game page inside the overlay and do not pass their theme, so the overlay falls back to the site background.
- The order of streak, share, countdown, leaderboard and "More dailies" differs in every game.
- "More dailies" is the last thing on the screen and has no primary action.

## Game types

| Game | Type | Headline on the finish screen |
|---|---|---|
| Brain Dead | Competitive | Score, then bell curve |
| AnyGuessr | Competitive | Score, then bell curve |
| Freeze Frames | Competitive | Score, then bell curve |
| Ball Knowledge | Competitive | Score, then bell curve |
| Getting Warmer | Competitive when solved | Guess count, then bell curve. No curve when not solved. |
| Chain Link | Result only | Existing chain result |
| Hot Takes | Crowd | Existing agreement figure and breakdown |

## The screen

Chosen layout: option B from round 3 of the mockups ("Named run, Up next card, pick another"). The mockup is kept at `.superpowers/brainstorm/15353-1791578498/content/finish-run-guided.html` and published at https://claude.ai/artifact/6WSKZ2HEeMgwYp1PDazB76.

One scrolling column inside the existing full-screen overlay. Nothing is pinned. Top to bottom:

1. **Top bar.** "← Home" on the left; streak flame with the current streak number and the close button on the right.
2. **Run.** A row of seven named chips in lineup order, each outlined in its game's colour. Played games are filled and ticked. The current game has a ring. The next game has a dashed outline, a "next" tag and a slow pulse. The row scrolls sideways on a phone and is centred on desktop. Each chip links to its game. Under the row, one line: "N of 7 today · M to go for a Sweep".
3. **Result.** Passed in by the game.
4. **Bell curve.** Competitive games only. See "Percentile".
5. **Actions.** "Share result" and the game's secondary link ("Leaderboard", "Stats" or "Full breakdown") as two equal outline buttons.
6. **Up next card.** Tinted with the next game's colour. Label "Up next", time estimate, game name, one-line description, and a full-width "Play <game> →" button in the next game's colour.
7. **Or pick another.** The other unplayed games in a two-column grid, each with its name and description, edged in its colour.
8. **Streak milestone.** "N day streak. M more for <milestone>." with progress pips. On a first day: "Day 1 of your streak. Come back tomorrow to make it 2."
9. **Countdown.** "New puzzles in 3h 12m", using the existing `formatCountdown` and `msUntilNextUtcDay`. The wording is the same in every game.

Desktop uses the same single column, centred, at the width the overlay body already allows (720px), with the result and Up next card capped at 440px.

### When every daily is played

The Up next card and "Or pick another" are replaced by one Sweep panel: "Sweep. All seven done today.", the player's Sweep count, the countdown, and a "Create a Draft room →" button linking to `/draft-anything`, matching the home page's all-done state.

### Motion

- The bell curve's shaded area and "You" marker slide to position once, and the percentage counts up.
- The next chip pulses.
- The streak flame flickers.
- All of it is disabled under `prefers-reduced-motion`.

## Shared pieces

All in `components/daily/` unless noted.

| Unit | Purpose | Depends on |
|---|---|---|
| `FinishScreen` | Lays out the screen above. Props: `gameId`, `theme` (CSS variables), `result` (node), `secondary` (label and href or handler), `shareText`, `percentile` (optional), `open`, `onClose`. | The units below, `DailyCompleteOverlay` |
| `FinishRun` | The chip row and Sweep line. | `useStreak`, registry |
| `FinishBellCurve` | Draws the curve, marker and "Better than X% of players". Props: `percentile` (0 to 100), `lowLabel`, `highLabel`. Pure presentation. | none |
| `FinishUpNext` | Up next card, "Or pick another", and the Sweep panel. | `useStreak`, registry, `lib/games/next.ts` |
| `FinishStreak` | Milestone line and pips. | `useStreak`, `lib/streak/milestones.ts` |
| `lib/games/next.ts` | `nextDaily(played)` returns the first unplayed daily in `DAILY_GAMES` order, or null. `remainingDailies(played)` returns the rest. | registry |
| `lib/streak/milestones.ts` | `nextMilestone(streak)` returns the next of 7, 14, 30, 50, 100 and how many days remain. | none |
| `lib/streak/sweep.ts` | `isSweep(store, date)` and `sweepCount(store)`: a Sweep is a date present in all seven games' `playDates`. | streak store |
| `lib/games/registry.ts` | Add `duration` to each daily ("~2 min", "60 sec"). | none |

`DailyCompleteOverlay` stays as the portal and focus/escape handling. `DailyCompleteShell`, `OtherDailies` and `WinStreakLine` are removed once no game uses them. `ShareResult` is kept and restyled as the outline button.

`FinishScreen` sets the overlay's `--bg`, `--text` and `--text-dim` from the game's theme in every game, which fixes Freeze Frames and Hot Takes.

Durations: Chain Link ~2 min, Brain Dead ~2 min, AnyGuessr ~3 min, Freeze Frames ~2 min, Ball Knowledge 60 sec, Hot Takes ~2 min, Getting Warmer ~3 min.

## Percentile

### Recording

New table `daily_finishes`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `game` | text | one of the five competitive game ids |
| `play_date` | date | UTC day |
| `score` | integer | the game's own score; guess count for Getting Warmer |
| `user_id` | uuid, null | signed-in player |
| `guest_id` | uuid, null | guest player |
| `created_at` | timestamptz | |

One row per player per game per day, enforced by unique indexes on (`game`, `play_date`, `user_id`) and (`game`, `play_date`, `guest_id`). Row level security on, no public policies; all access goes through the route below using the admin client, as the leaderboard routes do.

New route `app/api/daily-finish/route.ts`:

- `POST { game, score }` records the finish for today and returns the percentile. A second post from the same player on the same day does not change the stored score and returns the percentile for the stored score. Validated with zod; score is bounded per game (Brain Dead by the day's maximum as the leaderboard route does, AnyGuessr by rounds × 100, Freeze Frames by `MAX_DAILY_SCORE`, Ball Knowledge 0 to 200, Getting Warmer 1 to `MAX_LEADERBOARD_GUESSES`). Rate limited like the leaderboard routes.
- `GET ?game=&score=` returns the percentile without recording, for return visits where the score is read from local storage.

Response: `{ percentile: number, source: "estimated" | "measured", sample: number }`.

Each competitive game posts when the game ends, at the point where it already calls `recordDailyCompletion`. Getting Warmer posts only when solved. If the request fails, the finish screen shows the result without the curve; nothing else is blocked.

AnyGuessr keeps writing `ag_puzzle_attempts` as it does now and also posts here, so all five games are measured the same way.

### Estimated until there is enough data

`lib/games/percentile.ts`:

- `measuredPercentile(scores, score, direction)`: share of other players strictly worse than `score`. `direction` is "higher" for four games and "lower" for Getting Warmer.
- `estimatedPercentile(game, score, max)`: from an assumed normal curve per game.
- `percentileFor(...)`: uses the measured value when the day has at least `MIN_SAMPLE = 30` finishes for that game, otherwise the estimate.

Assumed curves, kept as constants in that one file so they are easy to tune:

| Game | Mean | Standard deviation |
|---|---|---|
| Brain Dead | 45% of the day's maximum | 20% of the maximum |
| AnyGuessr | 55% of the maximum | 20% of the maximum |
| Freeze Frames | 55% of the maximum | 22% of the maximum |
| Ball Knowledge | 12 answers | 6 |
| Getting Warmer | 14 guesses | 8 |

The result is clamped to 1 to 99 so nobody is told they beat everyone or no one.

The screen reads the same whether the number is estimated or measured. This was a deliberate product decision ("everyone who finished, but make it up for now"). `source` is returned by the API so it can be surfaced or logged later.

### Drawing

The curve is a fixed bell shape. The "You" marker sits where `percentile` percent of the area lies to its left, so the picture always agrees with the number. The axis shows the game's lowest and highest score at the ends and "everyone who played today" in the middle. For Getting Warmer the axis is reversed in meaning (fewer guesses to the right) and labelled "most guesses" and "fewest".

## Sweep and streak milestone

Both are computed in the browser from the existing `stim_daily_streaks` store. No server change.

- Sweep line under the run: "N of 7 today · M to go for a Sweep". When N is 7: "Sweep. All seven done today."
- Sweep count on the all-done panel: "Your Nth Sweep."
- Milestone: next of 7, 14, 30, 50, 100 days for the current game's streak.

## Changes per game

| Game | Change |
|---|---|
| Chain Link | Render `ChainResult` as `result`. Secondary: "Stats". Remove the "Come back tomorrow" note and local action block. |
| Brain Dead | Daily "result" and "played" screens render into `FinishScreen`. Name entry and "Score recorded" stay inside the result. Secondary: "Leaderboard". Freeplay is unchanged. |
| AnyGuessr | `Results` (score, passport stamps, round detail) becomes `result`. Secondary: none beyond Share. Remove the footer line. Streak shows regardless of win. |
| Freeze Frames | New compact result view (score out of max, four round rows, leaderboard name entry) replaces the whole page inside the overlay. Inline styles moved to `freezeframes.css`. The "🔒 Come back tomorrow" card is removed. Secondary: "Leaderboard". |
| Ball Knowledge | Score, category and today's top ten become `result`. Inline styles moved to `ball-knowledge.css`. The X, Instagram, TikTok and Messages buttons are replaced by the standard Share button, which also appears on return visits. Secondary: none. |
| Hot Takes | The score banner and consensus rows become `result`, in the Hot Takes theme. Gains the streak. Secondary: none; the breakdown is already in the result. |
| Getting Warmer | `GettingWarmerResultsModal` content (status, answer, guess recap, leaderboard join and list) becomes `result`. Its own share, streak, other dailies and countdown are removed. |

All seven: the finish screen opens on first finish and on return visits, as now. Closing it shows the game underneath, as now.

## Out of scope

- "Sign in to save your streak" (R3) and "Remind me" notifications (R4).
- The home page done state.
- Sound.
- Result summaries of other games on the finish screen.
- Any change to how leaderboards work.

## Risks and things to know

- **Hosted database.** `.env.local` points at the hosted Supabase project. The migration is written to `supabase/migrations/` and is not applied without explicit approval. Until it is applied the route fails and the screen shows results without the curve.
- **Ball Knowledge is being edited elsewhere.** A worktree on `feature/ball-knowledge-polish` exists. Ball Knowledge is migrated last and rebased onto that work if it has merged.
- **Estimated percentiles are not measurements.** Covered above.
- **Guest identity.** A guest who clears cookies can record a second finish. Accepted; it only affects the sample.

## Testing

Unit tests (vitest), written first:

- `nextDaily` and `remainingDailies`: none played, some played, all played, current game last in order.
- `isSweep` and `sweepCount`.
- `nextMilestone` at 0, 1, 6, 7, 29, 100 and above.
- `measuredPercentile` for both directions, with ties, and with one player.
- `estimatedPercentile` is monotonic in score, respects direction, and stays within 1 to 99.
- `percentileFor` switches at `MIN_SAMPLE`.
- The route: validation, bounds per game, second post does not overwrite.

Component tests: `FinishScreen` renders the curve only when `percentile` is given; shows the Sweep panel when all seven are played; marks the correct chip as next.

Browser checks for each of the seven games: dark and light, desktop and phone width, first finish and return visit, with contrast of small labels checked on the dark theme.

Gate: typecheck, vitest, build, and no new lint errors in touched files (the repo's lint baseline was already failing on `main` when last checked).

## Build order

1. Logic modules and their tests.
2. Shared components with Chain Link as the first consumer (no percentile).
3. Migration file, route, percentile logic; Brain Dead as the first competitive consumer.
4. AnyGuessr, Getting Warmer.
5. Freeze Frames, Hot Takes.
6. Ball Knowledge.
7. Remove unused components and CSS.
