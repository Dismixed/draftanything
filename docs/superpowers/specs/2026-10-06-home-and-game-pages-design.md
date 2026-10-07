# Home page and game pages redesign

Date: 2026-10-06
Status: awaiting review (updated after search research)

## Why

Analytics for the 30 days to 2026-10-06 (PostHog, plus a Search Console export):

- 96 visitors, 153 sessions. Weekly visitors sit at 20–31 with no growth trend.
- About 80% of visitors land on the home page. 76 of 96 arrive from search.
- 52 of 55 search clicks are for the site's own name ("stim games", "stim game"). No game ranks for a description of what it is.
- 40 of 96 visitors never open a game. Of the 76 search visitors, 40 view exactly one page.
- Visitors who open one game usually open more: 29 search visitors opened two or more games, 13 opened one.
- 16 of 96 visitors are seen on more than one day, and the heaviest of those are probably internal.
- Each daily gets 19–27 visitors. Slippery Slope gets 4.
- Brain Dead, Hot Takes and Ball Knowledge record no gameplay events.

The home page is where most people arrive and where half of them leave. The game pages carry almost no text for a search engine to rank.

## Goals

1. A first-time visitor understands what the site is and starts a game in one click.
2. A returning player sees what is left to play today.
3. Each game's page gives search engines a description of the game without putting anything in front of the game.
4. Every game is described in one place in the code.
5. We can measure home page clicks and daily completions for every game.

## Out of scope

- Archive of past puzzles. This is the next phase.
- Submitting each daily to daily-game directories (Listdle, DailyDles and similar). This is the first marketing task after release and needs no code.
- Share images (a picture card of the result). Text sharing is in scope; see section 6.
- A teaser of today's puzzle content on the home page.
- Link preview (Open Graph) images.
- New game modes, and any change to the game screens beyond adding the share button to each finish screen.
- URL changes. Every game stays at the address where it is played today.

## 1. Game registry

### Problem

A game is currently described in four places that have drifted apart: `games` in `lib/seo.tsx`, `GAME_META` in `lib/streak/types.ts`, `GAME_BRANDS` in `lib/game-branding.ts`, and hand-written cards in `app/page.tsx` (1,263 lines). Page titles are also inconsistent ("Chain Link — Stim Labs", "Hot Takes — Stim Games", "Getting Warmer — Daily Word Game").

### Design

`lib/games/registry.ts` exports one entry per game. It is small and safe to import from client components.

| Field | Purpose |
|---|---|
| `id` | Existing `GameId` |
| `kind` | `"daily"` or `"party"` |
| `name`, `brand` | Display name and the two-tone split used by `GameTitle` |
| `playHref` | Where the game is played today (for example `/chainlink`, `/anyguessr/daily`) |
| `canonicalPath` | The path used in the sitemap and canonical tag |
| `category` | Short label, using the words daily-game directories sort by: Word, Geography, Trivia, Movies & TV, Ranking, Party |
| `blurb` | One line for lineup cards |
| `pitch` | One or two sentences for the featured slot |
| `theme` | Background, border, accent and text colour variables |
| `seo` | Short description, genre, play mode, sitemap priority. Page titles come from the content files (section 3). |

`DAILY_GAMES` order in the registry is the rotation order for the featured slot.

`lib/seo.tsx`, `lib/streak/types.ts` and `lib/game-branding.ts` keep their exported names but derive their data from the registry, so existing imports keep working. `GAME_META`, `GAME_BRANDS` and `games` stop being hand-maintained.

Long-form text does not go in the registry. It lives in `lib/games/content/<id>.ts`, one file per game, imported only by server components (see section 3).

Previews: `components/daily/game-card-preview.tsx` becomes the one preview component for all seven dailies, with a `size` prop (`"sm"` for lineup and "More dailies", `"lg"` for the featured slot). The preview functions inside `app/page.tsx` are removed.

## 2. Home page

Approved mockup: `.superpowers/brainstorm/70004-1791314843/content/home-lineup-v2.html`, lineup layout A.

### Structure

1. Header: badge, "Stim Games" wordmark as the page's main heading, profile menu. The page title starts with "Stim Games".
2. Headline and one supporting line saying what the site is. "Seven free daily games. New puzzles every day." / "Trivia, geography, word chains, pop culture and tier lists, in the style of Wordle and Connections. No sign-up." The phrase "daily games" is required: a search for "stim games" also returns sensory and stimming apps, so the page has to say what kind of games these are.
3. Featured slot.
4. Today's lineup.
5. Play with friends.
6. Footer.

The "Coming Soon" section and the "Play together later" label are removed.

### Featured slot

- The day's featured game is always Chain Link, Brain Dead or AnyGuessr (`FEATURED_GAMES[dayNumber % 3]`, where `dayNumber` is the count of UTC days since a fixed epoch). Every visitor sees the same game on a given day. Changed on 2026-10-07 from a rotation through all seven dailies: the other four are rarely anyone's first pick.
- The day boundary is midnight UTC, matching `getDateString()` in `lib/streak/date.ts`, which is what the puzzles and streaks already use.
- Content: a "Today's featured game" label, game title, pitch, large preview, one primary button linking to `playHref`. The label carries no date, because the puzzle day is a UTC day and would read as tomorrow's date for US visitors in the evening.
- The primary button and the lineup's "Play" labels use the game's brand colour (changed on 2026-10-07 from a neutral dark button). In the light theme the colour is darkened and the button text is large and bold so both still meet contrast requirements.
- If the visitor has played the featured game today, the slot shows the next unplayed one of the three, then the remaining dailies in lineup order, labelled "Up next".
- If all seven are played, the slot shows an all-done state: the seven streaks, a countdown to midnight UTC, and a button to Draft Anything.

### Today's lineup

- The six dailies not in the featured slot, as compact cards in a three-column grid (two columns on tablet, one on small phones).
- Each card: category label, title, blurb, small preview to the right, and either "Play" or "Done today" with the streak.
- Unplayed games come first in rotation order, then played games, dimmed.
- A counter on the section heading: "7 new puzzles today" for someone with none played, otherwise "N of 7 done today".
- Every card links to `playHref`.

### Play with friends

Draft Anything and Slippery Slope as two cards. Draft Anything takes the wider column.

### Rendering

- `app/page.tsx` stays a server component and renders the date-based featured game, the full lineup with nothing marked played, and the JSON-LD. This is what search engines and first-time visitors get.
- A client component (`components/home/today.tsx`) reads `useStreak()` and re-renders the featured slot, lineup order and counter once streak data is available. For a visitor with no history the output is identical, so there is no visible change.
- Home page styling moves from inline style objects to classes in `app/globals.css`, replacing the existing `stim-daily-grid` rules.

### Hot Takes completion

Hot Takes does not call `recordDailyCompletion`, so it can never show as done and has no streak. This build adds the call when a Hot Takes ranking is submitted. Without it the "N of 7" counter cannot reach seven.

## 3. Shared section below each game

Approved mockup: `.superpowers/brainstorm/70004-1791314843/content/game-page-play-first.html`, with the changes below.

### Principle

The game loads first with nothing in front of it. The section sits underneath and is only seen by scrolling. Game components are not modified.

### Placement

`components/games/game-about.tsx` is a server component taking a `gameId`. It is rendered beneath the game on the page where each game is played:

| Game | Page |
|---|---|
| Chain Link | `/chainlink` |
| Hot Takes | `/hot-takes` |
| AnyGuessr | `/anyguessr/daily` |
| FreezeFrames | `/freezeframes/daily` |
| Ball Knowledge | `/ball-knowledge/daily` |
| Getting Warmer | `/getting-warmer/daily` |
| Brain Dead | `/brain-dead` (the existing menu page) |
| Draft Anything | `/draft-anything` |
| Slippery Slope | `/slippery-slope` |

Game pages that set `minHeight: 100vh` on the game wrapper keep it, so the section starts below the first screen.

Three placements need a note:

- **AnyGuessr:** the section goes in `app/anyguessr/layout.tsx`, so it appears on both `/anyguessr` (the canonical address) and `/anyguessr/daily` (where the game is played).
- **Brain Dead and Draft Anything:** their pages are client components. Each page's body moves unchanged into a component file, and the page becomes a server component that renders that component followed by the section.

### Content

Each game has `lib/games/content/<id>.ts` exporting:

- `angle`: the search phrase the page is written around.
- `title` and `description`: page title and meta description built on that angle. Format: `<Name>: <angle phrase> | Stim Games`.
- `intro`: two sentences, always visible.
- `sections`: three to five headed blocks (for example how to play, scoring, tips, what makes it different).
- `faq`: four to six questions phrased the way people search.

Total length per game is 400–800 words across `intro`, `sections` and `faq`.

`sections` and `faq` render as native `<details>` elements. The first section is "How to play" and is open by default; everything else is collapsed. (An earlier draft had a link opening each game's tutorial modal. That would mean changing every game component, so the open first section replaces it.) The text is in the server-rendered HTML, so it is readable by search engines without JavaScript.

The section also shows three other dailies as lineup cards (reusing the home page card) and a link back to the home page.

Structured data: `buildGameJsonLd` stays, and a `FAQPage` node is generated from `faq`.

### Search angles

Chosen from two checks made on 2026-10-06: who ranks for each phrase, and what Google autocomplete suggests for it. Autocomplete only suggests phrases people type, so it shows which wordings have real demand. It does not give volumes.

| Game | Primary phrase | Supporting phrases for sections and questions | Avoid |
|---|---|---|---|
| Hot Takes | tier list daily game | rank things game, ranking game, how it differs from a blind ranking game | "daily tier list" (autocomplete returns unrelated results) |
| FreezeFrames | guess the movie, song, TV show and album daily game | guess the movie by frame, movie guessing game like Wordle, guess the song daily game, guess the TV show by frame, guess the album cover game | "pop culture daily game" (no suggestions, so little demand) |
| Ball Knowledge | name as many as you can game | name as many as you can categories, name 5 things game, 60-second category game | "ball knowledge game/quiz/test" (every suggestion is a sport) |
| Brain Dead | daily trivia game | daily trivia games like Wordle, daily quiz game, one wrong answer ends your run | "sudden death trivia" (people want question lists, not a game) |
| Chain Link | daily word chain game | chain link game, word chain puzzle, word link game, word chain game today | "compound word game" (skews to children's worksheets) |
| Getting Warmer | guess the word from clues game | guess the word game with clues, daily word clue game, getting warmer word game | "hot and cold word game" (that is Contexto-style semantic guessing, a different game) |
| AnyGuessr | guess the country from clues | country guessing game daily, country guessing game like Wordle, daily geography game, guess the country by flag | "GeoGuessr alternative" (implies street view, which this is not) |
| Draft Anything | draft anything with friends online | draft anything website, fun draft ideas with friends, good draft topics | "draft party game" (suggestions are NFL draft parties) |
| Slippery Slope | trivia game with friends online | snakes and ladders trivia, snakes and ladders quiz game, free online trivia with friends | none |

Notes that shape the copy:

- **Chain Link and Draft Anything are searched by name.** "chain link game" and "draft anything website/app" both appear in autocomplete, so their names stay prominent in the title. Another site, draftanything.io, holds the exact Draft Anything name.
- **Ball Knowledge's name works against it.** Searchers of the name expect sports quizzes. Its title leads with "name as many as you can".
- **FreezeFrames is searched one medium at a time.** Nobody types the combined phrase, so each of its four rounds gets its own collapsed section and question. The game shows a movie frame, a 20-second song clip, a TV frame and an album cover, which matches those phrases.
- **Draft Anything gets a "draft ideas" section.** "Fun draft ideas with friends" and similar are common searches and the game already suggests topics.
- **"Unlimited" recurs** ("chain link game unlimited", "word chain game unlimited", "movie guessing game unlimited"). This is evidence for the archive phase and is not addressed in this build.
- **"stim games" is the site's main search term today.** It brought 46 of 55 search clicks, at about a one-in-three click rate. The home page keeps "Stim Games" as its heading and at the start of its title so that position is protected. It is a small term (autocomplete corrects it to "steam games"), so growth beyond it has to come from the game phrases above and from directories.

Ranking for most of these phrases is a long-term bet, since established single-game sites hold them. Directory submission is expected to bring visitors sooner.

### Copy accuracy

Rules, scoring and limits in the copy are taken from each game's code and existing tutorial, not from memory. Claims about accounts and streak syncing are only made where the behaviour is confirmed.

## 4. Tracking

Two new PostHog events, both captured in the browser so they attach to the same visitor as pageviews.

| Event | When | Properties |
|---|---|---|
| `home_game_clicked` | A game link on the home page is clicked | `game`, `slot` (`featured`, `lineup`, `party`), `position`, `played_today` |
| `daily_completed` | `recordDailyCompletion` records a new play date | `game`, `streak` |

`daily_completed` is fired from the existing `stim-streak-completed` window event, so it covers all seven dailies from one place and fires once per game per day.

A third event, `game_about_link_clicked` (`from_game`, `to_game`), covers the "more dailies" links in the shared section.

## 5. Testing

Unit (Vitest):

- Featured rotation: same game for the same UTC date, each game once in any seven consecutive days.
- Next-unplayed selection, including wrap-around and the all-done case.
- Lineup ordering: unplayed first, played last, featured game excluded.
- Registry completeness: every `GameId` has an entry and every required field.
- Content: every game has a content file, between 400 and 800 words, four to six FAQ entries.
- `tests/seo.test.ts` continues to pass against the registry-derived data.

Component (Testing Library):

- Home "today" component in three states: no history, two played, all played.

End to end (Playwright):

- Home page renders the featured slot and six lineup cards, and the featured button navigates to the game.
- The shared section is present below a game and its `<details>` text is in the initial HTML.
- `tests/e2e/accessibility.spec.ts` already scans the home page. A dark-theme scan is added.

`pnpm verify` passes.

## 6. Share buttons

Added after an adversarial review found that sharing, the main way daily games spread, was deferred while social traffic stood at one visitor in 30 days.

- One shared button on every daily's finish screen, above "More dailies".
- On a touch device with the Web Share API it opens the share sheet. Otherwise it copies the text and shows "Copied".
- The text is the game name and a label (the date, or the category for Ball Knowledge and Hot Takes), the result as a short line or a row of squares, and a link to the game ending in `?ref=share`.
- No answers are included.
- Hot Takes shares the player's S tier picks. Its previous share text, which quoted the simulated crowd percentage, is removed.
- Ball Knowledge's existing copy, tweet and text-message controls are replaced by the shared button.
- A `result_shared` event records the game and whether the text was shared or copied.

## Build order

1. Registry, with the three existing modules deriving from it.
2. Home page, including the Hot Takes completion fix.
3. Tracking.
4. Shared section component, then content for all nine games, then share buttons (section 6).

Detail for step 4:  All nine ship in this build. They are written in this order so the most promising pages are reviewed first: Hot Takes, FreezeFrames, Ball Knowledge, Brain Dead, Chain Link, Getting Warmer, AnyGuessr, Draft Anything, Slippery Slope.

## Success measures

Compare the 30 days after release with the baseline above:

- Share of home page visitors who open a game (baseline: 56 of 96 visitors opened at least one game).
- Share of search visitors with a single pageview (baseline: 40 of 76).
- `daily_completed` per visitor, available for the first time.
- Search Console: any impressions for non-brand queries on game pages (baseline: none in the top queries).

Traffic is low, so these are directional and not statistically firm.

## Open items

- **Hot Takes crowd data is simulated.** `generateConsensus` in `components/hot-takes/game.tsx` produces the "aligned with the crowd" percentages from a seeded random formula, and no rankings are stored. Until real aggregation exists, the Hot Takes copy written in this build describes the tier ranking only and makes no claim about other players. Building real aggregation is a separate decision.

- Play-time estimates ("about 2 minutes") are shown in the mockup but have not been measured. They are left out unless real figures are available.
