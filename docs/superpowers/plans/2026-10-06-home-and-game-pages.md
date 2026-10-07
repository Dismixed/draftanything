# Home Page and Game Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the home page around a featured daily plus a "today's lineup", add a shared descriptive section under every game, put every game's metadata in one registry, and track home clicks and daily completions.

**Architecture:** A client-safe registry (`lib/games/registry.ts`) becomes the single source for names, links, colours and short copy; the three existing metadata modules derive from it. Pure functions in `lib/games/today.ts` decide the featured game and lineup order from a UTC day number and the set of games played today. The home page is a server component that renders a client `Today` component; long-form copy lives in server-only content files rendered by a `GameAbout` server component beneath each game.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 with plain CSS in `app/globals.css`, Vitest + Testing Library (jsdom), Playwright + axe, PostHog (`posthog-js`).

**Spec:** `docs/superpowers/specs/2026-10-06-home-and-game-pages-design.md`. Read it before starting. Approved mockups are in `.superpowers/brainstorm/70004-1791314843/content/` (`home-lineup-v2.html`, layout A; `game-page-play-first.html`).

## Global Constraints

- No URL changes. Every game stays at the address where it is played today.
- Game components under `components/<game>/` are not modified, with two exceptions: a single line in `components/hot-takes/game.tsx` (Task 3), and the share button added to each daily's finish screen (Task 9).
- The puzzle day is a UTC day. Use `getDateString()` from `lib/streak/date.ts` or `utcDayNumber()` from `lib/games/today.ts`. Never use local dates.
- Home page `<h1>` is exactly `Stim Games`. The page title starts with `Stim Games`.
- Home page copy, exact: `Seven free daily games. New puzzles every day.` and `Trivia, geography, word chains, pop culture and tier lists, in the style of Wordle and Connections. No sign-up.`
- The party section heading is `Play with friends`.
- Accent colours are used for borders and the two-tone game title only. Body-size text and buttons use `--text`, `--text-dim` and `--bg`.
- No play-time estimates ("about 2 minutes") anywhere.
- Each game's long-form content is 400–800 words across intro, sections and FAQ. Sections and FAQ render as native `<details>` in server-rendered HTML. The first section is headed `How to play` and is open; the rest are collapsed.
- Copy states only what the game's code does. Hot Takes copy makes no claim about other players or "the crowd" (its crowd percentages are simulated).
- PostHog event names, exact: `home_game_clicked`, `daily_completed`, `game_about_link_clicked`, `result_shared`.
- Share text never reveals an answer and never includes Hot Takes' simulated crowd percentage.
- `pnpm verify` passes at the end of every task.
- End every commit message with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Stale day on a cached page.** The server-rendered home page can be minutes old when the UTC day rolls over. The visitor should see today's featured game, not yesterday's. Pinned in Task 4 (`corrects a stale server day number after mount`).
2. **Analytics blocked.** With PostHog blocked by an ad blocker or uninitialised, clicking a game must still navigate and nothing may throw. Pinned in Task 3 (`never throws when capture fails`).
3. **Completing the same daily twice in one day.** Reloading and finishing again must not double-count. `daily_completed` fires once per game per day. Pinned in Task 3 (`fires once when the same daily is completed twice`).
4. **No JavaScript (crawlers, link previews).** The raw HTML of the home page must contain links to all seven dailies, and a game page's raw HTML must contain its section and FAQ text. Pinned in Task 5 and Task 7 e2e tests that read the response body.
5. **Dark theme contrast.** Light is the default theme and gets scanned already. New home text must also pass in dark. Pinned in Task 5 (`home page in dark theme has no serious/critical axe violations`).

---

### Task 0: Isolated workspace and baseline

Another work stream ("arcade punch") has uncommitted changes in this repository's main working tree, touching `app/globals.css`, `components/brain-dead/game.tsx`, `components/chainlink/game.tsx` and `lib/motion/`. Do not work in that tree and do not touch those changes.

**Files:** none.

- [ ] **Step 1: Create a worktree on a new branch**

Use the `superpowers:using-git-worktrees` skill, or:

```bash
cd /Users/joshoguh/WebstormProjects/draft-anything
git worktree add .worktrees/home-and-game-pages -b feature/home-and-game-pages main
cd .worktrees/home-and-game-pages
cp ../../.env.local .env.local
pnpm install
```

The spec and this plan are untracked in the main tree. Copy both into the worktree at the same paths and commit them:

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp ../../docs/superpowers/specs/2026-10-06-home-and-game-pages-design.md docs/superpowers/specs/
cp ../../docs/superpowers/plans/2026-10-06-home-and-game-pages.md docs/superpowers/plans/
git add docs/superpowers
git commit -m "docs: home and game pages spec and plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Record the baseline**

Run: `pnpm verify`
Expected: lint, typecheck, unit tests and build all pass. If anything fails here, stop and report it; it is not caused by this plan.

- [ ] **Step 3: Record the home page accessibility baseline**

End-to-end tests need local Supabase. Run:

```bash
pnpm db:start
pnpm test:e2e tests/e2e/accessibility.spec.ts -g "home page has no serious"
```

Write down whether it passes. If it fails, save the list of violation ids from the output. Task 5 must not add any violation id that is not on this list.

---

### Task 1: Game registry

**Files:**
- Create: `lib/games/registry.ts`
- Create: `tests/lib/games/registry.test.ts`
- Modify: `lib/seo.tsx` (the `GameId` type and the `games` array, lines 9–124)
- Modify: `lib/streak/types.ts` (whole file)
- Modify: `lib/game-branding.ts` (whole file)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `GAME_IDS: readonly GameId[]`, `type GameId`
  - `DAILY_GAMES: readonly DailyGameId[]`, `type DailyGameId`
  - `interface GameEntry { id: GameId; kind: "daily" | "party"; name: string; brand: { first: string; second: string; color: string }; playHref: string; canonicalPath: string; category: string; blurb: string; pitch: string; theme: GameTheme; seo: { description: string; genre: string[]; playMode: string[]; priority: number } }`
  - `interface GameTheme { page: string; background: string; border: string; accent: string; text: string; muted: string }`
  - `GAMES: GameEntry[]`, `getGame(id: GameId): GameEntry`, `isDailyGame(id: GameId): id is DailyGameId`
  - Unchanged exports that now derive from the registry: `games`, `getGameSeo`, `GameId` in `lib/seo.tsx`; `DAILY_GAMES`, `DailyGameId`, `GAME_META` in `lib/streak/types.ts`; `GAME_BRANDS`, `GameBrandId` in `lib/game-branding.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/games/registry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DAILY_GAMES, GAME_IDS, GAMES, getGame, isDailyGame } from "@/lib/games/registry";
import { GAME_BRANDS } from "@/lib/game-branding";
import { games as seoGames } from "@/lib/seo";
import { GAME_META } from "@/lib/streak/types";

describe("game registry", () => {
  it("has nine games, seven of them daily", () => {
    expect(GAME_IDS).toHaveLength(9);
    expect(DAILY_GAMES).toHaveLength(7);
    expect(GAMES.filter((game) => game.kind === "party").map((game) => game.id)).toEqual([
      "draft-anything",
      "slippery-slope",
    ]);
  });

  it("fills every field for every game", () => {
    for (const game of GAMES) {
      expect(game.name, game.id).not.toBe("");
      expect(game.brand.first + game.brand.second, game.id).toBe(game.name);
      expect(game.playHref, game.id).toMatch(/^\//);
      expect(game.canonicalPath, game.id).toMatch(/^\//);
      expect(game.category, game.id).not.toBe("");
      expect(game.blurb.length, game.id).toBeGreaterThan(10);
      expect(game.pitch.length, game.id).toBeGreaterThan(game.blurb.length);
      for (const value of Object.values(game.theme)) expect(value, game.id).not.toBe("");
      expect(game.seo.description.length, game.id).toBeGreaterThan(20);
    }
  });

  it("marks daily games consistently", () => {
    for (const id of GAME_IDS) {
      expect(isDailyGame(id)).toBe(getGame(id).kind === "daily");
    }
  });

  it("keeps the addresses games are played at today", () => {
    expect(getGame("chainlink").playHref).toBe("/chainlink");
    expect(getGame("brain-dead").playHref).toBe("/brain-dead/daily");
    expect(getGame("anyguessr").playHref).toBe("/anyguessr/daily");
    expect(getGame("hot-takes").playHref).toBe("/hot-takes");
    expect(getGame("freezeframes").playHref).toBe("/freezeframes/daily");
    expect(getGame("ball-knowledge").playHref).toBe("/ball-knowledge/daily");
    expect(getGame("getting-warmer").playHref).toBe("/getting-warmer/daily");
    expect(getGame("draft-anything").playHref).toBe("/draft-anything");
    expect(getGame("slippery-slope").playHref).toBe("/slippery-slope");
  });

  it("does not claim Hot Takes compares players", () => {
    const game = getGame("hot-takes");
    const text = `${game.blurb} ${game.pitch} ${game.seo.description}`.toLowerCase();
    expect(text).not.toContain("crowd");
    expect(text).not.toContain("everyone");
  });
});

describe("modules derived from the registry", () => {
  it("derives SEO entries in registry order with canonical paths", () => {
    expect(seoGames.map((game) => game.id)).toEqual([...GAME_IDS]);
    expect(seoGames.find((game) => game.id === "anyguessr")?.path).toBe("/anyguessr");
    expect(seoGames.find((game) => game.id === "brain-dead")?.path).toBe("/brain-dead");
  });

  it("derives streak metadata for every daily", () => {
    expect(Object.keys(GAME_META).sort()).toEqual([...DAILY_GAMES].sort());
    expect(GAME_META.chainlink.label).toBe("Chain Link");
    expect(GAME_META.chainlink.href).toBe("/chainlink");
    expect(GAME_META["hot-takes"].theme.accent).toBe("var(--ht-accent)");
  });

  it("derives brands for every game, including Draft Anything", () => {
    expect(GAME_BRANDS.chainlink).toEqual({ first: "Chain ", second: "Link", color: "#c9b458" });
    expect(GAME_BRANDS["draft-anything"].second).toBe("Anything");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/games/registry.test.ts`
Expected: FAIL, cannot resolve `@/lib/games/registry`.

- [ ] **Step 3: Create the registry**

Create `lib/games/registry.ts`:

```ts
export const GAME_IDS = [
  "chainlink",
  "brain-dead",
  "anyguessr",
  "hot-takes",
  "freezeframes",
  "ball-knowledge",
  "getting-warmer",
  "draft-anything",
  "slippery-slope",
] as const;

export type GameId = (typeof GAME_IDS)[number];

/** Order is the featured-slot rotation order on the home page. */
export const DAILY_GAMES = [
  "chainlink",
  "brain-dead",
  "anyguessr",
  "freezeframes",
  "ball-knowledge",
  "hot-takes",
  "getting-warmer",
] as const;

export type DailyGameId = (typeof DAILY_GAMES)[number];

export interface GameTheme {
  page: string;
  background: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
}

export interface GameEntry {
  id: GameId;
  kind: "daily" | "party";
  name: string;
  brand: { first: string; second: string; color: string };
  playHref: string;
  canonicalPath: string;
  category: string;
  blurb: string;
  pitch: string;
  theme: GameTheme;
  seo: { description: string; genre: string[]; playMode: string[]; priority: number };
}

const REGISTRY: Record<GameId, GameEntry> = {
  chainlink: {
    id: "chainlink",
    kind: "daily",
    name: "Chain Link",
    brand: { first: "Chain ", second: "Link", color: "#c9b458" },
    playHref: "/chainlink",
    canonicalPath: "/chainlink",
    category: "Word",
    blurb: "Link each word to the one before it.",
    pitch:
      "Each word pairs with the one before it to make a common phrase: snow, ball, park. Finish the chain with as few misses as you can.",
    theme: {
      page: "var(--cl-bg)",
      background: "var(--cl-card)",
      border: "var(--cl-border)",
      accent: "var(--cl-green)",
      text: "var(--cl-text)",
      muted: "var(--cl-gray-dim)",
    },
    seo: {
      description: "A daily word-chain puzzle where each word links naturally with the one before it.",
      genre: ["Word game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.95,
    },
  },
  "brain-dead": {
    id: "brain-dead",
    kind: "daily",
    name: "Brain Dead",
    brand: { first: "Brain ", second: "Dead", color: "var(--bd-primary)" },
    playHref: "/brain-dead/daily",
    canonicalPath: "/brain-dead",
    category: "Trivia",
    blurb: "Fifteen questions. One wrong answer ends the run.",
    pitch:
      "Fifteen trivia questions that get harder as you go. One wrong answer, or one timeout, and your run is over.",
    theme: {
      page: "var(--bd-bg)",
      background: "var(--bd-surface)",
      border: "var(--bd-border)",
      accent: "var(--bd-primary)",
      text: "var(--bd-text)",
      muted: "var(--bd-text-secondary)",
    },
    seo: {
      description: "A fast trivia challenge where one wrong answer ends the run.",
      genre: ["Trivia", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.9,
    },
  },
  anyguessr: {
    id: "anyguessr",
    kind: "daily",
    name: "AnyGuessr",
    brand: { first: "Any", second: "Guessr", color: "var(--ag-brand)" },
    playHref: "/anyguessr/daily",
    canonicalPath: "/anyguessr",
    category: "Geography",
    blurb: "Name the country from the clues.",
    pitch:
      "Ten rounds, ten clues: a flag, a currency, a landmark, a dish. Pin the country on the map. Close guesses still score.",
    theme: {
      page: "var(--ag-bg)",
      background: "var(--ag-surface)",
      border: "var(--ag-border)",
      accent: "var(--ag-accent)",
      text: "var(--ag-text)",
      muted: "var(--ag-muted)",
    },
    seo: {
      description: "A country guessing game built from cultural clues, maps, flags, and geography.",
      genre: ["Geography game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.9,
    },
  },
  "hot-takes": {
    id: "hot-takes",
    kind: "daily",
    name: "Hot Takes",
    brand: { first: "Hot ", second: "Takes", color: "#ff3b3b" },
    playHref: "/hot-takes",
    canonicalPath: "/hot-takes",
    category: "Ranking",
    blurb: "Rank today's 15 items from S tier to D.",
    pitch:
      "Fifteen items in one category. Sort every one into S, A, B, C or D, then lock in your ranking.",
    theme: {
      page: "var(--ht-bg)",
      background: "var(--ht-surface)",
      border: "var(--ht-line)",
      accent: "var(--ht-accent)",
      text: "var(--ht-text)",
      muted: "var(--ht-text-dim)",
    },
    seo: {
      description: "A daily tier-list game where you rank fifteen items in one category from S to D.",
      genre: ["Ranking game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.85,
    },
  },
  freezeframes: {
    id: "freezeframes",
    kind: "daily",
    name: "FreezeFrames",
    brand: { first: "Freeze", second: "Frames", color: "#a855f7" },
    playHref: "/freezeframes/daily",
    canonicalPath: "/freezeframes/daily",
    category: "Movies & TV",
    blurb: "Guess the movie, song, show and album.",
    pitch:
      "Name the movie from a frame, the song from a 20-second clip, the TV show from a frame and the artist from an album cover.",
    theme: {
      page: "var(--ff-bg)",
      background: "var(--ff-surface)",
      border: "var(--ff-border)",
      accent: "var(--ff-purple-light)",
      text: "var(--ff-text)",
      muted: "var(--ff-muted)",
    },
    seo: {
      description: "A daily pop-culture guessing game across movies, songs, TV, and albums.",
      genre: ["Pop culture game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.8,
    },
  },
  "ball-knowledge": {
    id: "ball-knowledge",
    kind: "daily",
    name: "Ball Knowledge",
    brand: { first: "Ball ", second: "Knowledge", color: "#5b9ee8" },
    playHref: "/ball-knowledge/daily",
    canonicalPath: "/ball-knowledge/daily",
    category: "Trivia",
    blurb: "60 seconds. Name everything in the category.",
    pitch:
      "One category, 60 seconds. Type as many valid answers as you can before the clock runs out.",
    theme: {
      page: "var(--bk-court-navy)",
      background: "var(--bk-backboard)",
      border: "var(--bk-line)",
      accent: "var(--bk-net-blue)",
      text: "var(--bk-chalk)",
      muted: "var(--bk-chalk-dim)",
    },
    seo: {
      description: "A 60-second category challenge for naming as many valid answers as possible.",
      genre: ["Trivia", "Word game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.8,
    },
  },
  "getting-warmer": {
    id: "getting-warmer",
    kind: "daily",
    name: "Getting Warmer",
    brand: { first: "Getting ", second: "Warmer", color: "#ff6b1a" },
    playHref: "/getting-warmer/daily",
    canonicalPath: "/getting-warmer/daily",
    category: "Word",
    blurb: "Guess the word. Every miss adds a clue.",
    pitch:
      "Start with two clues to a secret word or phrase. Every wrong guess reveals another. Solve it in as few guesses as you can.",
    theme: {
      page: "var(--gw-bg)",
      background: "var(--gw-surface)",
      border: "color-mix(in srgb, var(--gw-orange) 65%, transparent)",
      accent: "var(--gw-orange)",
      text: "var(--gw-ink)",
      muted: "var(--gw-ink-dim)",
    },
    seo: {
      description: "A daily word puzzle where clues keep getting warmer until the answer is found.",
      genre: ["Word game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.8,
    },
  },
  "draft-anything": {
    id: "draft-anything",
    kind: "party",
    name: "Draft Anything",
    brand: { first: "Draft ", second: "Anything", color: "var(--gold-hi)" },
    playHref: "/draft-anything",
    canonicalPath: "/draft-anything",
    category: "Party",
    blurb: "Draft any topic with friends, defend your picks, then get judged.",
    pitch:
      "Pick any topic, take turns drafting, defend every pick, then let the room or the AI judge decide who built the best lineup. One room code, no accounts.",
    theme: {
      page: "var(--bg)",
      background: "var(--panel)",
      border: "var(--border)",
      accent: "var(--gold-hi)",
      text: "var(--text)",
      muted: "var(--text-dim)",
    },
    seo: {
      description:
        "A room-code party game where friends draft any topic, defend every pick, and vote on the best roster.",
      genre: ["Party game", "Draft game"],
      playMode: ["MultiPlayer", "CoOp"],
      priority: 0.9,
    },
  },
  "slippery-slope": {
    id: "slippery-slope",
    kind: "party",
    name: "Slippery Slope",
    brand: { first: "Slippery ", second: "Slope", color: "var(--ss-lime)" },
    playHref: "/slippery-slope",
    canonicalPath: "/slippery-slope",
    category: "Party",
    blurb: "Answer trivia to climb the board before someone knocks you back down.",
    pitch:
      "A trivia board game. Answer questions to move up the board, and watch for the slides that send you back down.",
    theme: {
      page: "var(--ss-bg)",
      background: "var(--ss-surface)",
      border: "var(--ss-border)",
      accent: "var(--ss-lime)",
      text: "var(--ss-text)",
      muted: "var(--ss-muted)",
    },
    seo: {
      description:
        "A trivia board game where players answer questions and climb before opponents knock them back down.",
      genre: ["Trivia", "Board game", "Party game"],
      playMode: ["SinglePlayer", "MultiPlayer"],
      priority: 0.75,
    },
  },
};

export const GAMES: GameEntry[] = GAME_IDS.map((id) => REGISTRY[id]);

export function getGame(id: GameId): GameEntry {
  return REGISTRY[id];
}

export function isDailyGame(id: GameId): id is DailyGameId {
  return (DAILY_GAMES as readonly string[]).includes(id);
}
```

- [ ] **Step 4: Derive `lib/seo.tsx` from the registry**

In `lib/seo.tsx`, add this import under the existing `import type { MetadataRoute } from "next";`:

```ts
import { GAMES, type GameId } from "@/lib/games/registry";

export type { GameId };
```

Delete the hand-written `export type GameId = | "chainlink" | ... | "slippery-slope";` union.

Replace the whole `export const games: GameSeo[] = [ ... ];` array literal (every entry from `chainlink` to `slippery-slope`) with:

```ts
export const games: GameSeo[] = GAMES.map((game) => ({
  id: game.id,
  name: game.name,
  path: game.canonicalPath,
  description: game.seo.description,
  genre: game.seo.genre,
  playMode: game.seo.playMode,
  priority: game.seo.priority,
}));
```

Leave `GameSeo`, `SITE_URL`, `absoluteUrl`, `sitemapEntries`, `buildHomeJsonLd`, `getGameSeo`, `buildGameJsonLd`, `JsonLdScript` and `faq` as they are.

- [ ] **Step 5: Derive `lib/streak/types.ts` from the registry**

Replace the whole file with:

```ts
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";

export { DAILY_GAMES, type DailyGameId };

export interface GameStreakState {
  playDates: string[];
}

export interface StreakStore {
  version: 1;
  games: Record<DailyGameId, GameStreakState>;
}

export interface GameStreakInfo {
  id: DailyGameId;
  label: string;
  href: string;
  currentStreak: number;
  playedToday: boolean;
}

export interface StreakCompletionResult {
  isNew: boolean;
  streak: number;
  gameId: DailyGameId;
}

export interface DailyGameTheme {
  background: string;
  border: string;
  accent: string;
  text: string;
}

export interface DailyGameMeta {
  label: string;
  href: string;
  blurb: string;
  theme: DailyGameTheme;
}

export const GAME_META = Object.fromEntries(
  DAILY_GAMES.map((id) => {
    const game = getGame(id);
    const meta: DailyGameMeta = {
      label: game.name,
      href: game.playHref,
      blurb: game.blurb,
      theme: {
        background: game.theme.background,
        border: game.theme.border,
        accent: game.theme.accent,
        text: game.theme.text,
      },
    };
    return [id, meta];
  }),
) as Record<DailyGameId, DailyGameMeta>;
```

- [ ] **Step 6: Derive `lib/game-branding.ts` from the registry**

Replace the whole file with:

```ts
import { GAMES, type GameId } from "@/lib/games/registry";

export interface GameBrand {
  first: string;
  second: string;
  color: string;
}

export const GAME_BRANDS = Object.fromEntries(
  GAMES.map((game) => [game.id, game.brand]),
) as Record<GameId, GameBrand>;

export type GameBrandId = GameId;
```

- [ ] **Step 7: Run the tests**

Run: `pnpm vitest run tests/lib/games/registry.test.ts tests/seo.test.ts`
Expected: PASS, all tests in both files.

- [ ] **Step 8: Verify and commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add lib/games/registry.ts lib/seo.tsx lib/streak/types.ts lib/game-branding.ts tests/lib/games/registry.test.ts
git commit -m "feat(games): single game registry; derive seo, streak and brand metadata from it

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Featured rotation and lineup logic

**Files:**
- Create: `lib/games/today.ts`
- Create: `tests/lib/games/today.test.ts`

**Interfaces:**
- Consumes: `DAILY_GAMES`, `DailyGameId`, `GameId` from `@/lib/games/registry`.
- Produces:
  - `utcDayNumber(date?: Date): number`
  - `featuredGameForDay(dayNumber: number): DailyGameId`
  - `interface TodayView { featured: DailyGameId | null; isUpNext: boolean; lineup: DailyGameId[]; doneCount: number }`
  - `buildTodayView(dayNumber: number, played: ReadonlySet<DailyGameId>): TodayView`
  - `msUntilNextUtcDay(now: number): number`
  - `formatCountdown(ms: number): string` (for example `"8h 37m"`)
  - `otherDailies(gameId: GameId, count?: number): DailyGameId[]`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/games/today.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";
import {
  buildTodayView,
  featuredGameForDay,
  formatCountdown,
  msUntilNextUtcDay,
  otherDailies,
  utcDayNumber,
} from "@/lib/games/today";

const DAY = 20_000;

describe("utcDayNumber", () => {
  it("changes at midnight UTC, not local midnight", () => {
    const before = utcDayNumber(new Date("2026-10-06T23:59:59Z"));
    const after = utcDayNumber(new Date("2026-10-07T00:00:00Z"));
    expect(after).toBe(before + 1);
  });
});

describe("featuredGameForDay", () => {
  it("returns the same game for the same day", () => {
    expect(featuredGameForDay(DAY)).toBe(featuredGameForDay(DAY));
  });

  it("features every daily once in any seven consecutive days", () => {
    const week = Array.from({ length: 7 }, (_, i) => featuredGameForDay(DAY + i));
    expect([...week].sort()).toEqual([...DAILY_GAMES].sort());
  });

  it("returns a valid game for negative day numbers", () => {
    expect(DAILY_GAMES).toContain(featuredGameForDay(-1));
    expect(DAILY_GAMES).toContain(featuredGameForDay(-15));
  });
});

describe("buildTodayView", () => {
  const featured = featuredGameForDay(DAY);

  it("features the day's game with nothing played", () => {
    const view = buildTodayView(DAY, new Set());
    expect(view.featured).toBe(featured);
    expect(view.isUpNext).toBe(false);
    expect(view.doneCount).toBe(0);
    expect(view.lineup).toHaveLength(6);
    expect(view.lineup).not.toContain(featured);
  });

  it("moves to the next unplayed game once the featured one is played", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>([featured]));
    expect(view.featured).toBe(featuredGameForDay(DAY + 1));
    expect(view.isUpNext).toBe(true);
    expect(view.doneCount).toBe(1);
  });

  it("wraps around the rotation when looking for the next unplayed game", () => {
    const allButOne = new Set<DailyGameId>(DAILY_GAMES.filter((id) => id !== featuredGameForDay(DAY + 6)));
    const view = buildTodayView(DAY, allButOne);
    expect(view.featured).toBe(featuredGameForDay(DAY + 6));
    expect(view.doneCount).toBe(6);
  });

  it("puts unplayed games before played games in the lineup", () => {
    const playedGame = featuredGameForDay(DAY + 2);
    const view = buildTodayView(DAY, new Set<DailyGameId>([playedGame]));
    expect(view.featured).toBe(featured);
    expect(view.lineup[view.lineup.length - 1]).toBe(playedGame);
    expect(view.lineup.slice(0, 5)).not.toContain(playedGame);
  });

  it("has no featured game and all seven in the lineup when everything is played", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>(DAILY_GAMES));
    expect(view.featured).toBeNull();
    expect(view.isUpNext).toBe(false);
    expect(view.doneCount).toBe(7);
    expect(view.lineup).toHaveLength(7);
  });
});

describe("countdown", () => {
  it("measures the time to the next UTC midnight", () => {
    const now = Date.parse("2026-10-06T15:23:00Z");
    expect(msUntilNextUtcDay(now)).toBe((8 * 60 + 37) * 60 * 1000);
  });

  it("formats hours and minutes", () => {
    expect(formatCountdown((8 * 60 + 37) * 60 * 1000)).toBe("8h 37m");
    expect(formatCountdown(59 * 1000)).toBe("0h 1m");
    expect(formatCountdown(0)).toBe("0h 0m");
  });
});

describe("otherDailies", () => {
  it("returns three other dailies and never the game itself", () => {
    for (const id of DAILY_GAMES) {
      const others = otherDailies(id);
      expect(others).toHaveLength(3);
      expect(others).not.toContain(id);
    }
  });

  it("returns dailies for a party game", () => {
    expect(otherDailies("draft-anything")).toEqual(DAILY_GAMES.slice(0, 3));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/lib/games/today.test.ts`
Expected: FAIL, cannot resolve `@/lib/games/today`.

- [ ] **Step 3: Write the implementation**

Create `lib/games/today.ts`:

```ts
import { DAILY_GAMES, type DailyGameId, type GameId } from "@/lib/games/registry";

const MS_PER_DAY = 86_400_000;

/** Whole UTC days since the Unix epoch. Matches the day boundary used by `getDateString()`. */
export function utcDayNumber(date: Date = new Date()): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

function rotationFrom(dayNumber: number): DailyGameId[] {
  const count = DAILY_GAMES.length;
  const start = ((dayNumber % count) + count) % count;
  return DAILY_GAMES.map((_, i) => DAILY_GAMES[(start + i) % count]);
}

export function featuredGameForDay(dayNumber: number): DailyGameId {
  return rotationFrom(dayNumber)[0];
}

export interface TodayView {
  /** The game in the featured slot, or null when every daily is played. */
  featured: DailyGameId | null;
  /** True when the day's featured game is already played and the slot shows the next one. */
  isUpNext: boolean;
  /** Every daily except the featured one: unplayed first, then played. */
  lineup: DailyGameId[];
  doneCount: number;
}

export function buildTodayView(dayNumber: number, played: ReadonlySet<DailyGameId>): TodayView {
  const rotation = rotationFrom(dayNumber);
  const featured = rotation.find((id) => !played.has(id)) ?? null;
  const rest = rotation.filter((id) => id !== featured);

  return {
    featured,
    isUpNext: featured !== null && featured !== rotation[0],
    lineup: [...rest.filter((id) => !played.has(id)), ...rest.filter((id) => played.has(id))],
    doneCount: rotation.filter((id) => played.has(id)).length,
  };
}

export function msUntilNextUtcDay(now: number): number {
  return MS_PER_DAY - (now % MS_PER_DAY);
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(Math.max(0, ms) / 60_000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

/** The next `count` dailies after `gameId` in rotation order, skipping `gameId` itself. */
export function otherDailies(gameId: GameId, count = 3): DailyGameId[] {
  const index = (DAILY_GAMES as readonly string[]).indexOf(gameId);
  const start = index === -1 ? 0 : index + 1;
  return DAILY_GAMES.map((_, i) => DAILY_GAMES[(start + i) % DAILY_GAMES.length])
    .filter((id) => id !== gameId)
    .slice(0, count);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/lib/games/today.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/games/today.ts tests/lib/games/today.test.ts
git commit -m "feat(games): featured rotation and lineup ordering by UTC day

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Tracking helper, completion event, and Hot Takes completion

**Files:**
- Create: `lib/analytics/track.ts`
- Create: `tests/lib/analytics/track.test.ts`
- Create: `tests/lib/streak/daily-completed.test.tsx`
- Modify: `lib/streak/context.tsx` (the `stim-streak-completed` handler, about lines 50–62)
- Modify: `components/hot-takes/game.tsx` (the "Lock in my ranking" button, about line 323, plus one import)

**Interfaces:**
- Consumes: `recordDailyCompletion(gameId, playDate?)` from `@/lib/streak/storage` (existing; dispatches the window event `stim-streak-completed` with `detail: { isNew, streak, gameId }` only when the play date is new).
- Produces: `track(event: string, props?: Record<string, string | number | boolean>): void`. It never throws.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/analytics/track.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { track } from "@/lib/analytics/track";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

describe("track", () => {
  beforeEach(() => {
    vi.mocked(posthog.capture).mockReset();
  });

  it("sends the event and its properties to PostHog", () => {
    track("home_game_clicked", { game: "chainlink", slot: "featured" });
    expect(posthog.capture).toHaveBeenCalledWith("home_game_clicked", {
      game: "chainlink",
      slot: "featured",
    });
  });

  it("never throws when capture fails", () => {
    vi.mocked(posthog.capture).mockImplementation(() => {
      throw new Error("blocked by client");
    });
    expect(() => track("home_game_clicked", { game: "chainlink" })).not.toThrow();
  });
});
```

Create `tests/lib/streak/daily-completed.test.tsx`:

```tsx
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { StreakProvider } from "@/lib/streak/context";
import { recordDailyCompletion } from "@/lib/streak/storage";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

describe("daily_completed event", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(posthog.capture).mockReset();
  });

  it("fires when a daily is completed", () => {
    render(
      <StreakProvider>
        <div />
      </StreakProvider>,
    );

    act(() => {
      recordDailyCompletion("chainlink");
    });

    expect(posthog.capture).toHaveBeenCalledWith("daily_completed", {
      game: "chainlink",
      streak: 1,
    });
  });

  it("fires once when the same daily is completed twice", () => {
    render(
      <StreakProvider>
        <div />
      </StreakProvider>,
    );

    act(() => {
      recordDailyCompletion("hot-takes");
      recordDailyCompletion("hot-takes");
    });

    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/analytics tests/lib/streak/daily-completed.test.tsx`
Expected: FAIL. `track.test.ts` cannot resolve `@/lib/analytics/track`; `daily-completed.test.tsx` fails with `capture` not called.

- [ ] **Step 3: Write the tracking helper**

Create `lib/analytics/track.ts`:

```ts
import posthog from "posthog-js";

type EventProps = Record<string, string | number | boolean>;

/** Sends a product event. Analytics must never break a click, so failures are swallowed. */
export function track(event: string, props: EventProps = {}): void {
  try {
    posthog.capture(event, props);
  } catch {
    // PostHog can be blocked or uninitialised; the action the user took still has to work.
  }
}
```

- [ ] **Step 4: Fire `daily_completed` from the streak provider**

In `lib/streak/context.tsx`, add the import:

```ts
import { track } from "@/lib/analytics/track";
```

Find the handler inside `StreakProvider`:

```ts
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StreakCompletionResult>).detail;
      refreshStreaks();
      if (!detail.isNew) return;
```

Add one line after the `isNew` check, so it reads:

```ts
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StreakCompletionResult>).detail;
      refreshStreaks();
      if (!detail.isNew) return;
      track("daily_completed", { game: detail.gameId, streak: detail.streak });
```

Leave the rest of the handler unchanged.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run tests/lib/analytics tests/lib/streak/daily-completed.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Record a completion when a Hot Takes ranking is locked in**

Hot Takes never calls `recordDailyCompletion`, so it cannot show as done and has no streak.

In `components/hot-takes/game.tsx`, add the import beside the other `@/lib` imports:

```ts
import { recordDailyCompletion } from "@/lib/streak/storage";
```

Find the lock-in button:

```tsx
            disabled={remaining !== 0 || submitted}
            onClick={() => setSubmitted(true)}
```

Replace the `onClick` so it reads:

```tsx
            disabled={remaining !== 0 || submitted}
            onClick={() => {
              setSubmitted(true);
              recordDailyCompletion("hot-takes");
            }}
```

- [ ] **Step 7: Check Hot Takes in the browser**

Run `pnpm dev`, open `http://localhost:3000/hot-takes`, place all fifteen items, and press "Lock in my ranking". Then in the browser console run:

```js
JSON.parse(localStorage.getItem("stim_daily_streaks")).games["hot-takes"].playDates
```

Expected: an array containing today's UTC date, for example `["2026-10-06"]`. A streak toast should also appear.

- [ ] **Step 8: Verify and commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add lib/analytics/track.ts lib/streak/context.tsx components/hot-takes/game.tsx tests/lib/analytics tests/lib/streak/daily-completed.test.tsx
git commit -m "feat(analytics): daily_completed event for every daily; record Hot Takes completions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Home "today" components

**Files:**
- Create: `components/home/game-card.tsx`
- Create: `components/home/today.tsx`
- Create: `tests/components/home-today.test.tsx`
- Modify: `components/daily/game-card-preview.tsx` (add a `size` prop)
- Modify: `app/globals.css` (append the "Home page" block at the end of the file)

**Interfaces:**
- Consumes: `getGame`, `DAILY_GAMES`, `GameId`, `DailyGameId`, `isDailyGame` (Task 1); `buildTodayView`, `utcDayNumber`, `msUntilNextUtcDay`, `formatCountdown` (Task 2); `track` (Task 3); `useStreak()` from `@/lib/streak/context`, which returns `{ streaks: GameStreakInfo[] }` and is an empty array until the browser has read storage.
- Produces:
  - `GameCard(props: { gameId: GameId; played?: boolean; streak?: number; cta?: string; event: "home_game_clicked" | "game_about_link_clicked"; eventProps: Record<string, string | number | boolean> })`
  - `Today(props: { dayNumber: number })`
  - `GameCardPreview(props: { gameId: DailyGameId; size?: "sm" | "lg" })`
  - Test ids: `home-featured`, `home-all-done`, `home-lineup`, `home-progress`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/home-today.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Today } from "@/components/home/today";
import { track } from "@/lib/analytics/track";
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import { featuredGameForDay, utcDayNumber } from "@/lib/games/today";
import type { GameStreakInfo } from "@/lib/streak/types";

let streaks: GameStreakInfo[] = [];

vi.mock("@/lib/streak/context", () => ({
  useStreak: () => ({ streaks }),
}));
vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const NOW = new Date("2026-10-06T15:23:00Z");
const DAY = utcDayNumber(NOW);

function streaksWithPlayed(played: DailyGameId[]): GameStreakInfo[] {
  return DAILY_GAMES.map((id) => ({
    id,
    label: getGame(id).name,
    href: getGame(id).playHref,
    currentStreak: played.includes(id) ? 3 : 0,
    playedToday: played.includes(id),
  }));
}

describe("Today", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.mocked(track).mockReset();
    streaks = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the day's featured game and six lineup cards for a first-time visitor", () => {
    render(<Today dayNumber={DAY} />);

    const featured = getGame(featuredGameForDay(DAY));
    const slot = screen.getByTestId("home-featured");
    expect(slot).toHaveTextContent("Today's featured game");
    expect(slot).toHaveTextContent(featured.name);
    expect(within(slot).getByRole("link")).toHaveAttribute("href", featured.playHref);

    expect(within(screen.getByTestId("home-lineup")).getAllByRole("link")).toHaveLength(6);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("7 new puzzles today");
  });

  it("features the next unplayed game and counts what is done", () => {
    const first = featuredGameForDay(DAY);
    const second = featuredGameForDay(DAY + 1);
    streaks = streaksWithPlayed([first, featuredGameForDay(DAY + 3)]);

    render(<Today dayNumber={DAY} />);

    const slot = screen.getByTestId("home-featured");
    expect(slot).toHaveTextContent("Up next");
    expect(slot).toHaveTextContent(getGame(second).name);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("2 of 7 done today");

    const cards = within(screen.getByTestId("home-lineup")).getAllByRole("link");
    expect(cards).toHaveLength(6);
    expect(cards[4]).toHaveTextContent("Done today");
    expect(cards[5]).toHaveTextContent("Done today");
    expect(cards[0]).not.toHaveTextContent("Done today");
  });

  it("shows the all-done state with a countdown when every daily is played", () => {
    streaks = streaksWithPlayed([...DAILY_GAMES]);

    render(<Today dayNumber={DAY} />);

    expect(screen.queryByTestId("home-featured")).toBeNull();
    const done = screen.getByTestId("home-all-done");
    expect(done).toHaveTextContent("All seven done.");
    expect(done).toHaveTextContent("New puzzles in 8h 37m");
    expect(within(done).getByRole("link")).toHaveAttribute("href", "/draft-anything");
    expect(within(screen.getByTestId("home-lineup")).getAllByRole("link")).toHaveLength(7);
    expect(screen.getByTestId("home-progress")).toHaveTextContent("7 of 7 done today");
  });

  it("corrects a stale server day number after mount", () => {
    render(<Today dayNumber={DAY - 1} />);

    expect(screen.getByTestId("home-featured")).toHaveTextContent(
      getGame(featuredGameForDay(DAY)).name,
    );
  });

  it("tracks a click on the featured game", async () => {
    vi.useRealTimers();
    const day = utcDayNumber();
    render(<Today dayNumber={day} />);

    const link = within(screen.getByTestId("home-featured")).getByRole("link");
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);

    expect(track).toHaveBeenCalledWith("home_game_clicked", {
      game: featuredGameForDay(day),
      slot: "featured",
      position: 0,
      played_today: false,
    });
  });
});
```

`@testing-library/user-event` is not installed. Install it:

```bash
pnpm add -D @testing-library/user-event
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/components/home-today.test.tsx`
Expected: FAIL, cannot resolve `@/components/home/today`.

- [ ] **Step 3: Add a size to the shared preview**

In `components/daily/game-card-preview.tsx`, change the signature and wrap the existing `switch` so the outer element carries the size. Replace:

```tsx
export function GameCardPreview({ gameId }: { gameId: DailyGameId }) {
  switch (gameId) {
```

with:

```tsx
export function GameCardPreview({
  gameId,
  size = "sm",
}: {
  gameId: DailyGameId;
  size?: "sm" | "lg";
}) {
  return (
    <div className={`od-preview-frame od-preview-frame-${size}`} aria-hidden>
      {renderPreview(gameId)}
    </div>
  );
}

function renderPreview(gameId: DailyGameId) {
  switch (gameId) {
```

The body of the `switch` and its closing braces stay exactly as they are.

- [ ] **Step 4: Write the game card**

Create `components/home/game-card.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { GameCardPreview } from "@/components/daily/game-card-preview";
import { GameTitle } from "@/components/ui/game-title";
import { track } from "@/lib/analytics/track";
import { getGame, isDailyGame, type GameId } from "@/lib/games/registry";

export interface GameCardProps {
  gameId: GameId;
  played?: boolean;
  streak?: number;
  /** Action label when the game is not played. Defaults to "Play". */
  cta?: string;
  event: "home_game_clicked" | "game_about_link_clicked";
  eventProps: Record<string, string | number | boolean>;
}

export function GameCard({
  gameId,
  played = false,
  streak = 0,
  cta = "Play",
  event,
  eventProps,
}: GameCardProps) {
  const game = getGame(gameId);

  return (
    <Link
      href={game.playHref}
      className={`home-card${played ? " is-done" : ""}`}
      style={{ "--accent": game.theme.accent } as CSSProperties}
      onClick={() => track(event, eventProps)}
    >
      <div className="home-card-body">
        <div className="home-card-row">
          <span className="home-card-kind">{game.category}</span>
          {streak > 0 ? (
            <span className="home-card-streak" aria-label={`${streak} day streak`}>
              🔥 {streak}
            </span>
          ) : null}
        </div>
        <GameTitle game={gameId} as="div" className="home-card-title" />
        <div className="home-card-blurb">{game.blurb}</div>
        <div className="home-card-act">{played ? "✓ Done today" : `${cta} →`}</div>
      </div>
      {isDailyGame(gameId) ? (
        <div className="home-card-preview">
          <GameCardPreview gameId={gameId} />
        </div>
      ) : null}
    </Link>
  );
}
```

- [ ] **Step 5: Write the `Today` component**

Create `components/home/today.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { GameCardPreview } from "@/components/daily/game-card-preview";
import { GameCard } from "@/components/home/game-card";
import { GameTitle } from "@/components/ui/game-title";
import { track } from "@/lib/analytics/track";
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import {
  buildTodayView,
  formatCountdown,
  msUntilNextUtcDay,
  utcDayNumber,
} from "@/lib/games/today";
import { useStreak } from "@/lib/streak/context";

export function Today({ dayNumber }: { dayNumber: number }) {
  const { streaks } = useStreak();
  const [day, setDay] = useState(dayNumber);
  const [now, setNow] = useState<number | null>(null);

  // The server-rendered page can be cached across midnight UTC. Trust the browser's clock.
  useEffect(() => {
    setDay(utcDayNumber());
    setNow(Date.now());
  }, []);

  const played = useMemo(
    () => new Set<DailyGameId>(streaks.filter((s) => s.playedToday).map((s) => s.id)),
    [streaks],
  );
  const streakFor = useMemo(
    () => new Map<DailyGameId, number>(streaks.map((s) => [s.id, s.currentStreak])),
    [streaks],
  );

  const view = buildTodayView(day, played);
  const featured = view.featured ? getGame(view.featured) : null;

  return (
    <>
      {featured && view.featured ? (
        <section
          className="home-featured"
          data-testid="home-featured"
          style={{ "--accent": featured.theme.accent } as CSSProperties}
        >
          <div className="home-featured-copy">
            <p className="home-kicker">
              {view.isUpNext ? "Up next" : "Today's featured game"} · {featured.category}
            </p>
            <GameTitle game={featured.id} as="h2" className="home-featured-title" />
            <p className="home-featured-pitch">{featured.pitch}</p>
            <Link
              href={featured.playHref}
              className="home-cta"
              onClick={() =>
                track("home_game_clicked", {
                  game: featured.id,
                  slot: "featured",
                  position: 0,
                  played_today: false,
                })
              }
            >
              Play today&apos;s {featured.name} →
            </Link>
          </div>
          <div className="home-featured-preview">
            <GameCardPreview gameId={view.featured} size="lg" />
          </div>
        </section>
      ) : (
        <section className="home-featured is-all-done" data-testid="home-all-done">
          <div className="home-featured-copy">
            <p className="home-kicker">Today</p>
            <h2 className="home-featured-title">All seven done.</h2>
            <p className="home-featured-pitch">
              {now === null
                ? "New puzzles arrive at midnight UTC."
                : `New puzzles in ${formatCountdown(msUntilNextUtcDay(now))}.`}{" "}
              Until then, grab some friends for a round of Draft Anything.
            </p>
            <Link
              href="/draft-anything"
              className="home-cta"
              onClick={() =>
                track("home_game_clicked", {
                  game: "draft-anything",
                  slot: "featured",
                  position: 0,
                  played_today: false,
                })
              }
            >
              Create a Draft room →
            </Link>
          </div>
          <ul className="home-streaks">
            {DAILY_GAMES.map((id) => (
              <li key={id}>
                {getGame(id).name} 🔥 {streakFor.get(id) ?? 0}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="home-section-head">
        <h2 className="home-section-label">Today&apos;s lineup</h2>
        <span className="home-section-rule" aria-hidden />
        <span className="home-progress" data-testid="home-progress">
          {view.doneCount === 0 ? "7 new puzzles today" : `${view.doneCount} of 7 done today`}
        </span>
      </div>

      <div className="home-lineup" data-testid="home-lineup">
        {view.lineup.map((id, index) => (
          <GameCard
            key={id}
            gameId={id}
            played={played.has(id)}
            streak={streakFor.get(id) ?? 0}
            event="home_game_clicked"
            eventProps={{
              game: id,
              slot: "lineup",
              position: index + 1,
              played_today: played.has(id),
            }}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 6: Add the styles**

Append to the end of `app/globals.css`:

```css
/* ── Home page ───────────────────────────────────────────────────── */

.home-page {
  min-height: 100vh;
  background: var(--bg);
  padding: 24px 16px 64px;
}
.home-inner {
  max-width: 960px;
  margin: 0 auto;
}
.home-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}
.home-header img {
  width: 44px;
  height: auto;
  flex-shrink: 0;
}
.home-header h1 {
  font-family: "Playfair Display", serif;
  font-size: clamp(34px, 7vw, 46px);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--text);
  margin: 0;
}
.home-header h1 em {
  font-style: italic;
  color: var(--gold-hi);
}
.home-tagline {
  font-size: clamp(17px, 2.6vw, 20px);
  font-weight: 600;
  color: var(--text);
  margin: 0 0 4px;
}
.home-subline {
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0 0 22px;
  max-width: 44em;
}

.home-kicker,
.home-section-label,
.home-card-kind {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin: 0;
}

.home-featured {
  --accent: var(--gold);
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 24px;
  align-items: center;
  background: var(--panel);
  border: 1.5px solid var(--border-hi);
  border-top: 4px solid var(--accent);
  border-radius: 16px;
  padding: 24px;
}
.home-featured.is-all-done {
  --accent: var(--bd-success);
}
.home-featured-title {
  font-size: clamp(34px, 6vw, 48px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 12px 0 10px;
}
.home-featured-pitch {
  font-size: 16px;
  line-height: 1.5;
  color: var(--text-dim);
  margin: 0 0 20px;
  max-width: 26em;
}
.home-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--text);
  color: var(--bg);
  font-size: 16px;
  font-weight: 600;
  padding: 14px 22px;
  border-radius: 10px;
  text-decoration: none;
  transition: opacity 0.15s;
}
.home-cta:hover {
  opacity: 0.86;
}
.home-featured-preview {
  background: var(--panel-alt);
  border-radius: 12px;
  min-height: 170px;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.home-streaks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.home-streaks li {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--panel-alt);
  border: 1px solid var(--border);
}

.home-section-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin: 34px 0 14px;
}
.home-section-rule {
  flex: 1;
  height: 1px;
  background: var(--border);
}
.home-progress {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.home-lineup {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.home-party {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 12px;
}

.home-card {
  --accent: var(--gold);
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: 12px;
  align-items: center;
  background: var(--panel);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: 12px;
  padding: 14px 16px;
  color: var(--text);
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
}
.home-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
.home-card-body {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.home-card-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.home-card-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--text);
}
.home-card-blurb {
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-dim);
}
.home-card-act {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
  margin-top: 4px;
}
.home-card-streak {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  white-space: nowrap;
}
.home-card-preview {
  width: 104px;
  height: 92px;
  background: var(--panel-alt);
  border-radius: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.home-card.is-done {
  border-left-color: var(--border-hi);
}
.home-card.is-done .home-card-title,
.home-card.is-done .home-card-preview {
  opacity: 0.6;
}
.home-card.is-done .home-card-act {
  color: var(--text-dim);
}

.home-footer {
  text-align: center;
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 44px;
  letter-spacing: 0.08em;
}

.od-preview-frame {
  display: grid;
  place-items: center;
}
.od-preview-frame-lg {
  transform: scale(1.8);
}

@media (max-width: 720px) {
  .home-featured {
    grid-template-columns: 1fr;
    padding: 20px;
    gap: 16px;
  }
  .home-featured-preview {
    min-height: 120px;
    order: -1;
  }
  .home-lineup {
    grid-template-columns: repeat(2, 1fr);
  }
  .home-party {
    grid-template-columns: 1fr;
  }
  .home-cta {
    width: 100%;
    justify-content: center;
  }
  .home-card-preview {
    display: none;
  }
}
@media (max-width: 420px) {
  .home-lineup {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm vitest run tests/components/home-today.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 8: Check the "More dailies" strip still looks right**

`GameCardPreview` now wraps its output in a frame element. Run `pnpm dev`, finish any daily (or open a daily you finished earlier today), and look at the "More dailies" strip on the completion screen. The previews should look the same as before this task. Then open the home page and confirm each lineup preview fits inside its 104×92 box; if one overflows, add `.home-card-preview .od-preview-frame { transform: scale(0.85); }`.

- [ ] **Step 9: Verify and commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add components/home components/daily/game-card-preview.tsx app/globals.css tests/components/home-today.test.tsx package.json pnpm-lock.yaml
git commit -m "feat(home): featured slot, lineup and all-done state driven by today's plays

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Home page

**Files:**
- Modify: `app/page.tsx` (replace the whole file)
- Modify: `app/globals.css` (delete styles used only by the old home page)
- Delete: `components/hot-takes/home-visual.tsx` (only if nothing else imports it)
- Create: `tests/e2e/home.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts` (add one test)

**Interfaces:**
- Consumes: `Today` and `GameCard` (Task 4); `utcDayNumber` (Task 2); `buildHomeJsonLd`, `JsonLdScript` from `@/lib/seo`.
- Produces: the home page. Nothing later depends on its internals.

- [ ] **Step 1: Write the failing end-to-end test**

Create `tests/e2e/home.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const DAILY_HREFS = [
  "/chainlink",
  "/brain-dead/daily",
  "/anyguessr/daily",
  "/hot-takes",
  "/freezeframes/daily",
  "/ball-knowledge/daily",
  "/getting-warmer/daily",
];

test.describe("Home page", () => {
  test("leads with the site name, a featured game and six lineup games", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Stim Games" })).toBeVisible();
    await expect(page.getByText("Seven free daily games. New puzzles every day.")).toBeVisible();
    await expect(page.getByTestId("home-featured")).toBeVisible();
    await expect(page.getByTestId("home-lineup").getByRole("link")).toHaveCount(6);
    await expect(page.getByTestId("home-progress")).toHaveText("7 new puzzles today");
    await expect(page.getByRole("heading", { name: "Play with friends" })).toBeVisible();
    await expect(page.getByText("Coming Soon")).toHaveCount(0);
  });

  test("the featured button opens a daily game", async ({ page }) => {
    await page.goto("/");
    const link = page.getByTestId("home-featured").getByRole("link");
    const href = await link.getAttribute("href");
    expect(DAILY_HREFS).toContain(href);

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("the raw HTML links to every daily and both party games without JavaScript", async ({ request }) => {
    const html = await (await request.get("/")).text();

    for (const href of [...DAILY_HREFS, "/draft-anything", "/slippery-slope"]) {
      expect(html, href).toContain(`href="${href}"`);
    }
    expect(html).toContain("<title>Stim Games");
  });

  test("shows finished games as done and counts them", async ({ page }) => {
    await page.addInitScript(() => {
      const today = new Date().toISOString().slice(0, 10);
      const ids = ["chainlink", "brain-dead", "anyguessr", "freezeframes", "ball-knowledge", "hot-takes", "getting-warmer"];
      const games = Object.fromEntries(ids.map((id) => [id, { playDates: id === "chainlink" || id === "anyguessr" ? [today] : [] }]));
      localStorage.setItem("stim_daily_streaks", JSON.stringify({ version: 1, games }));
    });
    await page.goto("/");

    await expect(page.getByTestId("home-progress")).toHaveText("2 of 7 done today");
    await expect(page.getByText("✓ Done today")).toHaveCount(2);
  });
});
```

Note on the last test: one of the two played games may be today's featured game, in which case the featured slot moves on and both played games sit in the lineup. Either way two cards read "Done today".

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:e2e tests/e2e/home.spec.ts`
Expected: FAIL. The first test cannot find `Seven free daily games. New puzzles every day.` or `home-featured`.

- [ ] **Step 3: Replace the home page**

Replace the whole of `app/page.tsx` with:

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import { GameCard } from "@/components/home/game-card";
import { Today } from "@/components/home/today";
import { utcDayNumber } from "@/lib/games/today";
import { buildHomeJsonLd, JsonLdScript } from "@/lib/seo";

// The featured game changes at midnight UTC. Keep the cached page close to current;
// <Today /> corrects any remaining gap from the browser's clock.
export const revalidate = 300;

const DESCRIPTION =
  "Seven free daily games: trivia, geography, word chains, pop culture and tier lists, in the style of Wordle and Connections. New puzzles every day, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: "Stim Games: Free Daily Games, New Puzzles Every Day" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Stim Games: Free Daily Games, New Puzzles Every Day",
    description: DESCRIPTION,
    url: "/",
    siteName: "Stim Games",
    type: "website",
  },
};

export default function StimGames() {
  return (
    <main className="home-page game-page">
      <JsonLdScript data={buildHomeJsonLd()} />

      <div className="home-inner">
        <header className="home-header">
          <Image
            src="/stimlabs_badge_v5.svg"
            alt="Stim Labs"
            width={44}
            height={51}
            priority
            unoptimized
          />
          <h1>
            Stim <em>Games</em>
          </h1>
        </header>
        <p className="home-tagline">Seven free daily games. New puzzles every day.</p>
        <p className="home-subline">
          Trivia, geography, word chains, pop culture and tier lists, in the style of Wordle and
          Connections. No sign-up.
        </p>

        <Today dayNumber={utcDayNumber()} />

        <div className="home-section-head">
          <h2 className="home-section-label">Play with friends</h2>
          <span className="home-section-rule" aria-hidden />
        </div>
        <div className="home-party">
          <GameCard
            gameId="draft-anything"
            cta="Create a room"
            event="home_game_clicked"
            eventProps={{ game: "draft-anything", slot: "party", position: 1, played_today: false }}
          />
          <GameCard
            gameId="slippery-slope"
            cta="Open the board"
            event="home_game_clicked"
            eventProps={{ game: "slippery-slope", slot: "party", position: 2, played_today: false }}
          />
        </div>

        <p className="home-footer">Built by Stim Labs</p>
      </div>
    </main>
  );
}
```

`<h1>Stim <em>Games</em></h1>` has the accessible name "Stim Games", which is what the test and the spec require.

- [ ] **Step 4: Run the end-to-end test to verify it passes**

Run: `pnpm test:e2e tests/e2e/home.spec.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Remove styles and components only the old home page used**

For each class prefix below, check whether anything still uses it:

```bash
for cls in stim-home-header stim-home-section stim-section-label stim-daily-grid stim-party-grid stim-party-card stim-party-title stim-party-visual stim-party-action stim-game-card stim-hero-card stim-card-title stim-card-desc stim-card-visual stim-card-action stim-card-rule stim-visual-wide stim-text-link chainlink-preview brain-dead-preview anyguessr-preview; do
  echo "== $cls: $(grep -rl "$cls" app components lib --include='*.tsx' --include='*.ts' | tr '\n' ' ')"
done
```

For every prefix with no files listed, delete all of its rule blocks from `app/globals.css`, including the copies inside `@media` blocks (the old home page styles sit roughly between the comment `/* Stim Games hero card hover */` and the start of the next unrelated section, plus the `.chainlink-preview*`, `.brain-dead-preview*` and `.anyguessr-preview*` rules). Leave any prefix that still lists a file.

Do not touch the "Shared game juice keyframes" block or anything under `/* ── Chainlink keyframes ── */`; another work stream is editing those.

Then check the old Hot Takes home visual:

```bash
grep -rn "home-visual\|HotTakesHomeVisual" app components lib
```

If the only match is the component's own file, delete it with `git rm components/hot-takes/home-visual.tsx`, and remove its CSS rules from `app/hot-takes.css` if the same grep-by-class check shows they are unused.

- [ ] **Step 6: Add the dark theme accessibility test**

In `tests/e2e/accessibility.spec.ts`, add this test directly after the existing `home page has no serious/critical axe violations` test:

```ts
  test("home page in dark theme has no serious/critical axe violations", async () => {
    await hostPage.addInitScript(() => localStorage.setItem("stim-theme", "dark"));
    await hostPage.goto("/");
    await expect(hostPage.locator("html")).toHaveAttribute("data-theme", "dark");
    await assertNoSeriousViolations(hostPage);
  });
```

- [ ] **Step 7: Run the accessibility tests**

Run: `pnpm test:e2e tests/e2e/accessibility.spec.ts -g "home page"`
Expected: both home page tests PASS. If the light-theme test failed in Task 0 Step 3, compare violation ids: no id may appear now that was not in the baseline. Fix any new one before continuing. The likely cause is body-size text in an accent colour; such text must use `--text` or `--text-dim`.

- [ ] **Step 8: Look at the page**

Run `pnpm dev` and open `http://localhost:3000/` at desktop width and at 390px wide. Compare with `.superpowers/brainstorm/70004-1791314843/content/home-lineup-v2.html` (lineup layout A). Check:

- "Stim Games" is the largest text on the page.
- The featured game and all six lineup cards are visible without scrolling on a 1440×900 window.
- Toggle the theme from the profile menu; both themes are readable.
- No horizontal scroll at 390px.

- [ ] **Step 9: Verify and commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A app/page.tsx app/globals.css app/hot-takes.css components/hot-takes tests/e2e/home.spec.ts tests/e2e/accessibility.spec.ts
git commit -m "feat(home): rebuild home page around a featured daily and today's lineup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Content model, the shared section, and Hot Takes content

**Files:**
- Create: `lib/games/content/types.ts`
- Create: `lib/games/content/hot-takes.ts`
- Create: `lib/games/content/index.ts`
- Create: `components/games/game-about.tsx`
- Create: `tests/lib/games/content.test.ts`
- Create: `tests/components/game-about.test.tsx`
- Modify: `app/globals.css` (append the "Game about" block)

**Interfaces:**
- Consumes: `getGame`, `GameId` (Task 1); `otherDailies` (Task 2); `GameCard` (Task 4); `absoluteUrl`, `JsonLdScript` from `@/lib/seo`.
- Produces:
  - `interface GameContent { angle: string; title: string; description: string; intro: string; sections: { heading: string; body: string[] }[]; faq: { question: string; answer: string }[] }`
  - `GAME_CONTENT: Partial<Record<GameId, GameContent>>` (becomes a full `Record` in Task 8)
  - `getGameContent(id: GameId): GameContent | undefined`
  - `wordCount(content: GameContent): number`
  - `gameMetadata(id: GameId): Metadata`
  - `buildFaqJsonLd(id: GameId): Record<string, unknown> | null`
  - `GameAbout(props: { gameId: GameId })`, a server component that renders nothing when the game has no content yet.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/games/content.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GAME_CONTENT, buildFaqJsonLd, gameMetadata, wordCount } from "@/lib/games/content";
import { getGame, type GameId } from "@/lib/games/registry";

const written = Object.keys(GAME_CONTENT) as GameId[];

describe("game content", () => {
  it("exists for Hot Takes", () => {
    expect(written).toContain("hot-takes");
  });

  it.each(written)("%s is between 400 and 800 words", (id) => {
    const count = wordCount(GAME_CONTENT[id]!);
    expect(count).toBeGreaterThanOrEqual(400);
    expect(count).toBeLessThanOrEqual(800);
  });

  it.each(written)("%s has the required structure", (id) => {
    const content = GAME_CONTENT[id]!;
    expect(content.angle).not.toBe("");
    expect(content.sections.length).toBeGreaterThanOrEqual(3);
    expect(content.sections.length).toBeLessThanOrEqual(5);
    expect(content.sections[0].heading).toBe("How to play");
    expect(content.faq.length).toBeGreaterThanOrEqual(4);
    expect(content.faq.length).toBeLessThanOrEqual(6);
    for (const item of content.faq) expect(item.question.trim().endsWith("?")).toBe(true);
  });

  it.each(written)("%s has a title and description sized for search results", (id) => {
    const content = GAME_CONTENT[id]!;
    expect(content.title).toContain(getGame(id).name.split(" ")[0]);
    expect(content.title.length).toBeLessThanOrEqual(60);
    expect(content.description.length).toBeGreaterThanOrEqual(70);
    expect(content.description.length).toBeLessThanOrEqual(160);
  });

  it("makes no claim about other players in Hot Takes", () => {
    const text = JSON.stringify(GAME_CONTENT["hot-takes"]).toLowerCase();
    for (const word of ["crowd", "aligned", "consensus", "other players", "community"]) {
      expect(text, word).not.toContain(word);
    }
  });
});

describe("gameMetadata", () => {
  it("uses the content title and the canonical path", () => {
    const meta = gameMetadata("hot-takes");
    expect(meta.title).toBe(GAME_CONTENT["hot-takes"]!.title);
    expect(meta.alternates?.canonical).toBe("/hot-takes");
  });
});

describe("buildFaqJsonLd", () => {
  it("builds a FAQPage with one entry per question", () => {
    const jsonLd = buildFaqJsonLd("hot-takes");
    expect(jsonLd?.["@type"]).toBe("FAQPage");
    expect(jsonLd?.mainEntity).toHaveLength(GAME_CONTENT["hot-takes"]!.faq.length);
  });
});
```

Create `tests/components/game-about.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GameAbout } from "@/components/games/game-about";
import { GAME_CONTENT } from "@/lib/games/content";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("GameAbout", () => {
  it("renders the intro, sections and questions as details", () => {
    const content = GAME_CONTENT["hot-takes"]!;
    const { container } = render(<GameAbout gameId="hot-takes" />);

    expect(screen.getByRole("heading", { level: 2, name: "About Hot Takes" })).toBeInTheDocument();
    expect(screen.getByText(content.intro)).toBeInTheDocument();

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(content.sections.length + content.faq.length);
    expect(details[0]).toHaveAttribute("open");
    expect(details[0].querySelector("summary")).toHaveTextContent("How to play");
    for (const detail of Array.from(details).slice(1)) expect(detail).not.toHaveAttribute("open");
  });

  it("links to three other dailies and back to the home page", () => {
    render(<GameAbout gameId="hot-takes" />);

    const more = screen.getByTestId("game-about-more");
    expect(within(more).getAllByRole("link")).toHaveLength(3);
    expect(within(more).queryByText("Hot Takes")).toBeNull();
    expect(screen.getByRole("link", { name: /all stim games/i })).toHaveAttribute("href", "/");
  });

  it("includes FAQ structured data", () => {
    const { container } = render(<GameAbout gameId="hot-takes" />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).toContain('"FAQPage"');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/games/content.test.ts tests/components/game-about.test.tsx`
Expected: FAIL, cannot resolve `@/lib/games/content` and `@/components/games/game-about`.

- [ ] **Step 3: Write the content type**

Create `lib/games/content/types.ts`:

```ts
export interface GameContent {
  /** The search phrase this page is written around. */
  angle: string;
  /** Page title without the site suffix; the root layout appends " | Stim Games". */
  title: string;
  /** Meta description, 70 to 160 characters. */
  description: string;
  /** Always visible. Two sentences. */
  intro: string;
  /** Three to five blocks. The first is headed "How to play". */
  sections: { heading: string; body: string[] }[];
  /** Four to six questions, phrased the way people search. */
  faq: { question: string; answer: string }[];
}
```

- [ ] **Step 4: Write the Hot Takes content**

Create `lib/games/content/hot-takes.ts`:

```ts
import type { GameContent } from "./types";

export const hotTakes: GameContent = {
  angle: "tier list daily game",
  title: "Hot Takes: Tier List Daily Game",
  description:
    "A free tier list daily game. One new category every day with fifteen items to rank from S tier to D. Play in your browser, no account needed.",
  intro:
    "Hot Takes is a tier list daily game. Every day there is one category with fifteen items, and your job is to sort all of them from S tier down to D.",
  sections: [
    {
      heading: "How to play",
      body: [
        "Each day's puzzle is a single category, such as a type of food, a set of films or a list of everyday objects, with fifteen items in it. All fifteen start in a tray at the bottom of the screen.",
        "Move every item into one of five tiers: S, A, B, C or D. S is the top tier, for the items you would defend to anyone. D is the bottom. You can drag an item into a tier, or tap the item and then tap the tier you want.",
        "Nothing is final while you are sorting. Move items between tiers, or back to the tray, as often as you like. When the tray is empty, the Lock in my ranking button becomes active. Once you lock in, the ranking cannot be changed.",
      ],
    },
    {
      heading: "What the tiers mean",
      body: [
        "Tier lists come from video game communities, where players sort characters by strength. S ranks above A, a convention borrowed from Japanese video games, where S marks a grade better than A. The format has since spread to everything from fast food to film franchises.",
        "There is no rule for how many items go in each tier. You can put ten things in S and one in D, or spread them evenly. A list where everything lands in B says something too. The only requirement is that all fifteen items are placed before you lock in.",
      ],
    },
    {
      heading: "Tips for a ranking you can defend",
      body: [
        "Start with the extremes. Pick the one or two items that are obviously S and the one or two that are obviously D, then fill in the middle. The middle tiers are where the arguments are.",
        "Decide what you are ranking by before you begin. Taste, usefulness, nostalgia and quality give four different lists from the same fifteen items. Pick one and stay with it.",
        "Use the whole scale. A ranking with nothing in D is a ranking that avoided the hard calls.",
      ],
    },
    {
      heading: "Playing with friends",
      body: [
        "Because the category is the same for everybody on a given day, Hot Takes works well as a group argument. Lock in your ranking, send the category to a group chat, and compare where each of you put the same item. One person's S tier is reliably another person's D.",
        "For a longer session with a judge and a winner, try Draft Anything, where friends draft picks from any topic and defend them.",
      ],
    },
  ],
  faq: [
    {
      question: "Is there a daily tier list game?",
      answer:
        "Yes. Hot Takes gives you one new category with fifteen items every day. You rank them from S tier to D and lock in your list.",
    },
    {
      question: "Is Hot Takes free?",
      answer:
        "Yes. It runs in your browser. There is nothing to download and you do not need an account to play.",
    },
    {
      question: "Is Hot Takes a blind ranking game?",
      answer:
        "No. In a blind ranking game you place each item before seeing the next one. In Hot Takes you can see all fifteen items from the start and rearrange them freely until you lock in.",
    },
    {
      question: "Can I change my ranking after I lock it in?",
      answer:
        "No. Locking in is final for that day's category. Until then you can move any item as many times as you like.",
    },
    {
      question: "How many items go in each tier?",
      answer:
        "As many as you want. The only rule is that every item has to be placed in a tier before you can lock in.",
    },
  ],
};
```

- [ ] **Step 5: Write the content index**

Create `lib/games/content/index.ts`:

```ts
import type { Metadata } from "next";
import { getGame, type GameId } from "@/lib/games/registry";
import { absoluteUrl } from "@/lib/seo";
import { hotTakes } from "./hot-takes";
import type { GameContent } from "./types";

export type { GameContent };

export const GAME_CONTENT: Partial<Record<GameId, GameContent>> = {
  "hot-takes": hotTakes,
};

export function getGameContent(id: GameId): GameContent | undefined {
  return GAME_CONTENT[id];
}

export function wordCount(content: GameContent): number {
  const text = [
    content.intro,
    ...content.sections.flatMap((section) => [section.heading, ...section.body]),
    ...content.faq.flatMap((item) => [item.question, item.answer]),
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function gameMetadata(id: GameId): Metadata {
  const game = getGame(id);
  const content = getGameContent(id);
  const title = content?.title ?? game.name;
  const description = content?.description ?? game.seo.description;

  return {
    title,
    description,
    alternates: { canonical: game.canonicalPath },
    openGraph: { title, description, url: game.canonicalPath, siteName: "Stim Games", type: "website" },
  };
}

export function buildFaqJsonLd(id: GameId): Record<string, unknown> | null {
  const content = getGameContent(id);
  if (!content) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": absoluteUrl(`${getGame(id).canonicalPath}#faq`),
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
```

- [ ] **Step 6: Write the shared section**

Create `components/games/game-about.tsx`:

```tsx
import type { CSSProperties } from "react";
import Link from "next/link";
import { GameCard } from "@/components/home/game-card";
import { buildFaqJsonLd, getGameContent } from "@/lib/games/content";
import { getGame, type GameId } from "@/lib/games/registry";
import { otherDailies } from "@/lib/games/today";
import { JsonLdScript } from "@/lib/seo";

/** Descriptive content shown beneath a game. Renders nothing until the game has content. */
export function GameAbout({ gameId }: { gameId: GameId }) {
  const content = getGameContent(gameId);
  if (!content) return null;

  const game = getGame(gameId);
  const faqJsonLd = buildFaqJsonLd(gameId);
  const headingId = `about-${gameId}`;

  return (
    <section
      className="game-about"
      aria-labelledby={headingId}
      style={
        {
          "--ga-page": game.theme.page,
          "--ga-text": game.theme.text,
          "--ga-muted": game.theme.muted,
          "--ga-border": game.theme.border,
        } as CSSProperties
      }
    >
      <div className="game-about-inner">
        <h2 id={headingId}>About {game.name}</h2>
        <p className="game-about-intro">{content.intro}</p>

        {content.sections.map((section, index) => (
          <details key={section.heading} open={index === 0}>
            <summary>{section.heading}</summary>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </details>
        ))}

        <h3>More daily games</h3>
        <div className="game-about-more" data-testid="game-about-more">
          {otherDailies(gameId).map((otherId) => (
            <GameCard
              key={otherId}
              gameId={otherId}
              event="game_about_link_clicked"
              eventProps={{ from_game: gameId, to_game: otherId }}
            />
          ))}
        </div>
        <Link href="/" className="game-about-home">
          All Stim Games →
        </Link>

        <h3>Questions</h3>
        {content.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      {faqJsonLd ? <JsonLdScript data={faqJsonLd} /> : null}
    </section>
  );
}
```

- [ ] **Step 7: Add the styles**

Append to the end of `app/globals.css`:

```css
/* ── Game about (shared section below each game) ─────────────────── */

.game-about {
  background: var(--ga-page, var(--bg));
  color: var(--ga-text, var(--text));
  border-top: 1px solid var(--ga-border, var(--border));
  padding: 32px 16px 72px;
  font-family: "Outfit", system-ui, sans-serif;
}
.game-about-inner {
  max-width: 640px;
  margin: 0 auto;
}
.game-about h2 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 10px;
}
.game-about h3 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ga-muted, var(--text-dim));
  margin: 32px 0 12px;
}
.game-about-intro {
  font-size: 16px;
  line-height: 1.55;
  margin: 0 0 14px;
}
.game-about details {
  border-bottom: 1px solid var(--ga-border, var(--border));
  padding: 12px 0;
}
.game-about summary {
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.game-about details p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ga-muted, var(--text-dim));
  margin: 8px 0 0;
}
.game-about-more {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.game-about-more .home-card-preview {
  display: none;
}
.game-about-home {
  display: inline-block;
  margin-top: 14px;
  font-size: 14px;
  font-weight: 600;
  color: inherit;
}
@media (max-width: 560px) {
  .game-about-more {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `pnpm vitest run tests/lib/games/content.test.ts tests/components/game-about.test.tsx`
Expected: PASS. If the word-count test fails, adjust the Hot Takes copy until it is between 400 and 800 words; do not change the limits.

- [ ] **Step 9: Verify and commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add lib/games/content components/games app/globals.css tests/lib/games/content.test.ts tests/components/game-about.test.tsx
git commit -m "feat(games): shared about section with collapsed content and FAQ; Hot Takes content

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Put the section and the new titles on every game page

`GameAbout` renders nothing for a game with no content, so all nine pages are wired now and each one starts showing its section as its content file lands in Task 8.

**Files:**
- Modify: `app/chainlink/page.tsx`, `app/chainlink/layout.tsx`
- Modify: `app/hot-takes/page.tsx`, `app/hot-takes/layout.tsx`
- Modify: `app/anyguessr/layout.tsx`
- Modify: `app/freezeframes/daily/page.tsx`
- Modify: `app/ball-knowledge/daily/page.tsx`, `app/ball-knowledge/layout.tsx`
- Modify: `app/getting-warmer/daily/page.tsx`
- Modify: `app/slippery-slope/page.tsx`
- Move: `app/brain-dead/page.tsx` → `components/brain-dead/menu.tsx`; create a new `app/brain-dead/page.tsx`; modify `app/brain-dead/layout.tsx` and `app/brain-dead/daily/layout.tsx`
- Move: `app/draft-anything/page.tsx` → `components/lobby/draft-lobby-page.tsx`; create a new `app/draft-anything/page.tsx`; modify `app/draft-anything/layout.tsx`
- Create: `tests/e2e/game-about.spec.ts`

**Interfaces:**
- Consumes: `GameAbout` and `gameMetadata` (Task 6).
- Produces: nothing new.

- [ ] **Step 1: Write the failing end-to-end test**

Create `tests/e2e/game-about.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("About section below a game", () => {
  test("is in the raw HTML of the Hot Takes page, collapsed, with its questions", async ({ request }) => {
    const html = await (await request.get("/hot-takes")).text();

    expect(html).toContain("About Hot Takes");
    expect(html).toContain("<details open");
    expect(html).toContain("Is there a daily tier list game?");
    expect(html).toContain("Locking in is final for that day");
    expect(html).toContain('"FAQPage"');
    expect(html).toContain("<title>Hot Takes: Tier List Daily Game | Stim Games</title>");
  });

  test("sits below the game and links to other dailies", async ({ page }) => {
    await page.goto("/hot-takes");

    const about = page.getByRole("region", { name: "About Hot Takes" });
    await expect(about).toBeVisible();
    await expect(about.getByTestId("game-about-more").getByRole("link")).toHaveCount(3);

    const box = await about.boundingBox();
    expect(box!.y).toBeGreaterThan(300);
  });
});
```

`/hot-takes` reads today's category from the database on the server, so local Supabase must be running and seeded (`pnpm db:start`).

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:e2e tests/e2e/game-about.spec.ts`
Expected: FAIL, the HTML does not contain "About Hot Takes".

- [ ] **Step 3: Chain Link**

In `app/chainlink/page.tsx`, add the import and render the section after `</main>` inside a fragment:

```tsx
import ChainlinkGame from "@/components/chainlink/game";
import { GameAbout } from "@/components/games/game-about";

export default function ChainlinkPage() {
  return (
    <>
      <main
        className="game-page"
        style={{
          minHeight: "100vh",
          background: "var(--cl-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 20px 64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", maxWidth: "560px", position: "relative", zIndex: 1 }}>
          <ChainlinkGame mode="daily" />
        </div>
      </main>
      <GameAbout gameId="chainlink" />
    </>
  );
}
```

In `app/chainlink/layout.tsx`, replace the `metadata` constant and its imports:

```tsx
import type { Metadata } from "next";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("chainlink");
```

The layout component below it is unchanged.

- [ ] **Step 4: Hot Takes**

Replace `app/hot-takes/page.tsx` with:

```tsx
import { GameAbout } from "@/components/games/game-about";
import HotTakesGame from "@/components/hot-takes/game";
import { getDailyCategoryForPlay } from "@/lib/hot-takes/daily-service";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function HotTakesPage() {
  const db = createAdminClient();
  const category = await getDailyCategoryForPlay(db);
  return (
    <>
      <HotTakesGame initialCategory={category} />
      <GameAbout gameId="hot-takes" />
    </>
  );
}
```

The page's own `metadata` export is removed; the layout now supplies it. In `app/hot-takes/layout.tsx`, replace the `metadata` constant and imports:

```tsx
import type { Metadata } from "next";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("hot-takes");
```

- [ ] **Step 5: AnyGuessr**

The canonical address is `/anyguessr` and the game is played at `/anyguessr/daily`. The layout covers both. Replace `app/anyguessr/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { GameAbout } from "@/components/games/game-about";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("anyguessr");

export default function AnyGuessrLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("anyguessr")} />
      {children}
      <GameAbout gameId="anyguessr" />
    </>
  );
}
```

- [ ] **Step 6: FreezeFrames**

Replace `app/freezeframes/daily/page.tsx` with:

```tsx
import type { Metadata } from "next";
import FreezeFramesGame from "@/components/freezeframes/game";
import { GameAbout } from "@/components/games/game-about";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("freezeframes");

export default function FreezeFramesDailyPage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("freezeframes")} />
      <FreezeFramesGame />
      <GameAbout gameId="freezeframes" />
    </>
  );
}
```

- [ ] **Step 7: Ball Knowledge**

In `app/ball-knowledge/daily/page.tsx`, delete the `metadata` export and its `Metadata` import, add `import { GameAbout } from "@/components/games/game-about";`, and change the return to:

```tsx
  return (
    <>
      <BallKnowledgeGame category={category} />
      <GameAbout gameId="ball-knowledge" />
    </>
  );
```

In `app/ball-knowledge/layout.tsx`, replace the `metadata` constant and imports:

```tsx
import type { Metadata } from "next";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("ball-knowledge");
```

- [ ] **Step 8: Getting Warmer**

Replace `app/getting-warmer/daily/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { GameAbout } from "@/components/games/game-about";
import GettingWarmerGame from "@/components/getting-warmer/game";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("getting-warmer");

export default function GettingWarmerDailyPage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("getting-warmer")} />
      <GettingWarmerGame />
      <GameAbout gameId="getting-warmer" />
    </>
  );
}
```

- [ ] **Step 9: Slippery Slope**

Replace `app/slippery-slope/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { GameAbout } from "@/components/games/game-about";
import SlipperySlopeGame from "@/components/slippery-slope/game";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("slippery-slope");

export default function SlipperySlopePage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("slippery-slope")} />
      <SlipperySlopeGame />
      <GameAbout gameId="slippery-slope" />
    </>
  );
}
```

- [ ] **Step 10: Brain Dead**

`app/brain-dead/page.tsx` is a client component, so a server component cannot be rendered inside it. Move its body into a component file unchanged, then make the page a server component.

```bash
git mv app/brain-dead/page.tsx components/brain-dead/menu.tsx
```

In `components/brain-dead/menu.tsx`, change only the export line:

```tsx
export default function BrainDeadPage() {
```

to:

```tsx
export function BrainDeadMenu() {
```

Create `app/brain-dead/page.tsx`:

```tsx
import { BrainDeadMenu } from "@/components/brain-dead/menu";
import { GameAbout } from "@/components/games/game-about";

export default function BrainDeadPage() {
  return (
    <>
      <BrainDeadMenu />
      <GameAbout gameId="brain-dead" />
    </>
  );
}
```

In `app/brain-dead/layout.tsx`, replace the `metadata` constant and imports:

```tsx
import type { Metadata } from "next";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("brain-dead");
```

In `app/brain-dead/daily/layout.tsx`, the title currently ends in "— Stim Labs" and would gain a second suffix from the root template. Change the `metadata` constant to:

```tsx
export const metadata: Metadata = {
  title: "Brain Dead Daily",
  description: "Today's Brain Dead trivia challenge. One wrong answer and you're out.",
};
```

- [ ] **Step 11: Draft Anything**

```bash
git mv app/draft-anything/page.tsx components/lobby/draft-lobby-page.tsx
```

In `components/lobby/draft-lobby-page.tsx`, change only the export line:

```tsx
export default function DraftAnythingLobby() {
```

to:

```tsx
export function DraftLobbyPage() {
```

Create `app/draft-anything/page.tsx`:

```tsx
import { GameAbout } from "@/components/games/game-about";
import { DraftLobbyPage } from "@/components/lobby/draft-lobby-page";

export default function DraftAnythingPage() {
  return (
    <>
      <DraftLobbyPage />
      <GameAbout gameId="draft-anything" />
    </>
  );
}
```

In `app/draft-anything/layout.tsx`, replace the `metadata` constant and imports:

```tsx
import type { Metadata } from "next";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("draft-anything");
```

- [ ] **Step 12: Run the end-to-end test to verify it passes**

Run: `pnpm test:e2e tests/e2e/game-about.spec.ts`
Expected: PASS, 2 tests.

- [ ] **Step 13: Look at each page**

Run `pnpm dev` and open each of the nine addresses in the placement table of the spec (section 3). For each one confirm the game still loads and plays exactly as before. Only `/hot-takes` shows the About section at this point; the others show nothing extra. On `/hot-takes`, scroll down and confirm the section's background and text match the game's theme in both light and dark.

- [ ] **Step 14: Verify and commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add -A app components tests/e2e/game-about.spec.ts
git commit -m "feat(games): render the about section and angle-based titles on every game page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Content for the remaining eight games

Each game gets one file exporting a `GameContent`, registered in `lib/games/content/index.ts`. The tests from Task 6 run against every registered game, so each file is checked for length and structure as it is added.

**Files:**
- Create: `lib/games/content/freezeframes.ts`, `ball-knowledge.ts`, `brain-dead.ts`, `chainlink.ts`, `getting-warmer.ts`, `anyguessr.ts`, `draft-anything.ts`, `slippery-slope.ts`
- Modify: `lib/games/content/index.ts`
- Modify: `tests/lib/games/content.test.ts`

**Interfaces:**
- Consumes: `GameContent` type and the `GAME_CONTENT` map (Task 6).
- Produces: `GAME_CONTENT` as a full `Record<GameId, GameContent>`.

**Writing rules for every file (these are requirements, not suggestions):**

- Follow the shape of `lib/games/content/hot-takes.ts` exactly: `angle`, `title`, `description`, `intro` (two sentences), three to five `sections` with the first headed `How to play`, four to six `faq` items.
- `angle`, `title` and the required questions are given below. Use them verbatim.
- Use the angle phrase once in the intro and once in a FAQ answer. Do not repeat it in every paragraph.
- Use each "supporting phrase" once, in a section heading, a section paragraph or a question, where it reads naturally.
- State only what the facts list says. Before writing, open the listed source files and confirm each fact still holds. If a fact is wrong, write what the code does and note the difference in the commit message.
- Plain words. No exclamation marks. No claims of being the best. No play-time estimates. Do not name a competitor's product except where a required question does.
- Every game: free, runs in the browser, no account needed, one puzzle per UTC day for dailies. Say "every day"; do not state a clock time.

For each game: write the file, register it, run the content test, commit.

- [ ] **Step 1: FreezeFrames**

Sources: `components/freezeframes/game.tsx` (the how-it-works rules array), `lib/freezeframes/rounds.ts`, `lib/freezeframes/game-logic.ts`.

Facts: four rounds a day, the same for all players. Round one, name the movie from a single frame. Round two, name the song from a 20-second clip. Round three, name the TV show from a frame. Round four, name the artist from an album cover. You type your guess; close spellings and partial matches count. Each wrong guess costs points and the clock keeps draining the score, so faster is better. A round can be skipped. One run per day. There is a daily leaderboard at `/freezeframes/leaderboard`.

- `angle`: `guess the movie, song, TV show and album daily game`
- `title`: `FreezeFrames: Guess the Movie, Song, TV Show and Album`
- Sections: `How to play`; `The four rounds` (one paragraph per round, so each medium has its own text); `How scoring works`; `Tips`.
- Supporting phrases: `guess the movie by frame`, `movie guessing game like Wordle`, `guess the song daily game`, `guess the TV show by frame`, `guess the album cover game`.
- Required questions: `Is there a daily game where you guess the movie from a frame?`, `How long is the song clip?`, `Do I have to spell the title exactly?`, `Is FreezeFrames free?`, `Can I play more than once a day?`

Register it: in `lib/games/content/index.ts` add `import { freezeframes } from "./freezeframes";` and the entry `freezeframes,` to `GAME_CONTENT`.

Run: `pnpm vitest run tests/lib/games/content.test.ts`
Expected: PASS, with `freezeframes` now appearing in the per-game cases.

```bash
git add lib/games/content
git commit -m "content(freezeframes): about section copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Ball Knowledge**

Sources: `components/ball-knowledge/game.tsx` (rules array), `lib/ball-knowledge/game-logic.ts`, `app/api/ball-knowledge/judge/route.ts`.

Facts: one category a day, the same for all players; examples used in the game's own text are pizza toppings, dog breeds and state capitals. 60 seconds on the clock. Type an answer and press enter. Accepted answers stack in a list; duplicates and wrong guesses are rejected. Spelling does not have to be perfect, but the answer has to be real; obscure or joke answers are rejected. One run per day, then your score is posted. The categories are general knowledge, not sports.

- `angle`: `name as many as you can game`
- `title`: `Name As Many As You Can Game: Ball Knowledge`
- Sections: `How to play`; `What counts as an answer`; `Tips for a higher score`; `Why it is called Ball Knowledge` (say plainly that "ball knowledge" is slang for knowing your subject, it started in sports, and this game applies it to any category; the daily categories are not sports quizzes).
- Supporting phrases: `name as many as you can categories`, `name 5 things game`, `60-second category game`.
- Required questions: `Is Ball Knowledge a sports quiz?`, `How long do I get?`, `Does spelling matter?`, `What kinds of categories are there?`, `Is Ball Knowledge free?`

Register `"ball-knowledge": ballKnowledge,` (export name `ballKnowledge`), run the content test, commit as `content(ball-knowledge): about section copy`.

- [ ] **Step 3: Brain Dead**

Sources: `components/brain-dead/game.tsx` (rules array), `components/brain-dead/menu.tsx`, `components/brain-dead/freeplay-picker.tsx`.

Facts: the daily is 15 questions, the same set for all players. A wrong answer or running out of time on a question ends the run. Harder questions are worth more points; faster correct answers earn a bonus. One daily run per day. Free play, with a choice of categories, is at `/brain-dead/freeplay` and can be played any number of times. Leaderboards are at `/brain-dead/leaderboard`.

- `angle`: `daily trivia game`
- `title`: `Brain Dead: Daily Trivia Game`
- Sections: `How to play`; `How scoring works`; `Daily and free play`; `Tips for a longer run`.
- Supporting phrases: `daily trivia games like Wordle`, `daily quiz game`, `one wrong answer ends your run`.
- Required questions: `What happens when I get a question wrong?`, `How many questions are in the daily?`, `Is there a time limit?`, `Can I play more than once a day?`, `Is Brain Dead free?`

Register `"brain-dead": brainDead,`, run the content test, commit as `content(brain-dead): about section copy`.

- [ ] **Step 4: Chain Link**

Sources: `components/chainlink/tutorial-modal.tsx`, `components/chainlink/game.tsx`.

Facts: a chain of words where each word pairs with the one before it to form a common phrase (the tutorial's example is snow, ball, park: snowball, ballpark). The first word is given. You guess the next words one at a time and see only the first letter of the current word until you solve it. Each wrong guess reveals one more letter. You can be wrong three times on a word; a fourth wrong guess loses the puzzle. One daily chain, the same for all players. Your results are at `/chainlink/stats`.

- `angle`: `daily word chain game`
- `title`: `Chain Link: Daily Word Chain Game`
- Sections: `How to play`; `A worked example` (walk through snow, ball, park); `Tips for hard links`.
- Supporting phrases: `chain link game`, `word chain puzzle`, `word link game`, `word chain game today`.
- Required questions: `How does the chain link game work?`, `How many wrong guesses do I get?`, `Is there a new word chain every day?`, `Do the words have to be compound words?` (answer: no, any common two-word phrase or compound counts), `Is Chain Link free?`

Register `chainlink,`, run the content test, commit as `content(chainlink): about section copy`.

- [ ] **Step 5: Getting Warmer**

Sources: `components/getting-warmer/game.tsx` (rules array), `lib/getting-warmer/`.

Facts: the answer is a secret word or phrase. You start with two clues. Guesses are unlimited. Every miss reveals another clue. If the written clues run out, more hints are produced, with letter reveals as a backup. The leaderboard ranks by fewest guesses. One puzzle a day.

- `angle`: `guess the word from clues game`
- `title`: `Getting Warmer: Guess the Word From Clues Game`
- Sections: `How to play`; `How the clues work`; `Tips for fewer guesses`.
- Supporting phrases: `guess the word game with clues`, `daily word clue game`, `getting warmer word game`.
- Required questions: `How many guesses do I get?`, `What happens if I run out of clues?`, `Is Getting Warmer a hot and cold word game?` (answer: no; hot and cold games score how close in meaning each guess is, while this one gives you a new written clue after each miss), `How is the leaderboard ranked?`, `Is Getting Warmer free?`

Register `"getting-warmer": gettingWarmer,`, run the content test, commit as `content(getting-warmer): about section copy`.

- [ ] **Step 6: AnyGuessr**

Sources: `components/anyguessr/game.tsx` (rules array and `DAILY_ROUND_COUNT`), `lib/anyguessr/`.

Facts: confirm the round count from `DAILY_ROUND_COUNT` (the in-game text says ten). Each round shows a different kind of clue about a country: flag, currency, jersey, landmark, food and more. You tap the map and pick the country. One guess per round. Points depend on how close the guess is: full points for the right country, partial credit for nearby ones. One run per day, the same puzzle for all players. There is no street-view imagery.

- `angle`: `guess the country from clues`
- `title`: `AnyGuessr: Guess the Country From Clues`
- Sections: `How to play`; `The kinds of clue`; `How scoring works`; `Tips`.
- Supporting phrases: `country guessing game daily`, `country guessing game like Wordle`, `daily geography game`, `guess the country by flag`.
- Required questions: `How many countries are in each daily puzzle?`, `Do I get points for a near miss?`, `Is AnyGuessr like GeoGuessr?` (answer: both are geography guessing games, but AnyGuessr uses clues such as flags and currencies and has no street-view imagery), `Can I play more than once a day?`, `Is AnyGuessr free?`

Register `anyguessr,`, run the content test, commit as `content(anyguessr): about section copy`.

- [ ] **Step 7: Draft Anything**

Sources: `components/lobby/create-room-form.tsx`, `components/lobby/lobby-config-form.tsx`, `components/lobby/hot-categories.ts`, `README.md`, `docs/superpowers/specs/2026-06-15-draft-anything-mvp-design.md`.

Facts to confirm in those files before writing: 2 to 6 players; 1 to 10 rounds; a host creates a room and shares a room code; no account needed; the topic can be anything; players take turns drafting picks; picks are then defended; judging is by AI, by player vote, or a hybrid, chosen when the room is created; a turn timer is optional; a rematch can be started from the results screen. Take five or six example topics from `components/lobby/hot-categories.ts` for the ideas section.

- `angle`: `draft anything with friends online`
- `title`: `Draft Anything With Friends Online`
- Sections: `How to play`; `How judging works`; `Fun draft ideas with friends` (a short paragraph and the example topics from `hot-categories.ts`); `Setting up a room`.
- Supporting phrases: `draft anything website`, `fun draft ideas with friends`, `good draft topics`.
- Required questions: `How many people can play Draft Anything?`, `Do we need accounts?`, `What can we draft?`, `Who decides the winner?`, `Is Draft Anything free?`

Register `"draft-anything": draftAnything,`, run the content test, commit as `content(draft-anything): about section copy`.

- [ ] **Step 8: Slippery Slope**

Sources: `components/slippery-slope/game.tsx`, `components/slippery-slope/multiplayer-game.tsx`, `components/slippery-slope/lobby.tsx`, `components/slippery-slope/board-utils.ts`, `components/slippery-slope/data.ts`.

No verified fact list exists for this game. Read the five source files first and write down, in the commit message body, the facts you used: board size, how a correct and a wrong answer move you, what wagers do, how slides and climbs work, how a game ends, solo versus multiplayer, and how a room is joined. Write only from those facts.

- `angle`: `trivia game with friends online`
- `title`: `Slippery Slope: Trivia Game With Friends Online`
- Sections: `How to play`; `Wagers, climbs and slides`; `Solo and multiplayer`.
- Supporting phrases: `snakes and ladders trivia`, `snakes and ladders quiz game`, `free online trivia with friends`.
- Required questions: `Is Slippery Slope like snakes and ladders?`, `Can I play on my own?`, `How do friends join my game?`, `Do we need accounts?`, `Is Slippery Slope free?`

Register `"slippery-slope": slipperySlope,`, run the content test, commit as `content(slippery-slope): about section copy`.

- [ ] **Step 9: Require content for every game**

In `lib/games/content/index.ts`, change the type of the map from `Partial<Record<GameId, GameContent>>` to `Record<GameId, GameContent>`, change `getGameContent` to return `GameContent`, and simplify the callers that handled `undefined`:

```ts
export const GAME_CONTENT: Record<GameId, GameContent> = {
  chainlink,
  "brain-dead": brainDead,
  anyguessr,
  "hot-takes": hotTakes,
  freezeframes,
  "ball-knowledge": ballKnowledge,
  "getting-warmer": gettingWarmer,
  "draft-anything": draftAnything,
  "slippery-slope": slipperySlope,
};

export function getGameContent(id: GameId): GameContent {
  return GAME_CONTENT[id];
}
```

In `gameMetadata`, replace `content?.title ?? game.name` with `content.title` and `content?.description ?? game.seo.description` with `content.description`. In `buildFaqJsonLd`, remove the `if (!content) return null;` line and change the return type to `Record<string, unknown>`. In `components/games/game-about.tsx`, remove `if (!content) return null;` and render `<JsonLdScript data={faqJsonLd} />` unconditionally. In `tests/lib/games/content.test.ts`, remove the `!` after each `GAME_CONTENT[id]` and the `?.` in the `buildFaqJsonLd` test, and add:

```ts
import { GAME_IDS } from "@/lib/games/registry";

it("exists for every game", () => {
  expect(written.sort()).toEqual([...GAME_IDS].sort());
});
```

Run: `pnpm vitest run tests/lib/games/content.test.ts tests/components/game-about.test.tsx`
Expected: PASS for all nine games.

- [ ] **Step 10: Verify and commit**

Run: `pnpm verify`
Expected: PASS.

```bash
git add lib/games/content components/games/game-about.tsx tests/lib/games/content.test.ts
git commit -m "feat(games): require about content for every game

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Share buttons on every daily

Every daily's finish screen gets the same share button. On a touch device with the Web Share API it opens the share sheet; otherwise it copies the text and shows "Copied".

**Files:**
- Create: `lib/share/share-text.ts`
- Create: `components/daily/share-result.tsx`
- Create: `tests/lib/share/share-text.test.ts`
- Create: `tests/components/share-result.test.tsx`
- Modify: `components/chainlink/game.tsx`, `components/brain-dead/game.tsx`, `components/anyguessr/results.tsx`, `components/freezeframes/game.tsx`, `components/ball-knowledge/game.tsx`, `components/hot-takes/game.tsx`, `components/getting-warmer/results-modal.tsx` (finish screens only)
- Modify: `app/globals.css` (append the "Share result" block)

**Interfaces:**
- Consumes: `getGame`, `DailyGameId` (Task 1); `track` (Task 3); `absoluteUrl` from `@/lib/seo`; `getDateString` from `@/lib/streak/date`.
- Produces:
  - `formatShareDate(dateString: string): string` (`"2026-10-06"` → `"Oct 6"`)
  - `shareUrl(gameId: DailyGameId): string` (the game's play address with `?ref=share`)
  - `buildShareText(input: { gameId: DailyGameId; label: string; lines: string[] }): string`
  - `squares(values: Array<"good" | "ok" | "bad">): string` (🟩 / 🟨 / 🟥)
  - `ShareResult(props: { gameId: DailyGameId; text: string })`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/share/share-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildShareText, formatShareDate, shareUrl, squares } from "@/lib/share/share-text";

describe("share text", () => {
  it("formats a puzzle date without the year", () => {
    expect(formatShareDate("2026-10-06")).toBe("Oct 6");
    expect(formatShareDate("2026-01-31")).toBe("Jan 31");
  });

  it("links to where the game is played, marked as a share", () => {
    expect(shareUrl("chainlink")).toBe("https://stimgames.com/chainlink?ref=share");
    expect(shareUrl("brain-dead")).toBe("https://stimgames.com/brain-dead/daily?ref=share");
  });

  it("puts the game name and label first and the link last", () => {
    const text = buildShareText({ gameId: "brain-dead", label: "Oct 6", lines: ["11 of 15 · 4,250 pts"] });
    expect(text.split("\n")).toEqual([
      "Brain Dead · Oct 6",
      "11 of 15 · 4,250 pts",
      "https://stimgames.com/brain-dead/daily?ref=share",
    ]);
  });

  it("drops empty lines", () => {
    const text = buildShareText({ gameId: "chainlink", label: "Oct 6", lines: ["", "🟩🟩"] });
    expect(text.split("\n")).toHaveLength(3);
  });

  it("draws one square per value", () => {
    expect(squares(["good", "ok", "bad"])).toBe("🟩🟨🟥");
  });
});
```

Create `tests/components/share-result.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareResult } from "@/components/daily/share-result";
import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

function setPointer(coarse: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: coarse }) as unknown as typeof window.matchMedia;
}

describe("ShareResult", () => {
  beforeEach(() => {
    vi.mocked(track).mockReset();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "share");
  });

  it("copies the text on a computer and confirms it", async () => {
    const user = userEvent.setup();
    setPointer(false);
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    render(<ShareResult gameId="chainlink" text="Chain Link · Oct 6" />);

    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect(writeText).toHaveBeenCalledWith("Chain Link · Oct 6");
    expect(await screen.findByText("Copied")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("result_shared", { game: "chainlink", method: "copy" });
  });

  it("opens the share sheet on a touch device", async () => {
    const user = userEvent.setup();
    setPointer(true);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<ShareResult gameId="hot-takes" text="Hot Takes · Pizza toppings" />);

    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect(share).toHaveBeenCalledWith({ text: "Hot Takes · Pizza toppings" });
    expect(track).toHaveBeenCalledWith("result_shared", { game: "hot-takes", method: "share" });
  });

  it("does not count a share the person cancelled", async () => {
    const user = userEvent.setup();
    setPointer(true);
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<ShareResult gameId="hot-takes" text="x" />);

    await user.click(screen.getByRole("button", { name: "Share result" }));

    expect(track).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run tests/lib/share tests/components/share-result.test.tsx`
Expected: FAIL, cannot resolve `@/lib/share/share-text` and `@/components/daily/share-result`.

- [ ] **Step 3: Write the share text helpers**

Create `lib/share/share-text.ts`:

```ts
import { getGame, type DailyGameId } from "@/lib/games/registry";
import { absoluteUrl } from "@/lib/seo";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-06" → "Oct 6". Takes the puzzle's own date string, so no timezone maths. */
export function formatShareDate(dateString: string): string {
  const [, month, day] = dateString.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function shareUrl(gameId: DailyGameId): string {
  return `${absoluteUrl(getGame(gameId).playHref)}?ref=share`;
}

export function buildShareText(input: { gameId: DailyGameId; label: string; lines: string[] }): string {
  return [
    `${getGame(input.gameId).name} · ${input.label}`,
    ...input.lines.filter((line) => line.trim() !== ""),
    shareUrl(input.gameId),
  ].join("\n");
}

const SQUARE = { good: "🟩", ok: "🟨", bad: "🟥" } as const;

export function squares(values: Array<keyof typeof SQUARE>): string {
  return values.map((value) => SQUARE[value]).join("");
}
```

- [ ] **Step 4: Write the share button**

Create `components/daily/share-result.tsx`:

```tsx
"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/track";
import type { DailyGameId } from "@/lib/games/registry";

function prefersShareSheet(): boolean {
  return (
    typeof navigator.share === "function" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function ShareResult({ gameId, text }: { gameId: DailyGameId; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (prefersShareSheet()) {
      try {
        await navigator.share({ text });
        track("result_shared", { game: gameId, method: "share" });
      } catch {
        // The person closed the share sheet. Nothing was shared.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track("result_shared", { game: gameId, method: "copy" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access was refused; leave the button as it was.
    }
  }

  return (
    <button type="button" className="share-result" onClick={handleClick} aria-label="Share result">
      {copied ? "Copied" : "Share result"}
    </button>
  );
}
```

Append to `app/globals.css`:

```css
/* ── Share result ────────────────────────────────────────────────── */

.share-result {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 150px;
  padding: 11px 18px;
  border-radius: 10px;
  border: 1.5px solid currentColor;
  background: transparent;
  color: inherit;
  font: 600 14px "Outfit", system-ui, sans-serif;
  cursor: pointer;
  margin: 4px 0 12px;
}
.share-result:hover {
  opacity: 0.8;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run tests/lib/share tests/components/share-result.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 6: Add the button to each finish screen**

For each game below: open the file, find the finish screen (the block that renders `<OtherDailies currentGameId="…" />`), read which result values are in scope there, build the text with `buildShareText`, and render `<ShareResult gameId="…" text={…} />` directly above `<OtherDailies />`. Where a finish screen appears twice (win and loss), add it to both. Change nothing else in the file.

Use the puzzle's own date for the label where the component has one; otherwise `formatShareDate(getDateString())`.

| Game | File | Label | Lines |
|---|---|---|---|
| Chain Link | `components/chainlink/game.tsx` | date | One square per link after the first word: 🟩 solved with no wrong guesses, 🟨 solved after wrong guesses, 🟥 not solved. If the component does not keep wrong guesses per word, use a single line `Solved N of M links`. Never include the words. |
| Brain Dead | `components/brain-dead/game.tsx` | date | `{correct} of 15 · {score with thousands separators} pts`, then one ✅ per correct answer followed by ❌ if the run ended on a wrong answer or timeout. Daily mode only. |
| AnyGuessr | `components/anyguessr/results.tsx` | date | `{totalScore} pts`, then one square per entry in `store.roundResults`: 🟩 full points for the round, 🟥 zero, 🟨 anything between. Never include country names. |
| FreezeFrames | `components/freezeframes/game.tsx` | date | `🎬{✅ or ❌} 🎵{…} 📺{…} 💿{…} · {total} pts`, one mark per round in order. Never include titles. |
| Ball Knowledge | `components/ball-knowledge/game.tsx` | the category | `I named {score} in 60 seconds`. Remove the existing `shareText` constant and the copy, tweet and text-message controls that use it; `ShareResult` replaces them. |
| Hot Takes | `components/hot-takes/game.tsx` | `category.name` | `My S tier: {labels of items placed in S, comma separated}`; if S is empty, `Nothing made my S tier`. Remove the existing `shareText` constant and the copy button that uses it. The text must not contain a percentage. |
| Getting Warmer | `components/getting-warmer/results-modal.tsx` | date | If won: `{shareEmojis} Got it in {attempts} {guess/guesses}`. If not: `{shareEmojis} Didn't get it`. Never include `answer`. |

`components/brain-dead/game.tsx` and `components/chainlink/game.tsx` are also being edited by another work stream on `main`. Keep the change in each to the import lines and the one inserted element so a later merge is simple.

- [ ] **Step 7: Check each game in the browser**

Run `pnpm dev`. For each of the seven dailies, finish the puzzle, press "Share result", paste into a text editor and confirm: the first line is the game name and label, no answer appears, the last line is the game's address ending in `?ref=share`. To replay a daily, clear that game's saved state in the browser's local storage.

- [ ] **Step 8: Verify and commit**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: PASS.

```bash
git add lib/share components app/globals.css tests/lib/share tests/components/share-result.test.tsx
git commit -m "feat(daily): share button with a spoiler-free result on every daily

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01JiWGJWEJWAyzrsEm5p7BPa"
```

---

### Task 10: Final checks

**Files:** none, unless a check fails.

- [ ] **Step 1: Full verification**

Run: `pnpm verify`
Expected: PASS.

- [ ] **Step 2: Full end-to-end run for the new tests**

Run: `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/game-about.spec.ts tests/e2e/accessibility.spec.ts -g "home|About"`
Expected: PASS.

- [ ] **Step 3: Every game page shows its section and title**

With `pnpm dev` running:

```bash
for path in /chainlink /brain-dead /anyguessr /anyguessr/daily /hot-takes /freezeframes/daily /ball-knowledge/daily /getting-warmer/daily /draft-anything /slippery-slope; do
  html=$(curl -s "http://localhost:3000$path")
  echo "$path  about:$(echo "$html" | grep -c 'class="game-about"')  details:$(echo "$html" | grep -o '<details' | wc -l | tr -d ' ')  title:$(echo "$html" | grep -o '<title>[^<]*</title>')"
done
```

Expected: every line shows `about:1`, a `details` count between 7 and 11, and a title ending in `| Stim Games` with no "Stim Labs" in it.

- [ ] **Step 4: Events arrive in PostHog**

With `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` set in `.env.local`, open the home page, click the featured game, finish that daily, then click one of the "More daily games" cards under it. In the browser's network tab, filter for `/ingest` and confirm three events were sent: `home_game_clicked` (with `slot: "featured"`), `daily_completed` (with the game id), and `game_about_link_clicked` (with `from_game` and `to_game`). Then press "Share result" on a finish screen and confirm `result_shared` is sent.

- [ ] **Step 5: Hand off**

Use the `superpowers:finishing-a-development-branch` skill to decide how the branch is integrated. Note for whoever merges: the main working tree has separate uncommitted "arcade punch" changes in `app/globals.css`; this branch deletes the old home page rules and appends two new blocks at the end of that file, so a conflict there is possible and is resolved by keeping both sides.
