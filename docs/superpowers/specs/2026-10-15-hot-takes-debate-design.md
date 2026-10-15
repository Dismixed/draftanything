# Hot Takes as Today's Debate

## Why

Hot Takes is an opinion game with no right answer. Today it is presented exactly like the six
puzzles: a lineup card, a chip in the finish-screen run, part of "X of 7", required for a Sweep,
and scored with a puzzle-style "% agreement" number and confetti. That framing is wrong for it.

## Decisions (agreed)

- **Sweep = the 6 puzzles.** Hot Takes is not required for a Sweep. It keeps its own streak.
- **Placement:** a distinct "Today's debate" panel on home and strip on puzzle finish screens,
  not a lineup card or rail chip. After a Sweep, Hot Takes is the main thing offered next.
- **Hot Takes result:** lead with the player's hottest takes, no score number, no confetti.

## 1. Data model

`lib/games/registry.ts`:

- Add `PUZZLE_GAMES` (every `DAILY_GAMES` entry except `hot-takes`, same order) with type
  `PuzzleGameId`, and `DEBATE_GAME = "hot-takes" as const`.
- `DAILY_GAMES` stays all seven. Streak storage, `GAME_META`, the daily-intro count API and
  `FinishScreen`'s `gameId` prop keep using it unchanged.
- `FEATURED_GAMES` already excludes Hot Takes; its `satisfies` becomes `PuzzleGameId[]`.

Switch to `PUZZLE_GAMES`:

| File | Functions |
| --- | --- |
| `lib/games/next.ts` | `nextDaily`, `remainingDailies` (return `PuzzleGameId`) |
| `lib/games/today.ts` | `buildTodayView` (featured, lineup, doneCount), `otherDailies` |
| `lib/streak/sweep.ts` | `isSweep`, `sweepCount` |

Consequence: past days where all six puzzles were played but Hot Takes was skipped now count
as Sweeps. Sweep counts can only rise. Accepted.

## 2. Home (`components/home/today.tsx`, `app/page.tsx`)

- Featured slot and lineup draw only from puzzles (via `buildTodayView`).
- Copy: "6 new puzzles today", "X of 6 done today", all-done title "All six done."
- All-done streak list shows the six puzzles only (Hot Takes' streak lives on its panel).
- New `components/home/today-debate.tsx`, rendered by `Today` below the lineup:
  - Kicker "Today's debate", the category name as the headline, a one-line pitch
    ("Fifteen items. Rank them S to D, then see where you split from the crowd."),
    CTA "Rank it →" linking to `/hot-takes` (with `requestDirectPlay("hot-takes")`), and the 🔥 streak.
  - Played today: headline stays the category, line becomes "You've ranked it. See where you
    split from the crowd.", CTA "See your takes →".
  - Visually distinct from game cards: full-width panel in Hot Takes' red, not the card grid.
  - Tracks `home_game_clicked` with `slot: "debate"`.
- `app/page.tsx` loads the category with `getDailyCategoryForPlay(createAdminClient())` and passes
  `{ name, dayNumber }` to `Today`. If the client's `day` differs from that `dayNumber` (cached
  page across midnight), the panel shows "Today's debate is ready" without a name. If the fetch
  throws, pass `null` and show the same nameless form.
- Page tagline "Seven free daily games" and the meta description stay: there are still seven games.

## 3. Puzzle finish screens

`components/daily/finish-run.tsx`:
- Rail shows the six puzzle chips. Line reads "X of 6 today · N to go for a Sweep" /
  "Sweep. All six done today."
- When `gameId` is Hot Takes this component is not rendered (see §4).

`components/daily/finish-up-next.tsx`:
- Up next / "Or pick another" only offer puzzles (follows from `next.ts`).
- If Hot Takes is not played today, render a `FinishDebate` strip after the Up next sections:
  "Today's debate · Rank it →" linking to `/hot-takes`, tracked as
  `finish_next_clicked` with `slot: "debate"`. The category name is not shown here
  (finish screens are client-only and do not have it); the strip says "Today's debate: a
  15-item tier list. ~2 min".
- Sweep panel: "Sweep. All six done today." and the sweep ordinal as now. CTA is
  "Now settle today's debate →" (Hot Takes) when it is unplayed, otherwise "Create a Draft room →".

## 4. Hot Takes finish screen

`FinishScreen` gains `kind?: "puzzle" | "debate"` (default `"puzzle"`). In `"debate"`:
- No `FinishRun`, no `FinishUpNext`, no bell curve.
- In their place, one quiet line: "Back to the puzzles · N left →" linking to the next unplayed
  puzzle (`nextDaily`), or "All six puzzles done today." when none remain.
- Streak block and countdown stay.
- `ShareResult` receives a label override; button reads "Start an argument".

`components/hot-takes/game.tsx` (`resultsBody`):
- Remove the score banner, `useCountUp`, and the `burstFrom` confetti effect.
- New header: "Your hottest takes": the 3 items with the lowest agreement for the player's tier,
  each as "{label} in {tier} · only {pct}% agree" (ties broken by item order). If fewer than 3
  items are below 50% agreement, the header reads "Mostly with the crowd" and still lists the 3 lowest.
- Below it, the existing per-item crowd bars, sorted ascending by agreement (hottest first).
- The on-page results section heading changes from "How you stack up" to "Where you split from the crowd".
- Share text is unchanged (the player's S tier).

The crowd percentages remain simulated (existing comment in `game.tsx`). Replacing them with
real aggregates is out of scope.

## 5. Testing

- `tests/lib/games`: `nextDaily`/`remainingDailies`/`buildTodayView` never return Hot Takes;
  `doneCount` ignores it.
- `tests/lib/streak`: a day with the six puzzles and no Hot Takes is a Sweep; a day missing one
  puzzle but with Hot Takes is not.
- `tests/components/finish-screen.test.tsx`: puzzle finish shows 6 chips, the "X of 6" line,
  and the debate strip when Hot Takes is unplayed; Sweep CTA targets Hot Takes, then falls back
  to Draft. Debate finish has no rail and no Up next, and shows the "Back to the puzzles" line.
- `tests/components/home-today.test.tsx`: lineup excludes Hot Takes, copy says 6, debate panel
  renders with the category, the played state, and the nameless fallback on a day mismatch.
- Hottest-takes selection extracted as a pure function in `lib/hot-takes/` with a unit test.
- Visual check of home, a puzzle finish and the Hot Takes finish in light and dark themes.

## Out of scope

- Real crowd aggregates for Hot Takes.
- Additional opinion games or a general "Opinions" section.
- Changing SEO copy or the Hot Takes game page itself beyond the results section.
