# Daily game intros

**Date:** 2026-10-14
**Status:** Design approved in conversation; awaiting review of this spec.

## Goal

Each of the seven daily games gets an intro screen. It shows what the game is, plays a short live demo of the game, gives today's hook, and has a Play button. Play starts the game on the same page. The intro replaces the first-visit "How It Works" modals and the start screens some games already have.

The intros are built separately for each game (each has its own layout and demo), not as one shared template. The logic that decides whether to show the intro, and the player count, are shared.

## Scope

In scope: Chain Link, Brain Dead, AnyGuessr, FreezeFrames, Ball Knowledge, Hot Takes, Getting Warmer, at their daily routes.

Out of scope:
- Draft Anything, which already has a landing page.
- Slippery Slope.
- Brain Dead free play and AnyGuessr infinite (unchanged, apart from Brain Dead's hub linking to free play).
- Making Hot Takes' crowd percentages real.

## Behaviour common to every intro

### When it shows

| Player state today | What they see |
|---|---|
| Not started | The intro. Play starts the game in place; the URL doesn't change. |
| In progress (only games that save progress: Chain Link, AnyGuessr) | Straight into the game. No intro. |
| Finished | Straight to the game's existing finish or "already played" screen. No intro. |

A game that doesn't save progress restarts on refresh today. That counts as "not started", so the intro shows again.

**Exception: Brain Dead.** `/brain-dead` is a hub, so the intro always shows. Its main button changes with state: *Start today's run* → *See today's result*. Brain Dead doesn't save a run in progress, so there's no resume state. A **Free play** button is always shown next to it.

Until the game's saved state has been read, the page shows the intro's background only. That way a returning player never sees the intro flash and then jump.

### What every intro contains

- The game's wordmark in its own font and colours.
- The pitch, or a one-line rules row (the copy for each game is below). Every rule must match the real game; several mockup rules were corrected against the code during design.
- The live demo, described per game below. It loops, except Getting Warmer's, which plays once and holds.
- **Today line:** the date in UTC, matching the game's date logic ("Tue 14 Oct"), plus the streak from `useStreak()` when it's above 0. There is no puzzle number.
- **Teaser:** today's hook, with no spoilers. The data source for each game is listed below.
- **Play button.**
- **Player count**, described in the next section.
- **About and FAQ:** `GameAbout` renders under the intro only, and is gone once the game starts. It moves out of the page/layout files and into the intro. The server always renders the intro, so the HTML search engines see always includes this text.

### Player count

These are real numbers only. A count is shown only when at least 25 people have played that day. Below that, the intro shows a line with no number in it (copy chosen per game, e.g. "Today's board is fresh — set the bar").

- **Source:** a new route, `GET /api/daily-intro/count?game=<id>`, returns `{ count: number | null }`. It's cached at the CDN for 60 seconds (`s-maxage=60`).
  - Brain Dead, AnyGuessr, FreezeFrames, Ball Knowledge and Getting Warmer count today's rows in `daily_finishes`. This reuses the head-count query from `dayCounts`.
  - Chain Link counts today's completed daily rows in `chain_puzzle_attempts`.
  - Hot Takes returns `null`, because no plays are recorded. It always shows the no-number line.
- **Fetching:** the intro fetches the count on the client, so the pages stay static. Until it arrives, and whenever the request fails, the no-number line shows.
- **Copy:** count only ("1,240 played today"). No averages; that keeps the query cheap and the claim simple.

### Replaced UI (delete)

- `components/chainlink/tutorial-modal.tsx`, plus the `chainlink-tutorial-seen` flag.
- `components/brain-dead/daily-intro-modal.tsx`. It currently gates the question timer, so the intro's Play must now be what starts the timer.
- `components/brain-dead/menu.tsx`, which the hub replaces.
- `components/ui/game-how-it-works-modal.tsx` and `lib/game-how-it-works.ts`. They are used only by AnyGuessr, FreezeFrames, Ball Knowledge, Hot Takes and Getting Warmer.
- FreezeFrames' `screen === "home"` start screen. The intro's Play goes straight to `tryPlay`.
- Ball Knowledge's `screen === "start"` start screen. The intro's Play calls `startGame`, which starts the 60-second clock.
- `app/anyguessr/page.tsx`, the client landing page with a "Today's Puzzle" card. See Routes.

### Shared code

The per-game layout and demo stay separate. Only the plumbing is shared:

- `lib/daily-intro/use-daily-intro.ts`: `useDailyIntro(adapter)` returns `{ phase: "checking" | "intro" | "game" | "finished", play() }`. Each game passes an adapter that reports its state from its existing storage (listed below), plus a `start` callback.
- `lib/daily-intro/use-intro-count.ts`: fetches the count and applies the 25 floor.
- `components/daily-intro/`: small shared pieces only (today line, count line, `prefers-reduced-motion` wrapper). The layout lives in each game's own folder, e.g. `components/chainlink/intro.tsx`.
- Analytics: `track("daily_intro_play_clicked", { game })` on Play. Brain Dead's Free play button sends `track("daily_intro_freeplay_clicked", { game: "brain-dead" })`.
- **Reduced motion:** under `prefers-reduced-motion` (use `lib/motion/use-reduced-motion.ts`), every demo shows a single static frame of its finished state.

## Per game

The mockups are in `.superpowers/brainstorm/48549-1791993937/content/` (git-ignored). Use them as the visual reference; the option letters are the ones that were picked.

### Chain Link · Poster (`chainlink-intro.html`, option A)

- **Layout:** everything centred: wordmark, pitch, demo chain, three rule chips, teaser, Play, count.
- **Demo:** SNOW → BALL → PARK → BENCH. Each row becomes active, its letters type in, it turns green, and the link between rows snaps on. The chips "Read the last word / Type the next one / Fewer misses wins" light up in step.
- **Teaser:** "Today starts with **{startWord}** · {n} words", from the `/api/chain/daily` response (`startWord`, `words.length`). It shows once the store and puzzle are loaded.
- **State:** the `chainlink-v3` store.
  - Finished: `gameStatus` is `completed` or `failed` for today.
  - In progress: `gameStatus` is `playing` and `wordAttempts` is not empty.
  - Not started: `gameStatus` is `playing` and `wordAttempts` is empty. The store sets `startTime` when the puzzle is fetched, so Play must reset `startTime` to the click time. Otherwise reading the intro counts against the player's time.

### Brain Dead · Vitals monitor (`brain-dead-options-2.html`, option F)

- **Routes:** `/brain-dead` becomes the hub, and the daily plays in place there. `/brain-dead/daily` permanently redirects to `/brain-dead`. Update `playHref` to `/brain-dead` in `lib/games/registry.ts` and `lib/admin/games.ts`. The game's back link goes to `/`. The leaderboard link is dropped; the `/brain-dead/leaderboard` route stays.
- **Layout:** wordmark and pitch ("Fifteen questions, getting harder. **One wrong answer ends the run.**"), the monitor, teaser, buttons (**Start today's run**, then **Free play** → `/brain-dead/freeplay`), and the count.
- **Demo:** one hospital-monitor panel containing a category label, a "● LIVE" tag, the heartbeat trace, a big "Question N/15" readout, a draining timer bar, and the question typing across the bottom like a ticker. Two right answers, then the miss: the monitor goes red, the trace flatlines, and the ticker reads "Tin ✗ · it was Tungsten. Run over."
- **Teaser:** fixed copy ("15 questions · Daily Mix"). Brain Dead has no per-day teaser data.
- **State:** `getDailyPlayed()` (`bd_daily_<date>`) means finished, and the button becomes *See today's result*. Play hides the intro and starts the timer.

### AnyGuessr · Map backdrop on desktop, framed map on phone (`anyguessr-options-2.html`; desktop = option C/E, phone = option G)

- **Routes:** `/anyguessr` permanently redirects to `/anyguessr/daily`, and `canonicalPath` becomes `/anyguessr/daily`, the same pattern FreezeFrames uses. `GameAbout` moves out of `app/anyguessr/layout.tsx` into the intro, so it no longer appears on infinite mode.
- **Desktop (≥700px container):** the dotted world map spans the page behind the text, with a dark pool behind the wordmark. Pins drop around the edges of the map, away from the centre column, each with a paper clue tag ("Landmark · Uluru +94"). Scores in the demo use the real scale: a round is worth at most 100 points (`DAILY_MAX_ROUND_SCORE`).
- **Phone:** the same pins and paper tags inside a framed map card under the pitch.
- **Rules row:** "**7** clues · **1** pin each · **100** for a bullseye". The mockup said "5k" and showed scores like +4,705; both were wrong.
- **Teaser:** "Today's first clue is **a {clueType}** · {totalRounds} rounds", from the daily response.
- **State:** the `anyguessr-v7` store. `status === "won"` means finished. Rounds already played means in progress. Neither means not started.

### FreezeFrames · Filmstrip (`freezeframes-options.html`, option C)

- **Layout:** wordmark, pitch, a film strip running edge to edge, rules row ("**4** rounds · **1,000** pts each · **faster** scores more"), teaser, Play ("▶ Roll it"), and the count.
- **Demo:** the strip holds the four rounds (movie, song, TV show, album). It advances one frame at a time into a glowing gate. The frame in the gate comes into focus (the song frame shows a waveform instead), and its answer types in with a ✓.
- **Art:** the demo needs real art, not the CSS stand-ins in the mockup. Use fixed, non-daily stills, such as bundled public-domain or licensed images, or this game's own past rounds. It must never use today's rounds.
- **Teaser:** the round types from `lib/freezeframes/rounds.ts` ("2 frames, 1 song, 1 cover").
- **State:** `getDailyPlayed()` (`freezeframes_played_<date>`) means finished. Play calls `tryPlay`.

### Ball Knowledge · The list (`ball-knowledge-options-2.html`, option E)

- **Layout:** wordmark, pitch, a panel, rules row ("**60s** on the clock · **no** penalty for misses · **close** spelling counts"), **Start the clock**, and the count. No basketball props.
- **Panel:** an eyebrow reading "Today's category" with a 0:60 readout, the category in big Teko type, a thin clock bar draining, and a numbered list filling in quickly. Misses appear struck through, without a number.
- **Demo answers:** the demo plays a fixed sample category, not today's. Showing today's real answers would spoil the game. The panel's heading, though, shows today's real category. Two ways to square that while building, pick one: (a) the panel shows today's category with a list of answers blurred out, never real ones; or (b) a small "Demo: Dog breeds" label. Prefer (a).
- **Teaser:** the category is the hook, passed in from the server page as `category`.
- **State:** `bk_played_<date>` matching today's category means finished. Play calls `startGame`.

### Hot Takes · Slips into tiers (`hot-takes-options.html`, option A)

- **Layout:** wordmark, "Today's category" with the name in big type, the demo, rules row ("**15** items · **S–D** tiers · **lock it in**"), Play ("Start ranking"), and the no-number line.
- **No crowd claims:** the crowd percentages in the game are simulated. The intro must not mention the crowd.
- **Demo:** paper slips, one at a time, drop into the S–D heat tiers, and a 🔥 stamp lands at the end. Use today's real item labels: they aren't secret, since they're the whole board. Their tiers are random demo placements.
- **New persistence:** on lock-in, save today's placements to localStorage under `hot_takes_played_<date>`. A returning finished player then goes straight to their finish screen with their tiers, not an empty board.
- **State:** that key (or the streak's `playedToday` as a fallback) means finished.

### Getting Warmer · The wordmark heats up (`getting-warmer-options-2.html`, option F)

- **Layout:** wordmark, a small heat chip (Cold → Lukewarm → Warm → Hot → On fire, labels from `lib/getting-warmer/heat.ts`), the clue list, struck guesses, rules row ("**2** clues to start · **every miss** adds one · **fewest** guesses wins"), Play ("Start guessing"), and the count. No big temperature readout.
- **Demo:** "GETTING WARMER" starts icy blue, and orange fills it left to right as each clue lands. The title has a heat haze: an SVG turbulence shimmer plus a soft orange glow rising off it, both building with heat. Embers drift up and an orange glow rises from the bottom of the page as it heats. The demo uses a fixed sample puzzle (LIGHTHOUSE), never today's.
- **Plays once:** at the solve the wordmark is white-hot and the chip reads On fire, and it **stays** that way. It does not loop back to cold.
- **Teaser:** "2 clues to start". There's no category field, so the teaser doesn't claim one.
- **State:** `getting_warmer_played_<date>` means finished.

## Testing

- **Unit (vitest):** for `useDailyIntro`, each phase (checking → intro / game / finished) and that `play()` calls `start` exactly once. For `use-intro-count`, the floor, `null`, and the failure path. For the count route, each game's source query, Hot Takes returning `null`, and an unknown game returning 400.
- **E2E (Playwright), per game:**
  - A fresh visit shows the intro, and the About text sits below it.
  - Play starts the game, the URL stays the same, and the About text is gone.
  - With the game's "played" storage seeded, the intro is skipped.
  - Brain Dead: `/brain-dead/daily` redirects, and Free play navigates.
  - AnyGuessr: `/anyguessr` redirects.
  - Hot Takes: a reload after lock-in shows the finish screen.
  - Under reduced motion, the demo is static.
- Check both themes, dark first. Check that small labels are readable in dark mode (contrast at least 4.5:1).

## Rollout

Build one game at a time, in lineup order: Chain Link, Brain Dead, AnyGuessr, FreezeFrames, Ball Knowledge, Hot Takes, Getting Warmer. The shared hook, count route and pieces land with Chain Link. Each game is checked on a worktree dev server and approved before it merges. The old modal files are deleted with the last game that uses them.
