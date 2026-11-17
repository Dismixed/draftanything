# Dead Reckoning

**Date:** 2026-11-16
**Status:** Direction approved in conversation (the playable "isles" mock, version 21: https://claude.ai/artifact/9gnz8ZD81oqYPVCyZmvBUN). This spec records what was built for the soft launch. It replaces the earlier "voyage" design (distance in nautical miles, waypoints, a range slider).

## Goal

A new daily estimation game. Everyone gets the same seven questions each day. Each answer is a number. You sail a pirate ship from home port across seven islands, and each question is asked ashore on one of them. The closer your guess, the quicker the next crossing. The score is days at sea; par is 7. At the end you see your route and how you compare with everyone else who sailed that day.

## Soft launch

- Lives at `/dead-reckoning`.
- Not in the game registry, the home lineup, the Sweep, the sitemap or the daily review. The page is `noindex`.
- One new table, `dead_reckoning_plays`. Nothing else in the database changes. The game still works if that table is missing: the fleet falls back to the estimated one.

## The day

- Resets at midnight US Eastern, like every other daily (`lib/daily-day.ts`).
- Voyage number = days since 2026-11-16, plus one.
- Seven legs, one per category, always in this order: music (the warm-up), food, body, geography, money, space, sports.
- Each category has its own list in `lib/dead-reckoning/bank.ts` (server only). Day *n* takes question *n mod list length* from each list, so a category repeats once its list runs out. The first lists have ten questions each, so ten days before a repeat. **The bank needs to grow before a full launch.**
- Each question has: the prompt, a unit, a clue for scale, the answer, a short fact, and a source.

## The sea

- Eight islands: home port, then seven drawn from a pool of thirteen (lantern rock, palm cove, fisher's rest, the high peak, wreck bay, smoke isle, the old fort, treasure isle, whalebone isle, orchard isle, windmill key, gull cay, the old temple). The draw and the route's layout are seeded by the date, so everyone sails the same sea.
- The islands are generic: they have nothing to do with the questions. Each one marks your result its own way, in the tier's colour (a lit beacon, a flag up the fort's tower, the volcano's smoke, and so on).
- The game opens on the chart. Each question is asked ashore: the view fades from the chart to a side-on scene of the island, with your ship at the jetty and a sailor who walks off it, reacts to your answer, and goes back aboard before you sail.
- Light fog: you see farther along crossings you reckoned well.
- Days and nights pass as you sail; the scenes ashore follow the time of day.
- The drawing code lives in `components/dead-reckoning/isles.js` (plain JavaScript, ported from the mock with few changes) with its typed surface in `isles.d.ts`.

## A leg

- A 20-second clock: a rope fuse that burns along the answer line. When it runs out, whatever is typed is taken; if nothing valid is typed, the leg is Becalmed.
- One number, typed. Accepts commas, decimals, `4m`, `2.5k`, `1.2b`, `1e6`, and the words thousand / million / billion. A live echo shows the number in full and in words. Chips add thousand / million / billion.
- The question has its unit and a clue for scale. The fact is shown after the reveal; the source is kept in the bank but not shown.

## Scoring

Ratio `r = max(guess/answer, answer/guess)`.

| Tier | Guess | Crossing takes | Wind | Where you stop |
|---|---|---|---|---|
| Dead Reckoning | within 10% | 1 day | full sails | right up to the dock |
| True North | within 25% | 1½ days | a fair wind | alongside the dock |
| Land Ho | within 50% | 2 days | a steady breeze | anchored just offshore |
| Off Course | within 2× | 2½ days | a light breeze | anchored offshore |
| Lost at Sea | within 5× | 3 days | barely a breath | anchored well out, rowing in |
| Adrift | beyond 5× | 4 days | limp sails | open water, rowing in |
| Becalmed | blank | 5 days | not a breath of wind | drifted in, rowing in |

A crossing is a straight line for Dead Reckoning and True North; worse guesses tack in a few smooth swings either side of it. The voyage is 7 to 35 days. The server recomputes the days from the guesses; the client never sends a score.

## The reveal

In beats: the number clears from fog and counts up; a log-scale line drops the answer (gold diamond) and your guess (ring) with a bar between them; the tier stamps in letter by letter with a per-tier effect, and "+N days" pops in; ashore, the island marks the result, fireworks go up for a good guess or a rain cloud passes for a poor one, and the sailor cheers, waves, slumps or shrugs; then the fact and "sail on to *next island*".

## The end

- "seven islands in N days", then "par is 7 · N over" (or "a perfect voyage · par").
- The chart pulls back to show the whole route, crossing by crossing in tier colours.
- "quicker than X% of the fleet", the fleet average, your streak, your longest streak and a countdown to the next voyage.
- "see what you missed": per leg, everyone's guesses as a histogram on a log scale, with the answer and your guess.
- Copy result: `dead reckoning · voyage N`, the seven coloured squares, and `N days at sea (par 7)`.

## The fleet

- `POST /api/dead-reckoning/finish` with the day's date and the seven guesses. The first play of the day per player (signed-in user, or guest session) is stored; a repeat post returns the stored one. It answers with your days at sea, the fleet's days (for the average and percentile) and up to 300 sampled guesses per leg.
- Until a day has 30 real plays, the fleet is 300 simulated sailors, seeded by the date, plus the real ones. The response says which (`players` or `estimate`).
- If the database is unreachable or the table is missing, the response is the estimated fleet.

## Saved on the device

- Today's guesses, after each leg, so a refresh resumes the voyage or goes straight to the end screen.
- A finished voyage goes into the shared daily streak store, like every other daily. Dates kept in the game's own list before it joined are carried over once.
- Both are best-effort: the game works without storage.

## On the rest of the site

- It is one of the dailies: on the home page, in the footer, the sitemap and search, with its own share image.
- It holds the home page's featured slot every day. Once it is played, the slot goes to Chain Link, Brain Dead and AnyGuessr in their usual rotation, and Dead Reckoning drops into the lineup.
- It counts towards the Sweep from the day it joined (`SWEEP_SINCE` in `lib/streak/sweep.ts`). Days before that are judged without it, so nobody loses the Sweeps they already have. The end screen shows today's games, what is left for a Sweep, and what to play next, under the voyage's own result.
- Opening it from the home page or another finish screen lands on its intro, as with Ball Knowledge, because each question starts a clock.
- The share text uses the shared format and links to the shared result page.

## Launch notice

- Every visitor is told once (`lib/launch-notice.ts`, `components/launch-notice/`). On the home page it is a pop-up card. On another game it is a banner, but only for a visit that started away from the home page: someone who came in through the home page has already been offered the pop-up.
- It ends for good, in that browser, on closing or clicking either, on opening Dead Reckoning, or for anyone who has already finished a voyage. It never shows on Dead Reckoning itself, and nobody sees it after `NOTICE_UNTIL` (2026-12-01).
- `launch_notice_shown`, `launch_notice_clicked` and `launch_notice_dismissed` record how it does.

## Out of scope

- The shared daily intro screen and the about text below the game: the voyage fills the window.
- An admin page for the question bank, and daily review: the questions are picked from the date.
- Sound.
