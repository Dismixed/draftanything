# Daily Finish Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every daily game ends on one shared finish screen that shows the game's own result, a bell curve on competitive games, a guided "Up next" pick with the other unplayed games, a streak milestone and a Sweep count.

**Architecture:** A `FinishScreen` component in `components/daily/` wraps the existing `DailyCompleteOverlay` and lays out five shared pieces around a `result` node each game passes in. Pure logic (next game, milestones, Sweep, percentile maths) lives in `lib/` with unit tests. A new `daily_finishes` table and `/api/daily-finish` route record every competitive finish and return a percentile that is estimated from an assumed curve until a day has 30 finishes. Games are migrated one at a time; the old shell, "More dailies" block and streak pill are deleted once nothing uses them.

**Tech Stack:** Next.js (App Router), React, TypeScript, plain CSS in `app/*.css`, Supabase (Postgres) through the admin client, zod v4, vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-10-daily-finish-screen-design.md`. Read it before starting. The chosen layout is option B in `/Users/joshoguh/WebstormProjects/draft-anything/.superpowers/brainstorm/15353-1791578498/content/finish-run-guided.html` (also at https://claude.ai/artifact/6WSKZ2HEeMgwYp1PDazB76).

## Global Constraints

- Work only in the worktree `/Users/joshoguh/WebstormProjects/draft-anything-finish-screen` on branch `feature/daily-finish-screen`. Never edit `/Users/joshoguh/WebstormProjects/draft-anything` (other sessions have uncommitted work there).
- `.env.local` points at the **hosted** Supabase project. Do not run `pnpm db:push`, `supabase db push`, or `tests/e2e/accessibility.spec.ts`. The `daily_finishes` migration is written to disk only; applying it needs the user's explicit go-ahead.
- Gate for every task: `pnpm typecheck`, `pnpm test`, and no new ESLint errors in the files the task touched (`pnpm exec eslint <files>`). `pnpm lint` on the whole repo is already red on `main`; do not try to fix it. Run `pnpm build` at Tasks 4, 6 and 12.
- vitest globals are off: import `describe`, `it`, `expect`, `vi` from `"vitest"` and call `afterEach(cleanup)` in component tests.
- Each game keeps its own colours, fonts and result markup. Shared CSS uses only `--bg`, `--text`, `--text-dim`, `--fin-acc`, `--fin-surf`, `--fin-line`, and per-chip `--c` / `--nx`.
- Copy is fixed by the spec: "Up next", "Or pick another", "N of 7 today · M to go for a Sweep", "Sweep. All seven done today.", "Your Nth Sweep.", "New puzzles in 3h 12m", "Better than X% of players", "Day 1 of your streak. Come back tomorrow to make it 2.", "N day streak. M more for <milestone>.", "Create a Draft room →". No em dashes in new copy.
- Milestones are 7, 14, 30, 50, 100. `MIN_SAMPLE` is 30. Percentiles are clamped to 1–99.
- Out of scope: sign-in prompt, reminders, the home page done state, sound, other games' results on the finish screen, any change to leaderboards.
- Visible changes (Tasks 3–4 and 6–11): after the gate passes, show the user the game on the worktree dev server and commit only after they say yes. Tasks 1, 2 and 5 change nothing visible and may be committed as soon as their gate passes. Never merge or push without the user's approval.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

### Decisions this plan makes beyond the spec

1. `measuredPercentile` takes counts (`worse`, `others`), not an array of scores. Supabase caps a select at 1,000 rows, so the route asks Postgres for two counts instead of loading every score.
2. The API response also carries `max` (the highest score the route accepts for that game today), so the bell curve can label its axis on return visits when Brain Dead's questions are not loaded.
3. `FinishScreen` reads its colours from the game registry, so `theme` is an optional override instead of a required prop.
4. Getting Warmer now records the day as played when the player gives up, as Chain Link does on a failed chain. Without this the run would keep offering Getting Warmer as "Up next" to someone who has already used today's puzzle. It means a give-up day now counts toward the Getting Warmer streak.
5. Freeze Frames stays on the finish screen after saving a leaderboard name instead of navigating to the leaderboard page.
6. Brain Dead keeps a quiet "Play Free Mode" link inside its result.

## Review Focus

1. **The percentile request fails or the table does not exist yet.** The finish screen must show the result, actions and Up next with no curve and no error. Pinned by the hook test in Task 5 and the route test "answers 503 when the table cannot be read".
2. **A first-time visitor with an empty streak store.** The current game must still count as played (1 of 7), the streak line must read "Day 1", and Up next must not point at the game just finished. Pinned by the component test in Task 3.
3. **Every daily already played.** No Up next card, no "Or pick another", a Sweep panel instead, and no second countdown line. Pinned in Task 3.
4. **A second finish post with a different score** (replay in another tab, tampering). The stored score wins and the percentile is for the stored score. Pinned in Task 5 (service and route tests).
5. **Scores at or past the edges of the assumed curve** (0, the maximum, a 400-guess Getting Warmer). The number stays within 1–99 and the "You" marker stays inside the plot. Pinned in Task 2.

---

### Task 1: Next game, milestones, Sweep and durations

**Files:**
- Modify: `lib/games/registry.ts` (the `GameEntry` interface and the seven daily entries)
- Create: `lib/games/next.ts`, `lib/streak/milestones.ts`, `lib/streak/sweep.ts`
- Test: `tests/lib/games/registry.test.ts` (add one test), `tests/lib/games/next.test.ts`, `tests/lib/streak/milestones.test.ts`, `tests/lib/streak/sweep.test.ts`

**Interfaces:**
- Consumes: `DAILY_GAMES`, `DailyGameId`, `getGame` from `@/lib/games/registry`; `StreakStore` from `@/lib/streak/types`.
- Produces:
  - `GameEntry.duration?: string` (set on all seven dailies)
  - `nextDaily(played: ReadonlySet<DailyGameId>): DailyGameId | null`
  - `remainingDailies(played: ReadonlySet<DailyGameId>): DailyGameId[]` (unplayed games after the next one)
  - `STREAK_MILESTONES`, `nextMilestone(streak: number): { target: number; previous: number; remaining: number } | null`, `milestoneLabel(target: number): string`, `MILESTONE_PIPS = 7`, `milestonePips(streak: number): number`
  - `isSweep(store: StreakStore, date: string): boolean`, `sweepCount(store: StreakStore): number`

- [ ] **Step 0: Prepare the worktree (once)**

```bash
cd /Users/joshoguh/WebstormProjects/draft-anything-finish-screen
pnpm install --frozen-lockfile --prefer-offline
cp /Users/joshoguh/WebstormProjects/draft-anything/.env.local .env.local
pnpm typecheck && pnpm test
```

Expected: typecheck clean, all tests pass. If something fails here it was failing before this work; note it and carry on.

- [ ] **Step 1: Write the failing tests**

Add to the `describe("game registry", ...)` block in `tests/lib/games/registry.test.ts`:

```ts
  it("gives every daily a time estimate", () => {
    for (const id of DAILY_GAMES) {
      expect(getGame(id).duration, id).toMatch(/^(~\d+ min|\d+ sec)$/);
    }
  });
```

Create `tests/lib/games/next.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";
import { nextDaily, remainingDailies } from "@/lib/games/next";

const played = (...ids: DailyGameId[]) => new Set<DailyGameId>(ids);

describe("nextDaily", () => {
  it("starts with the first game in the lineup when nothing is played", () => {
    expect(nextDaily(played())).toBe("chainlink");
  });

  it("skips played games in lineup order", () => {
    expect(nextDaily(played("chainlink", "brain-dead"))).toBe("anyguessr");
    expect(nextDaily(played("chainlink", "anyguessr"))).toBe("brain-dead");
  });

  it("goes back to the top when the last game in the lineup is the one just played", () => {
    expect(nextDaily(played("getting-warmer"))).toBe("chainlink");
  });

  it("returns null when everything is played", () => {
    expect(nextDaily(played(...DAILY_GAMES))).toBeNull();
  });
});

describe("remainingDailies", () => {
  it("lists the unplayed games after the next one, in lineup order", () => {
    expect(remainingDailies(played("chainlink", "brain-dead"))).toEqual([
      "freezeframes",
      "ball-knowledge",
      "hot-takes",
      "getting-warmer",
    ]);
  });

  it("is empty when one game is left, and when none are", () => {
    expect(remainingDailies(played(...DAILY_GAMES.filter((id) => id !== "hot-takes")))).toEqual([]);
    expect(remainingDailies(played(...DAILY_GAMES))).toEqual([]);
  });
});
```

Create `tests/lib/streak/milestones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { milestoneLabel, milestonePips, nextMilestone } from "@/lib/streak/milestones";

describe("nextMilestone", () => {
  it("aims at a week first", () => {
    expect(nextMilestone(0)).toEqual({ target: 7, previous: 0, remaining: 7 });
    expect(nextMilestone(1)).toEqual({ target: 7, previous: 0, remaining: 6 });
    expect(nextMilestone(6)).toEqual({ target: 7, previous: 0, remaining: 1 });
  });

  it("moves to the next milestone once one is reached", () => {
    expect(nextMilestone(7)).toEqual({ target: 14, previous: 7, remaining: 7 });
    expect(nextMilestone(29)).toEqual({ target: 30, previous: 14, remaining: 1 });
    expect(nextMilestone(99)).toEqual({ target: 100, previous: 50, remaining: 1 });
  });

  it("has nothing left to aim at from 100 days", () => {
    expect(nextMilestone(100)).toBeNull();
    expect(nextMilestone(250)).toBeNull();
  });

  it("treats a negative or fractional streak as whole days from zero", () => {
    expect(nextMilestone(-3)).toEqual({ target: 7, previous: 0, remaining: 7 });
    expect(nextMilestone(2.9)).toEqual({ target: 7, previous: 0, remaining: 5 });
  });
});

describe("milestoneLabel", () => {
  it("names the short milestones and counts the long ones", () => {
    expect(milestoneLabel(7)).toBe("a full week");
    expect(milestoneLabel(14)).toBe("two weeks");
    expect(milestoneLabel(30)).toBe("30 days");
  });
});

describe("milestonePips", () => {
  it("fills one pip a day during the first week", () => {
    expect(milestonePips(1)).toBe(1);
    expect(milestonePips(4)).toBe(4);
  });

  it("shows progress between milestones after the first week", () => {
    expect(milestonePips(7)).toBe(0);
    expect(milestonePips(22)).toBe(3);
  });

  it("is full once there is no milestone left", () => {
    expect(milestonePips(100)).toBe(7);
  });
});
```

Create `tests/lib/streak/sweep.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";
import { isSweep, sweepCount } from "@/lib/streak/sweep";
import type { StreakStore } from "@/lib/streak/types";

function store(dates: Partial<Record<DailyGameId, string[]>>): StreakStore {
  return {
    version: 1,
    games: Object.fromEntries(DAILY_GAMES.map((id) => [id, { playDates: dates[id] ?? [] }])) as StreakStore["games"],
  };
}

const everyGame = (dates: string[]) => Object.fromEntries(DAILY_GAMES.map((id) => [id, dates]));

describe("isSweep", () => {
  it("is true only when all seven games were played on that date", () => {
    expect(isSweep(store(everyGame(["2026-10-10"])), "2026-10-10")).toBe(true);
    expect(isSweep(store({ ...everyGame(["2026-10-10"]), "hot-takes": [] }), "2026-10-10")).toBe(false);
    expect(isSweep(store(everyGame(["2026-10-10"])), "2026-10-11")).toBe(false);
  });

  it("is false for an empty store", () => {
    expect(isSweep(store({}), "2026-10-10")).toBe(false);
  });
});

describe("sweepCount", () => {
  it("counts the dates on which all seven were played", () => {
    const dates = { ...everyGame(["2026-10-08", "2026-10-09", "2026-10-10"]), chainlink: ["2026-10-08", "2026-10-10"] };
    expect(sweepCount(store(dates))).toBe(2);
  });

  it("counts a date once even if it was stored twice", () => {
    expect(sweepCount(store(everyGame(["2026-10-10", "2026-10-10"])))).toBe(1);
  });

  it("is zero for an empty store", () => {
    expect(sweepCount(store({}))).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm exec vitest run tests/lib/games/next.test.ts tests/lib/streak/milestones.test.ts tests/lib/streak/sweep.test.ts tests/lib/games/registry.test.ts`
Expected: the three new files fail to import their modules; the registry test fails with `expected undefined to match`.

- [ ] **Step 3: Implement**

In `lib/games/registry.ts`, add one field to `GameEntry` after `pitch`:

```ts
  /** How long one daily takes, shown where the game is offered as the next thing to play. */
  duration?: string;
```

and add a `duration` line after `pitch` in each daily entry:

| Entry | Line to add |
|---|---|
| `chainlink` | `duration: "~2 min",` |
| `"brain-dead"` | `duration: "~2 min",` |
| `anyguessr` | `duration: "~3 min",` |
| `"hot-takes"` | `duration: "~2 min",` |
| `freezeframes` | `duration: "~2 min",` |
| `"ball-knowledge"` | `duration: "60 sec",` |
| `"getting-warmer"` | `duration: "~3 min",` |

Create `lib/games/next.ts`:

```ts
import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";

/** The first daily in lineup order that has not been played today, or null when all are done. */
export function nextDaily(played: ReadonlySet<DailyGameId>): DailyGameId | null {
  return DAILY_GAMES.find((id) => !played.has(id)) ?? null;
}

/** The unplayed dailies after the one `nextDaily` returns, in lineup order. */
export function remainingDailies(played: ReadonlySet<DailyGameId>): DailyGameId[] {
  return DAILY_GAMES.filter((id) => !played.has(id)).slice(1);
}
```

Create `lib/streak/milestones.ts`:

```ts
export const STREAK_MILESTONES = [7, 14, 30, 50, 100] as const;

/** Pips drawn under the streak line. */
export const MILESTONE_PIPS = 7;

export interface Milestone {
  target: number;
  /** The milestone before `target`, or 0. */
  previous: number;
  remaining: number;
}

export function nextMilestone(streak: number): Milestone | null {
  const days = Math.max(0, Math.floor(streak));
  const index = STREAK_MILESTONES.findIndex((milestone) => milestone > days);
  if (index === -1) return null;
  const target = STREAK_MILESTONES[index];
  return { target, previous: index === 0 ? 0 : STREAK_MILESTONES[index - 1], remaining: target - days };
}

export function milestoneLabel(target: number): string {
  if (target === 7) return "a full week";
  if (target === 14) return "two weeks";
  return `${target} days`;
}

/** How many of the seven pips are filled: progress from the last milestone to the next. */
export function milestonePips(streak: number): number {
  const days = Math.max(0, Math.floor(streak));
  const milestone = nextMilestone(days);
  if (!milestone) return MILESTONE_PIPS;
  const span = milestone.target - milestone.previous;
  return Math.floor((MILESTONE_PIPS * (days - milestone.previous)) / span);
}
```

Create `lib/streak/sweep.ts`:

```ts
import { DAILY_GAMES, type StreakStore } from "./types";

/** A Sweep is a day on which every daily was played. */
export function isSweep(store: StreakStore, date: string): boolean {
  return DAILY_GAMES.every((id) => store.games[id].playDates.includes(date));
}

export function sweepCount(store: StreakStore): number {
  const [first, ...rest] = DAILY_GAMES;
  const others = rest.map((id) => new Set(store.games[id].playDates));
  let count = 0;
  for (const date of new Set(store.games[first].playDates)) {
    if (others.every((dates) => dates.has(date))) count++;
  }
  return count;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm exec vitest run tests/lib/games tests/lib/streak && pnpm typecheck`
Expected: PASS, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add lib/games/registry.ts lib/games/next.ts lib/streak/milestones.ts lib/streak/sweep.ts tests/lib/games/registry.test.ts tests/lib/games/next.test.ts tests/lib/streak/milestones.test.ts tests/lib/streak/sweep.test.ts
git commit -m "feat(daily): next game, streak milestones and Sweep logic"
```

---

### Task 2: Percentile maths

**Files:**
- Create: `lib/games/percentile.ts`
- Test: `tests/lib/games/percentile.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all from `@/lib/games/percentile`):
  - `COMPETITIVE_GAMES` (readonly tuple) and `type CompetitiveGameId = "brain-dead" | "anyguessr" | "freezeframes" | "ball-knowledge" | "getting-warmer"`
  - `type Direction = "higher" | "lower"`, `DIRECTION: Record<CompetitiveGameId, Direction>`
  - `MIN_SAMPLE = 30`
  - `clampPercentile(value: number): number`
  - `measuredPercentile(worse: number, others: number): number`
  - `estimatedPercentile(game: CompetitiveGameId, score: number, max: number): number`
  - `percentileFor(input: { game: CompetitiveGameId; score: number; max: number; total: number; worse: number; ownCounted: boolean }): { percentile: number; source: "estimated" | "measured"; sample: number }`
  - `zForPercentile(percentile: number): number` (standard deviations from the mean; used to place the "You" marker)
  - `axisLabels(game: CompetitiveGameId, max: number | null): { lowLabel: string; highLabel: string }`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/games/percentile.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MIN_SAMPLE,
  axisLabels,
  clampPercentile,
  estimatedPercentile,
  measuredPercentile,
  percentileFor,
  zForPercentile,
} from "@/lib/games/percentile";

describe("clampPercentile", () => {
  it("never tells anyone they beat everyone or no one", () => {
    expect(clampPercentile(0)).toBe(1);
    expect(clampPercentile(100)).toBe(99);
    expect(clampPercentile(63.4)).toBe(63);
  });
});

describe("measuredPercentile", () => {
  it("is the share of other players who did strictly worse", () => {
    expect(measuredPercentile(5, 10)).toBe(50);
    expect(measuredPercentile(20, 29)).toBe(69);
  });

  it("is clamped at both ends", () => {
    expect(measuredPercentile(10, 10)).toBe(99);
    expect(measuredPercentile(0, 10)).toBe(1);
  });

  it("is the middle when the player is the only one", () => {
    expect(measuredPercentile(0, 0)).toBe(50);
  });
});

describe("estimatedPercentile", () => {
  it("puts the assumed average player in the middle", () => {
    expect(estimatedPercentile("brain-dead", 450, 1000)).toBe(50);
    expect(estimatedPercentile("ball-knowledge", 12, 200)).toBe(50);
    expect(estimatedPercentile("getting-warmer", 14, 500)).toBe(50);
  });

  it("never goes down as a higher-is-better score goes up", () => {
    for (const game of ["brain-dead", "anyguessr", "freezeframes", "ball-knowledge"] as const) {
      let last = 0;
      for (let score = 0; score <= 4000; score += 50) {
        const now = estimatedPercentile(game, score, 4000);
        expect(now, `${game} at ${score}`).toBeGreaterThanOrEqual(last);
        last = now;
      }
    }
  });

  it("rewards fewer guesses in Getting Warmer", () => {
    expect(estimatedPercentile("getting-warmer", 3, 500)).toBeGreaterThan(estimatedPercentile("getting-warmer", 14, 500));
    expect(estimatedPercentile("getting-warmer", 14, 500)).toBeGreaterThan(estimatedPercentile("getting-warmer", 30, 500));
  });

  it("stays within 1 to 99 at the edges", () => {
    expect(estimatedPercentile("freezeframes", 0, 4000)).toBeGreaterThanOrEqual(1);
    expect(estimatedPercentile("freezeframes", 4000, 4000)).toBeLessThanOrEqual(99);
    expect(estimatedPercentile("ball-knowledge", 200, 200)).toBe(99);
    expect(estimatedPercentile("getting-warmer", 400, 500)).toBe(1);
    expect(estimatedPercentile("getting-warmer", 1, 500)).toBeLessThanOrEqual(99);
  });

  it("falls back to the middle when the maximum is unknown", () => {
    expect(estimatedPercentile("brain-dead", 900, 0)).toBe(50);
  });
});

describe("percentileFor", () => {
  const base = { game: "freezeframes" as const, score: 2200, max: 4000, ownCounted: true };

  it("estimates below the minimum sample", () => {
    const result = percentileFor({ ...base, total: MIN_SAMPLE - 1, worse: 28 });
    expect(result).toEqual({ percentile: estimatedPercentile("freezeframes", 2200, 4000), source: "estimated", sample: 29 });
  });

  it("measures from the minimum sample up, leaving the player out of the crowd", () => {
    expect(percentileFor({ ...base, total: MIN_SAMPLE, worse: 20 })).toEqual({
      percentile: 69,
      source: "measured",
      sample: 30,
    });
  });

  it("counts everyone as the crowd when the player has no stored row", () => {
    expect(percentileFor({ ...base, ownCounted: false, total: 40, worse: 10 }).percentile).toBe(25);
  });
});

describe("zForPercentile", () => {
  it("is zero at the median and symmetric around it", () => {
    expect(zForPercentile(50)).toBeCloseTo(0, 3);
    expect(zForPercentile(84.13)).toBeCloseTo(1, 2);
    expect(zForPercentile(2.5)).toBeCloseTo(-1.96, 2);
    expect(zForPercentile(30)).toBeCloseTo(-zForPercentile(70), 6);
  });

  it("keeps the marker inside the plot for out-of-range input", () => {
    expect(zForPercentile(0)).toBeGreaterThan(-2.7);
    expect(zForPercentile(100)).toBeLessThan(2.7);
  });
});

describe("axisLabels", () => {
  it("shows the score range when the game has a maximum", () => {
    expect(axisLabels("freezeframes", 4000)).toEqual({ lowLabel: "0", highLabel: "4,000" });
    expect(axisLabels("anyguessr", 700)).toEqual({ lowLabel: "0", highLabel: "700" });
  });

  it("uses words when there is no maximum to show", () => {
    expect(axisLabels("brain-dead", null)).toEqual({ lowLabel: "0", highLabel: "top score" });
    expect(axisLabels("ball-knowledge", 200)).toEqual({ lowLabel: "0", highLabel: "most named" });
  });

  it("reverses the meaning for Getting Warmer", () => {
    expect(axisLabels("getting-warmer", 500)).toEqual({ lowLabel: "most guesses", highLabel: "fewest" });
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm exec vitest run tests/lib/games/percentile.test.ts`
Expected: FAIL, cannot resolve `@/lib/games/percentile`.

- [ ] **Step 3: Implement**

Create `lib/games/percentile.ts`:

```ts
export const COMPETITIVE_GAMES = [
  "brain-dead",
  "anyguessr",
  "freezeframes",
  "ball-knowledge",
  "getting-warmer",
] as const;

export type CompetitiveGameId = (typeof COMPETITIVE_GAMES)[number];

/** Whether a bigger or a smaller score is the better one. */
export type Direction = "higher" | "lower";

export const DIRECTION: Record<CompetitiveGameId, Direction> = {
  "brain-dead": "higher",
  anyguessr: "higher",
  freezeframes: "higher",
  "ball-knowledge": "higher",
  "getting-warmer": "lower",
};

/** Finishes a game needs on a day before the real distribution replaces the assumed one. */
export const MIN_SAMPLE = 30;

/**
 * The assumed spread of scores, used until a day has MIN_SAMPLE finishes. These are guesses
 * to tune against real data. `relative` curves are fractions of the day's maximum score.
 */
const CURVES: Record<CompetitiveGameId, { mean: number; sd: number; relative: boolean }> = {
  "brain-dead": { mean: 0.45, sd: 0.2, relative: true },
  anyguessr: { mean: 0.55, sd: 0.2, relative: true },
  freezeframes: { mean: 0.55, sd: 0.22, relative: true },
  "ball-knowledge": { mean: 12, sd: 6, relative: false },
  "getting-warmer": { mean: 14, sd: 8, relative: false },
};

export function clampPercentile(value: number): number {
  return Math.min(99, Math.max(1, Math.round(value)));
}

/** Abramowitz and Stegun 7.1.26. Accurate to about 1e-7, which is far more than a whole percent needs. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Share of the other players who did strictly worse. `others` leaves the player out. */
export function measuredPercentile(worse: number, others: number): number {
  if (others <= 0) return 50;
  return clampPercentile((100 * worse) / others);
}

export function estimatedPercentile(game: CompetitiveGameId, score: number, max: number): number {
  const curve = CURVES[game];
  if (curve.relative && max <= 0) return 50;
  const mean = curve.relative ? curve.mean * max : curve.mean;
  const sd = curve.relative ? curve.sd * max : curve.sd;
  const below = normalCdf((score - mean) / sd);
  return clampPercentile(100 * (DIRECTION[game] === "higher" ? below : 1 - below));
}

export interface PercentileInput {
  game: CompetitiveGameId;
  score: number;
  /** The day's highest possible score. Only the relative curves use it. */
  max: number;
  /** Finishes recorded for this game today. */
  total: number;
  /** How many of them are strictly worse than `score`. */
  worse: number;
  /** Whether the player's own finish is one of `total`. */
  ownCounted: boolean;
}

export interface PercentileResult {
  percentile: number;
  source: "estimated" | "measured";
  sample: number;
}

export function percentileFor(input: PercentileInput): PercentileResult {
  if (input.total >= MIN_SAMPLE) {
    const others = input.total - (input.ownCounted ? 1 : 0);
    return { percentile: measuredPercentile(input.worse, others), source: "measured", sample: input.total };
  }
  return {
    percentile: estimatedPercentile(input.game, input.score, input.max),
    source: "estimated",
    sample: input.total,
  };
}

/**
 * Standard deviations from the mean at which `percentile` percent of a normal curve lies to
 * the left (Acklam's approximation). Input is held to 0.5–99.5 so the result stays within
 * about ±2.6 and the marker stays on the plot.
 */
export function zForPercentile(percentile: number): number {
  const p = Math.min(0.995, Math.max(0.005, percentile / 100));
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;

  const tail = (q: number) =>
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);

  if (p < low) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - low) return -tail(Math.sqrt(-2 * Math.log(1 - p)));

  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/** What to print at the two ends of the bell curve's axis. */
export function axisLabels(game: CompetitiveGameId, max: number | null): { lowLabel: string; highLabel: string } {
  if (game === "getting-warmer") return { lowLabel: "most guesses", highLabel: "fewest" };
  if (game === "ball-knowledge") return { lowLabel: "0", highLabel: "most named" };
  return { lowLabel: "0", highLabel: max ? max.toLocaleString("en-US") : "top score" };
}
```

- [ ] **Step 4: Run to see it pass**

Run: `pnpm exec vitest run tests/lib/games/percentile.test.ts && pnpm typecheck`
Expected: PASS. If a `zForPercentile` assertion fails, a coefficient was mistyped; compare the arrays above digit by digit.

- [ ] **Step 5: Commit**

```bash
git add lib/games/percentile.ts tests/lib/games/percentile.test.ts
git commit -m "feat(daily): percentile maths with an assumed curve below 30 finishes"
```

---

### Task 3: Shared finish screen components

**Files:**
- Modify: `components/daily/daily-complete-overlay.tsx` (add `headerExtra`)
- Create: `components/daily/finish-screen.tsx`, `components/daily/finish-run.tsx`, `components/daily/finish-bell-curve.tsx`, `components/daily/finish-up-next.tsx`, `components/daily/finish-streak.tsx`
- Modify: `app/globals.css` (new block directly after the `.daily-complete-body` rule, before `.od-section`)
- Test: `tests/components/finish-screen.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`nextDaily`, `remainingDailies`, `nextMilestone`, `milestoneLabel`, `milestonePips`, `MILESTONE_PIPS`, `sweepCount`, `GameEntry.duration`), Task 2 (`zForPercentile`); existing `useStreak()` from `@/lib/streak/context` (`{ streaks: GameStreakInfo[] }`), `readStreakStore()` from `@/lib/streak/storage`, `GAME_META` from `@/lib/streak/types`, `getGame`/`DAILY_GAMES` from `@/lib/games/registry`, `formatCountdown`/`msUntilNextUtcDay` from `@/lib/games/today`, `ShareResult`, `useCountUp`, `track`.
- Produces:

```ts
// components/daily/finish-screen.tsx
export interface FinishSecondary { label: string; href?: string; onClick?: () => void }
export interface FinishCurve { percentile: number; lowLabel: string; highLabel: string }
export interface FinishScreenProps {
  gameId: DailyGameId;
  open: boolean;
  onClose: () => void;
  /** The game's own result, in the game's own markup and classes. */
  result: ReactNode;
  shareText: string;
  secondary?: FinishSecondary;
  /** Competitive games only. Leave out, or pass null, and no curve is drawn. */
  curve?: FinishCurve | null;
  /** Extra CSS variables. `--fin-result-w` widens the result (default 440px). */
  theme?: CSSProperties;
  ariaLabel?: string;
}
export function FinishScreen(props: FinishScreenProps): JSX.Element
```

Test ids later tasks may rely on: `finish-bell`, `finish-sweep-line`, `finish-chip-<gameId>`, `finish-up-next`, `finish-others`, `finish-sweep`, `finish-streak`, `finish-countdown`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/finish-screen.test.tsx`:

```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinishScreen, type FinishScreenProps } from "@/components/daily/finish-screen";
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
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

function streaksWithPlayed(played: DailyGameId[], streak = 4): GameStreakInfo[] {
  return DAILY_GAMES.map((id) => ({
    id,
    label: getGame(id).name,
    href: getGame(id).playHref,
    currentStreak: played.includes(id) ? streak : 0,
    playedToday: played.includes(id),
  }));
}

function renderScreen(props: Partial<FinishScreenProps> = {}) {
  return render(
    <FinishScreen
      gameId="brain-dead"
      open
      onClose={() => {}}
      result={<p>RESULT BODY</p>}
      shareText="share me"
      {...props}
    />,
  );
}

describe("FinishScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    localStorage.clear();
    streaks = streaksWithPlayed(["chainlink", "brain-dead"]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows the game's result, the share button and the secondary link", () => {
    renderScreen({ secondary: { label: "Leaderboard", href: "/brain-dead/leaderboard" } });

    expect(screen.getByText("RESULT BODY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share result" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leaderboard" })).toHaveAttribute("href", "/brain-dead/leaderboard");
  });

  it("draws the bell curve only when a percentile is given", () => {
    const { unmount } = renderScreen();
    expect(screen.queryByTestId("finish-bell")).toBeNull();
    unmount();

    renderScreen({ curve: { percentile: 82, lowLabel: "0", highLabel: "4,000" } });
    const bell = screen.getByTestId("finish-bell");
    expect(within(bell).getByLabelText("Better than 82% of players")).toBeInTheDocument();
    expect(bell).toHaveTextContent("everyone who played today");
    expect(bell).toHaveTextContent("4,000");
  });

  it("ticks the played games, rings the current one and marks the next", () => {
    renderScreen();

    expect(screen.getByTestId("finish-chip-chainlink")).toHaveClass("is-done");
    expect(screen.getByTestId("finish-chip-brain-dead")).toHaveClass("is-done", "is-current");
    expect(screen.getByTestId("finish-chip-anyguessr")).toHaveClass("is-next");
    expect(screen.getByTestId("finish-chip-anyguessr")).toHaveTextContent("next");
    expect(screen.getByTestId("finish-chip-freezeframes")).not.toHaveClass("is-next");
    expect(screen.getByTestId("finish-sweep-line")).toHaveTextContent("2 of 7 today · 5 to go for a Sweep");
  });

  it("guides to the next unplayed game and lists the rest with what they are", () => {
    renderScreen();

    const upNext = screen.getByTestId("finish-up-next");
    expect(upNext).toHaveTextContent("Up next");
    expect(upNext).toHaveTextContent("~3 min");
    expect(upNext).toHaveTextContent(getGame("anyguessr").blurb);
    expect(within(upNext).getByRole("link", { name: "Play AnyGuessr →" })).toHaveAttribute("href", "/anyguessr/daily");

    const others = within(screen.getByTestId("finish-others")).getAllByRole("link");
    expect(others.map((link) => link.getAttribute("href"))).toEqual([
      "/freezeframes/daily",
      "/ball-knowledge/daily",
      "/hot-takes",
      "/getting-warmer/daily",
    ]);
    expect(others[0]).toHaveTextContent(getGame("freezeframes").blurb);
  });

  it("counts the game just finished for a first-time visitor with no saved streaks", () => {
    streaks = [];
    renderScreen();

    expect(screen.getByTestId("finish-chip-brain-dead")).toHaveClass("is-done", "is-current");
    expect(screen.getByTestId("finish-sweep-line")).toHaveTextContent("1 of 7 today · 6 to go for a Sweep");
    expect(within(screen.getByTestId("finish-up-next")).getByRole("link")).toHaveAttribute("href", "/chainlink");
    expect(screen.getByTestId("finish-streak")).toHaveTextContent("Day 1 of your streak. Come back tomorrow to make it 2.");
  });

  it("shows the streak and what is left to the next milestone", () => {
    renderScreen();

    expect(screen.getByTestId("finish-streak")).toHaveTextContent("4 day streak. 3 more for a full week.");
    expect(screen.getByTestId("finish-streak").querySelectorAll(".fin-pips .is-on")).toHaveLength(4);
  });

  it("counts down to the next puzzles in the same words for every game", () => {
    renderScreen();
    expect(screen.getByTestId("finish-countdown")).toHaveTextContent("New puzzles in 8h 37m");
  });

  it("swaps Up next for a Sweep panel when every daily is played", () => {
    streaks = streaksWithPlayed([...DAILY_GAMES]);
    localStorage.setItem(
      "stim_daily_streaks",
      JSON.stringify({
        version: 1,
        games: Object.fromEntries(DAILY_GAMES.map((id) => [id, { playDates: ["2026-10-06"] }])),
      }),
    );
    renderScreen();

    expect(screen.queryByTestId("finish-up-next")).toBeNull();
    expect(screen.queryByTestId("finish-others")).toBeNull();
    expect(screen.queryByTestId("finish-countdown")).toBeNull();
    const sweep = screen.getByTestId("finish-sweep");
    expect(sweep).toHaveTextContent("Sweep. All seven done today.");
    expect(sweep).toHaveTextContent("Your 1st Sweep.");
    expect(sweep).toHaveTextContent("New puzzles in 8h 37m");
    expect(within(sweep).getByRole("link", { name: "Create a Draft room →" })).toHaveAttribute("href", "/draft-anything");
    expect(screen.getByTestId("finish-sweep-line")).toHaveTextContent("Sweep. All seven done today.");
  });

  it("hands the game's colours to the overlay", () => {
    renderScreen({ gameId: "hot-takes" });

    const dialog = screen.getByRole("dialog");
    expect(dialog.style.getPropertyValue("--bg")).toBe("var(--ht-bg)");
    expect(dialog.style.getPropertyValue("--text")).toBe("var(--ht-text)");
    expect(dialog.style.getPropertyValue("--fin-acc")).toBe("var(--ht-accent)");
  });

  it("renders nothing while closed", () => {
    renderScreen({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see it fail**

Run: `pnpm exec vitest run tests/components/finish-screen.test.tsx`
Expected: FAIL, cannot resolve `@/components/daily/finish-screen`.

- [ ] **Step 3: Add `headerExtra` to the overlay**

In `components/daily/daily-complete-overlay.tsx`, add to `DailyCompleteOverlayProps`:

```ts
  /** Shown in the top bar, to the left of the close button. */
  headerExtra?: ReactNode;
```

add `headerExtra,` to the destructured parameters, and insert this directly before the close `<button>`:

```tsx
      {headerExtra ? <div className="daily-complete-extra">{headerExtra}</div> : null}
```

- [ ] **Step 4: Create the five components**

`components/daily/finish-bell-curve.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { zForPercentile } from "@/lib/games/percentile";
import { useCountUp } from "@/lib/motion/count-up";

const W = 260;
const H = 66;
/** One standard deviation, in plot pixels. */
const SIGMA = 48;

const bellY = (x: number) => H - 2 - 56 * Math.exp(-(((x - W / 2) / SIGMA) ** 2) / 2);
const POINTS = Array.from({ length: 53 }, (_, i) => `${i * 5},${bellY(i * 5).toFixed(1)}`);
const LINE = `M${POINTS.join(" L")}`;
const AREA = `M0,${H} L${POINTS.join(" L")} L${W},${H} Z`;

export interface FinishBellCurveProps {
  /** 0 to 100: the share of players this player did better than. */
  percentile: number;
  lowLabel: string;
  highLabel: string;
}

/** The marker sits where `percentile` percent of the area lies to its left, so the picture agrees with the number. */
export function FinishBellCurve({ percentile, lowLabel, highLabel }: FinishBellCurveProps) {
  const shown = useCountUp(percentile, true, 1200);
  const x = Math.round(W / 2 + zForPercentile(percentile) * SIGMA);

  return (
    <div className="fin-bell" data-testid="finish-bell" style={{ "--x": `${x}px` } as CSSProperties}>
      <div className="fin-bell-plot" aria-hidden="true">
        <div className="fin-bell-shade">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
            <path d={AREA} />
          </svg>
        </div>
        <svg className="fin-bell-line" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
          <path d={LINE} />
        </svg>
        <div className="fin-bell-me" />
      </div>
      <div className="fin-bell-axis" aria-hidden="true">
        <span>{lowLabel}</span>
        <span>everyone who played today</span>
        <span>{highLabel}</span>
      </div>
      <p className="fin-bell-n" aria-label={`Better than ${percentile}% of players`}>
        Better than <b>{shown}%</b> of players
      </p>
    </div>
  );
}
```

`components/daily/finish-run.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { nextDaily } from "@/lib/games/next";
import { DAILY_GAMES, GAME_META, type DailyGameId } from "@/lib/streak/types";

export function FinishRun({ gameId, played }: { gameId: DailyGameId; played: ReadonlySet<DailyGameId> }) {
  const next = nextDaily(played);
  const done = DAILY_GAMES.filter((id) => played.has(id)).length;
  const left = DAILY_GAMES.length - done;

  return (
    <div className="fin-run">
      <nav className="fin-rail" aria-label="Today's games">
        {DAILY_GAMES.map((id) => {
          const meta = GAME_META[id];
          const className = [
            "fin-chip",
            played.has(id) ? "is-done" : "",
            id === gameId ? "is-current" : "",
            id === next ? "is-next" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={id}
              href={meta.href}
              className={className}
              style={{ "--c": meta.theme.accent } as CSSProperties}
              aria-current={id === gameId ? "true" : undefined}
              data-testid={`finish-chip-${id}`}
            >
              {meta.label}
              {id === next ? <span className="fin-chip-tag">next</span> : null}
            </Link>
          );
        })}
      </nav>
      <p className="fin-sweep-line" data-testid="finish-sweep-line">
        {left === 0 ? "Sweep. All seven done today." : `${done} of 7 today · ${left} to go for a Sweep`}
      </p>
    </div>
  );
}
```

`components/daily/finish-up-next.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";
import { nextDaily, remainingDailies } from "@/lib/games/next";
import { getGame, type DailyGameId } from "@/lib/games/registry";

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

interface FinishUpNextProps {
  gameId: DailyGameId;
  played: ReadonlySet<DailyGameId>;
  /** How many Sweeps the player has, including today's. */
  sweeps: number;
  /** "3h 12m" */
  countdown: string;
}

export function FinishUpNext({ gameId, played, sweeps, countdown }: FinishUpNextProps) {
  const next = nextDaily(played);

  if (!next) {
    return (
      <section className="fin-sweep" data-testid="finish-sweep">
        <h3>Sweep. All seven done today.</h3>
        <p>
          Your {ordinal(Math.max(1, sweeps))} Sweep. New puzzles in {countdown}.
        </p>
        <Link href="/draft-anything" className="fin-play">
          Create a Draft room →
        </Link>
      </section>
    );
  }

  const game = getGame(next);
  const others = remainingDailies(played);

  return (
    <>
      <section className="fin-up" data-testid="finish-up-next" style={{ "--nx": game.theme.accent } as CSSProperties}>
        <div className="fin-up-top">
          <span className="fin-label">Up next</span>
          <span className="fin-time">{game.duration}</span>
        </div>
        <div className="fin-up-name">{game.name}</div>
        <p className="fin-up-blurb">{game.blurb}</p>
        <Link
          href={game.playHref}
          className="fin-play"
          data-game={next}
          onClick={() => track("finish_next_clicked", { from: gameId, game: next, slot: "up_next" })}
        >
          Play {game.name} →
        </Link>
      </section>

      {others.length > 0 ? (
        <section className="fin-others" data-testid="finish-others">
          <span className="fin-label">Or pick another</span>
          <div className="fin-grid">
            {others.map((id) => {
              const other = getGame(id);
              return (
                <Link
                  key={id}
                  href={other.playHref}
                  className="fin-other"
                  style={{ "--c": other.theme.accent } as CSSProperties}
                  onClick={() => track("finish_next_clicked", { from: gameId, game: id, slot: "other" })}
                >
                  <span className="fin-other-name">{other.name}</span>
                  <span className="fin-other-blurb">{other.blurb}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
```

`components/daily/finish-streak.tsx`:

```tsx
"use client";

import { MILESTONE_PIPS, milestoneLabel, milestonePips, nextMilestone } from "@/lib/streak/milestones";

/** `streak` is the current game's streak including today. */
export function FinishStreak({ streak }: { streak: number }) {
  const days = Math.max(1, streak);
  const milestone = nextMilestone(days);
  const filled = milestonePips(days);

  return (
    <div className="fin-streak" data-testid="finish-streak">
      {days === 1 ? (
        <p>
          <b>Day 1 of your streak.</b> Come back tomorrow to make it 2.
        </p>
      ) : (
        <p>
          <b>
            <span className="fin-flame" aria-hidden="true">
              🔥
            </span>{" "}
            {days} day streak.
          </b>
          {milestone ? ` ${milestone.remaining} more for ${milestoneLabel(milestone.target)}.` : null}
        </p>
      )}
      <div className="fin-pips" aria-hidden="true">
        {Array.from({ length: MILESTONE_PIPS }, (_, i) => (
          <i key={i} className={i < filled ? "is-on" : undefined} />
        ))}
      </div>
    </div>
  );
}
```

`components/daily/finish-screen.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";
import { FinishBellCurve } from "@/components/daily/finish-bell-curve";
import { FinishRun } from "@/components/daily/finish-run";
import { FinishStreak } from "@/components/daily/finish-streak";
import { FinishUpNext } from "@/components/daily/finish-up-next";
import { ShareResult } from "@/components/daily/share-result";
import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import { formatCountdown, msUntilNextUtcDay } from "@/lib/games/today";
import { useStreak } from "@/lib/streak/context";
import { readStreakStore } from "@/lib/streak/storage";
import { sweepCount } from "@/lib/streak/sweep";

export interface FinishSecondary {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface FinishCurve {
  percentile: number;
  lowLabel: string;
  highLabel: string;
}

export interface FinishScreenProps {
  gameId: DailyGameId;
  open: boolean;
  onClose: () => void;
  /** The game's own result, in the game's own markup and classes. */
  result: ReactNode;
  shareText: string;
  secondary?: FinishSecondary;
  /** Competitive games only. Leave out, or pass null, and no curve is drawn. */
  curve?: FinishCurve | null;
  /** Extra CSS variables. `--fin-result-w` widens the result (default 440px). */
  theme?: CSSProperties;
  ariaLabel?: string;
}

function useCountdown(): string {
  const [text, setText] = useState(() => formatCountdown(msUntilNextUtcDay(Date.now())));

  useEffect(() => {
    const tick = () => setText(formatCountdown(msUntilNextUtcDay(Date.now())));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return text;
}

/** The screen every daily ends on: the run, the game's result, where to go next and why to come back. */
export function FinishScreen({
  gameId,
  open,
  onClose,
  result,
  shareText,
  secondary,
  curve,
  theme,
  ariaLabel = "Daily complete",
}: FinishScreenProps) {
  const { streaks } = useStreak();
  const countdown = useCountdown();
  const [sweeps, setSweeps] = useState(0);
  const game = getGame(gameId);

  // The finish screen is only ever open for a game that was played today, so it counts
  // even before the streak store has caught up (or when it is empty).
  const played = useMemo(
    () => new Set<DailyGameId>([gameId, ...streaks.filter((s) => s.playedToday).map((s) => s.id)]),
    [gameId, streaks],
  );
  const streak = Math.max(1, streaks.find((s) => s.id === gameId)?.currentStreak ?? 0);
  const allDone = played.size === DAILY_GAMES.length;

  useEffect(() => {
    if (open) setSweeps(sweepCount(readStreakStore()));
  }, [open, streaks]);

  // The overlay is drawn outside the game page, so it needs the game's colours handed to it.
  const style = {
    "--bg": game.theme.page,
    "--text": game.theme.text,
    "--text-dim": game.theme.muted,
    "--fin-acc": game.theme.accent,
    "--fin-surf": game.theme.background,
    "--fin-line": game.theme.border,
    ...theme,
  } as CSSProperties;

  return (
    <DailyCompleteOverlay
      open={open}
      onClose={onClose}
      ariaLabel={ariaLabel}
      style={style}
      headerExtra={
        <span className="fin-top-streak" title={`${streak} day streak`}>
          <span className="fin-flame" aria-hidden="true">
            🔥
          </span>{" "}
          {streak}
        </span>
      }
    >
      <div className="fin" data-game={gameId}>
        <FinishRun gameId={gameId} played={played} />

        <div className="fin-result">{result}</div>

        {curve ? <FinishBellCurve {...curve} /> : null}

        <div className="fin-actions">
          <ShareResult gameId={gameId} text={shareText} />
          {secondary?.href ? (
            <Link href={secondary.href} className="fin-ghost" onClick={secondary.onClick}>
              {secondary.label}
            </Link>
          ) : secondary ? (
            <button type="button" className="fin-ghost" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          ) : null}
        </div>

        <FinishUpNext gameId={gameId} played={played} sweeps={sweeps} countdown={countdown} />

        <FinishStreak streak={streak} />

        {allDone ? null : (
          <p className="fin-countdown" data-testid="finish-countdown">
            New puzzles in {countdown}
          </p>
        )}
      </div>
    </DailyCompleteOverlay>
  );
}
```

- [ ] **Step 5: Add the CSS**

In `app/globals.css`, directly after the closing brace of `.daily-complete-body` and before `.od-section`, add:

```css
/* ── Daily finish screen ─────────────────────────────────────────── */

.daily-complete-extra {
  position: absolute;
  top: 17px;
  right: 56px;
  z-index: 2;
  font-size: 13px;
  font-weight: 700;
}

.fin {
  --fin-acc: var(--gold);
  --fin-surf: var(--panel);
  --fin-line: var(--border);
  font-family: "Outfit", system-ui, sans-serif;
  color: var(--text);
  text-align: center;
}

.fin-top-streak { color: var(--fin-acc); font-variant-numeric: tabular-nums; }

.fin-flame {
  display: inline-block;
  transform-origin: 50% 90%;
  animation: fin-flick 1.3s ease-in-out infinite;
}

/* Run of seven */
.fin-run {
  margin: 0 -16px 22px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--fin-line);
}
.fin-rail {
  display: flex;
  gap: 6px;
  padding: 3px 16px 10px;
  overflow-x: auto;
  scrollbar-width: none;
}
.fin-rail::-webkit-scrollbar { display: none; }
.fin-chip {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 99px;
  border: 1.5px solid color-mix(in srgb, var(--c) 55%, transparent);
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  text-decoration: none;
}
.fin-chip.is-done { background: color-mix(in srgb, var(--c) 22%, transparent); }
.fin-chip.is-done::before { content: "✓"; color: var(--c); font-weight: 800; }
.fin-chip.is-current { box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 45%, transparent); }
.fin-chip.is-next { border-style: dashed; animation: fin-pulse 1.4s ease-in-out infinite; }
.fin-chip-tag {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c);
}
.fin-sweep-line {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-dim);
}

@media (min-width: 720px) {
  .fin-rail { flex-wrap: wrap; justify-content: center; overflow: visible; }
}

/* The game's own result, and the shared blocks under it */
.fin-result { max-width: var(--fin-result-w, 440px); margin: 0 auto; }
.fin-bell,
.fin-actions,
.fin-up,
.fin-others,
.fin-sweep,
.fin-streak { max-width: 440px; margin-left: auto; margin-right: auto; }

/* Bell curve */
.fin-bell { width: 260px; margin-top: 16px; }
.fin-bell-plot { position: relative; height: 66px; }
.fin-bell-plot svg { position: absolute; left: 0; top: 0; display: block; }
.fin-bell-line path {
  fill: none;
  stroke: color-mix(in srgb, var(--text) 42%, transparent);
  stroke-width: 1.5;
}
.fin-bell-shade {
  position: absolute;
  left: 0;
  top: 0;
  height: 66px;
  width: var(--x);
  overflow: hidden;
  animation: fin-grow 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both 0.15s;
}
.fin-bell-shade path { fill: color-mix(in srgb, var(--fin-acc) 42%, transparent); }
.fin-bell-me {
  position: absolute;
  top: 0;
  bottom: 0;
  left: var(--x);
  width: 2px;
  margin-left: -1px;
  background: var(--fin-acc);
  animation: fin-slide 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both 0.15s;
}
.fin-bell-me::before {
  content: "YOU";
  position: absolute;
  top: -3px;
  left: 6px;
  font: 800 9.5px "Outfit", system-ui, sans-serif;
  letter-spacing: 0.1em;
  color: var(--fin-acc);
}
.fin-bell-me::after {
  content: "";
  position: absolute;
  bottom: -4px;
  left: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--fin-acc);
}
.fin-bell-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  padding-top: 3px;
  border-top: 1px solid color-mix(in srgb, var(--text) 18%, transparent);
  font-size: 10.5px;
  color: var(--text-dim);
}
.fin-bell-n { margin: 6px 0 0; font-size: 14.5px; font-weight: 600; }
.fin-bell-n b {
  color: var(--fin-acc);
  font-size: 19px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* Share + secondary */
.fin-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 9px;
  margin-top: 16px;
}
.fin-actions .share-result-wrap { display: contents; }
.fin-actions .share-result,
.fin-ghost {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 200px;
  min-height: 40px;
  margin: 0;
  padding: 0 15px;
  border-radius: 10px;
  border: 1.5px solid color-mix(in srgb, var(--text) 30%, transparent);
  background: none;
  color: var(--text);
  font: 700 13px "Outfit", system-ui, sans-serif;
  text-decoration: none;
  cursor: pointer;
}
.fin-actions .share-result:hover,
.fin-ghost:hover { border-color: var(--text); opacity: 1; }
.fin-actions .share-result-manual { flex: 1 0 100%; max-width: none; margin: 4px 0 0; text-align: left; }

/* Up next */
.fin-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-dim);
}
.fin-time { font-size: 11px; font-weight: 700; color: var(--text-dim); white-space: nowrap; }
.fin-up {
  margin-top: 20px;
  padding: 13px 15px 15px;
  border-radius: 15px;
  border: 1px solid color-mix(in srgb, var(--nx) 50%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--nx) 26%, var(--fin-surf)), var(--fin-surf) 72%);
  text-align: left;
}
.fin-up-top { display: flex; justify-content: space-between; align-items: baseline; }
.fin-up .fin-label { color: var(--nx); }
.fin-up-name { margin-top: 3px; font-size: 21px; font-weight: 800; }
.fin-up-blurb { margin: 1px 0 11px; font-size: 13px; color: var(--text-dim); }
.fin-play {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  border-radius: 13px;
  background: var(--nx);
  box-shadow: 0 3px 0 color-mix(in srgb, var(--nx) 60%, #000);
  color: #14110a;
  font: 800 15.5px "Outfit", system-ui, sans-serif;
  text-decoration: none;
}
.fin-play[data-game="chainlink"],
.fin-play[data-game="freezeframes"],
html[data-theme="light"] .fin-play { color: #fff; }
.fin-play:hover { filter: brightness(1.06); }

.fin-others { margin-top: 14px; text-align: left; }
.fin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 7px; }
.fin-other {
  display: block;
  padding: 9px 11px;
  border-radius: 11px;
  border: 1px solid var(--fin-line);
  border-left: 3px solid var(--c);
  background: var(--fin-surf);
  color: var(--text);
  text-decoration: none;
}
.fin-other:hover { border-color: var(--c); }
.fin-other-name { display: block; font-size: 13.5px; font-weight: 700; }
.fin-other-blurb { display: block; margin-top: 1px; font-size: 11.5px; line-height: 1.3; color: var(--text-dim); }

/* All seven done */
.fin-sweep {
  --nx: var(--gold-hi);
  margin-top: 20px;
  padding: 16px 15px;
  border-radius: 15px;
  border: 1px solid color-mix(in srgb, var(--nx) 50%, transparent);
  background: linear-gradient(160deg, color-mix(in srgb, var(--nx) 22%, var(--fin-surf)), var(--fin-surf) 72%);
}
.fin-sweep h3 { margin: 0; font-size: 19px; font-weight: 800; }
.fin-sweep p { margin: 4px 0 12px; font-size: 13px; color: var(--text-dim); }

/* Streak milestone + countdown */
.fin-streak {
  margin-top: 18px;
  padding: 10px 12px;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--text) 16%, transparent);
  text-align: left;
  font-size: 12.5px;
  color: var(--text-dim);
}
.fin-streak p { margin: 0; }
.fin-streak b { color: var(--text); }
.fin-pips { display: flex; gap: 4px; margin-top: 6px; }
.fin-pips i { flex: 1; height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--text) 16%, transparent); }
.fin-pips i.is-on { background: var(--fin-acc); }
.fin-countdown {
  margin: 14px 0 0;
  font-size: 12px;
  color: var(--text-dim);
  font-variant-numeric: tabular-nums;
}

@keyframes fin-grow { from { width: 0; } }
@keyframes fin-slide { from { left: 0; } }
@keyframes fin-pulse { 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--c) 30%, transparent); } }
@keyframes fin-flick {
  0%, 100% { transform: scale(1) rotate(-3deg); }
  45% { transform: scale(1.18) rotate(4deg); }
  70% { transform: scale(0.96) rotate(-2deg); }
}
```

Motion is switched off for people who ask for less of it by the existing `@media (prefers-reduced-motion: reduce)` rule near the top of `globals.css`, and by `useCountUp`, which already checks the same setting. Do not add another rule.

- [ ] **Step 6: Run to see it pass**

Run: `pnpm exec vitest run tests/components/finish-screen.test.tsx tests/components/share-result.test.tsx && pnpm typecheck && pnpm exec eslint components/daily tests/components/finish-screen.test.tsx`
Expected: PASS, typecheck clean, no ESLint errors in these files.

Nothing renders this component yet, so there is nothing to show in the browser. Commit with Task 4, after the user has seen Chain Link.

---

### Task 4: Chain Link uses the finish screen

**Files:**
- Modify: `components/chainlink/game.tsx` (imports at lines 16–22, `OVERLAY_THEME` at 42–47, the overlay block at 565–594, `ChainResult` at 625–656)
- Modify: `app/chainlink.css` (delete `.cl-result-note` and every `.cl-result-actions` rule, around lines 639–668)

**Interfaces:**
- Consumes: `FinishScreen` from Task 3.
- Produces: nothing new.

- [ ] **Step 1: Replace the imports**

In `components/chainlink/game.tsx` delete these four imports:

```ts
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";
import { WinStreakLine } from "@/components/streak/streak-notifier";
```

and add:

```ts
import { FinishScreen } from "@/components/daily/finish-screen";
```

Delete the `OVERLAY_THEME` constant and its comment (the finish screen reads the colours from the registry).

- [ ] **Step 2: Replace the daily overlay**

Replace the whole `mode === "daily" ? ( <DailyCompleteOverlay ...> ... </DailyCompleteOverlay> ) : (` branch so the block reads:

```tsx
          {mode === "daily" ? (
            <FinishScreen
              gameId="chainlink"
              open={showFailOverlay || showCompleteOverlay}
              onClose={() => {
                setShowFailOverlay(false);
                setShowCompleteOverlay(false);
              }}
              ariaLabel={isComplete ? "Chain complete" : "Game over"}
              result={<ChainResult won={isComplete} summary={summary} />}
              shareText={shareText}
              secondary={{ label: "Stats", href: "/chainlink/stats" }}
            />
          ) : (
            (showFailOverlay || showCompleteOverlay) && (
              <div className="cl-inline-overlay anim-fade-slide-up">
                <ChainResult won={isComplete} summary={summary}>
                  <Link href="/" className="cl-quiet-btn">
                    &larr; Back
                  </Link>
                </ChainResult>
              </div>
            )
          )}
```

In `ChainResult`'s props type change `children: React.ReactNode;` to `children?: React.ReactNode;`.

- [ ] **Step 3: Remove the dead CSS**

In `app/chainlink.css` delete the `.cl-result-note` rule and every rule whose selector starts with `.cl-result-actions`. Confirm nothing still uses them:

Run: `grep -rn "cl-result-note\|cl-result-actions" app components`
Expected: no output.

- [ ] **Step 4: Gate**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint components/chainlink/game.tsx components/daily && pnpm build`
Expected: all pass; ESLint reports nothing new for these files (compare with `git stash; pnpm exec eslint components/chainlink/game.tsx; git stash pop` if unsure what was there before).

- [ ] **Step 5: Check it in the browser**

```bash
pnpm dev -p 3210
```

Open `http://localhost:3210/chainlink`. Finish the chain (or fail it), and check, at 1280px and 390px wide, in dark and light (use the site's theme toggle; `document.documentElement.dataset.theme = "light"` in the console also works for a quick look):

- Top bar: "← Home" left; flame, streak number and × right, not overlapping.
- Run: seven chips, Chain Link ticked and ringed, the next one dashed with "next"; the row scrolls sideways on the phone and wraps centred on desktop.
- Result: badge, "Chain complete" (or "Out of tries"), lead line and the mini chain, in Chain Link's own style.
- No bell curve.
- "Share result" and "Stats" side by side, equal width.
- Up next card in the next game's colour with its time, blurb and Play button; "Or pick another" in two columns.
- Streak line with pips, then "New puzzles in Xh Ym".
- Dark theme: the small labels ("Up next", time, "next" tag, axis text) are readable. If the Play button's text is hard to read on any game's colour, fix the ink in the `.fin-play` rules.
- Reload the page: the finish screen opens again (return visit). Press Escape or ×: the chain is visible underneath.
- To see the Sweep panel, run this in the console and reload: `const s = JSON.parse(localStorage.stim_daily_streaks); const d = new Date().toISOString().slice(0, 10); for (const g of Object.values(s.games)) if (!g.playDates.includes(d)) g.playDates.push(d); localStorage.stim_daily_streaks = JSON.stringify(s);`

- [ ] **Step 6: Show the user, then commit**

Tell the user the dev server address and what to look at. After they approve:

```bash
git add components/daily app/globals.css tests/components/finish-screen.test.tsx components/chainlink/game.tsx app/chainlink.css
git commit -m "feat(daily): shared finish screen, first used by Chain Link"
```

---

### Task 5: Record finishes and serve the percentile

**Files:**
- Create: `supabase/migrations/202610110000_daily_finishes.sql`
- Modify: `lib/supabase/database.types.ts` (add the `daily_finishes` table block inside `public.Tables`, in alphabetical position)
- Create: `lib/games/daily-finish-service.ts`, `app/api/daily-finish/route.ts`, `lib/games/use-daily-percentile.ts`
- Test: `tests/lib/games/daily-finish-service.test.ts`, `tests/api/daily-finish.test.ts`, `tests/lib/games/use-daily-percentile.test.tsx`

**Interfaces:**
- Consumes: Task 2 (`COMPETITIVE_GAMES`, `CompetitiveGameId`, `Direction`, `DIRECTION`, `percentileFor`, `axisLabels`); existing `createAdminClient` (`@/lib/supabase/admin`), `createClient` (`@/lib/supabase/server`), `ensureGuestSession` / `requireGuestSession` (`@/features/guest/session`), `checkRateLimit` (`@/lib/rate-limit`), `getDateString` (`@/lib/streak/date`), `getDailyQuestions` / `maxDailyScore` (`@/lib/brain-dead/daily-service`).
- Produces:
  - Service (`@/lib/games/daily-finish-service`, server only):
    - `interface FinishPlayer { userId: string | null; guestId: string | null }`
    - `scoreBounds(db, game: CompetitiveGameId, playDate: string): Promise<{ min: number; max: number }>`
    - `findOwnScore(db, game, playDate, player: FinishPlayer): Promise<number | null>`
    - `recordFinish(db, game, playDate, score: number, player: FinishPlayer): Promise<number>` (returns the stored score, which is the earlier one if the player already finished today)
    - `dayCounts(db, game, playDate, score: number, direction: Direction): Promise<{ total: number; worse: number }>`
  - Route `/api/daily-finish`: `POST { game, score }` and `GET ?game=&score=`, both answering `{ percentile: number, source: "estimated" | "measured", sample: number, max: number }`; `400 { error: "INVALID_INPUT" }`, `429 { error: "RATE_LIMITED" }`, `503 { error: "UNAVAILABLE" }`.
  - Client (`@/lib/games/use-daily-percentile`):
    - `interface DailyPercentile { percentile: number; max: number | null }`
    - `useDailyPercentile(game: CompetitiveGameId, score: number, options: { enabled: boolean; record: boolean }): DailyPercentile | null`
    - `finishCurve(game: CompetitiveGameId, result: DailyPercentile | null): { percentile: number; lowLabel: string; highLabel: string } | null`

- [ ] **Step 1: Write the migration (do not apply it)**

Create `supabase/migrations/202610110000_daily_finishes.sql`:

```sql
-- One row per player per competitive daily per day, written when the game ends.
-- The finish screen's "better than X% of players" is computed from these rows.
-- The leaderboards only hold players who chose to enter a name, so they cannot be used for this.

create table public.daily_finishes (
  id         uuid primary key default extensions.gen_random_uuid(),
  game       text not null,
  play_date  date not null,
  -- The game's own score. For Getting Warmer it is the number of guesses.
  score      integer not null,
  user_id    uuid references public.profiles(id) on delete cascade,
  guest_id   uuid references public.guest_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint daily_finishes_game
    check (game in ('brain-dead', 'anyguessr', 'freezeframes', 'ball-knowledge', 'getting-warmer')),
  constraint daily_finishes_score_range
    check (score >= 0 and score <= 100000),
  constraint daily_finishes_one_player
    check (num_nonnulls(user_id, guest_id) = 1)
);

create unique index daily_finishes_user_uidx
  on public.daily_finishes (game, play_date, user_id) where user_id is not null;

create unique index daily_finishes_guest_uidx
  on public.daily_finishes (game, play_date, guest_id) where guest_id is not null;

create index daily_finishes_day_score_idx
  on public.daily_finishes (game, play_date, score);

alter table public.daily_finishes enable row level security;

-- Only the server reads and writes this table, through the service role.
revoke all on table public.daily_finishes from anon, authenticated;
```

- [ ] **Step 2: Add the table to the generated types by hand**

`lib/supabase/database.types.ts` is generated from a database, and this table is not in any database yet. Add this block inside `public: { Tables: { ... } }`, keeping the tables in alphabetical order (it goes after the last table whose name starts with `c` or `d` and sorts before `daily_finishes`):

```ts
      daily_finishes: {
        Row: {
          created_at: string
          game: string
          guest_id: string | null
          id: string
          play_date: string
          score: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          game: string
          guest_id?: string | null
          id?: string
          play_date: string
          score: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          game?: string
          guest_id?: string | null
          id?: string
          play_date?: string
          score?: number
          user_id?: string | null
        }
        Relationships: []
      }
```

- [ ] **Step 3: Write the failing service test**

Create `tests/lib/games/daily-finish-service.test.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

vi.mock("@/lib/brain-dead/daily-service", () => ({
  getDailyQuestions: vi.fn(async () => [{ d: 1 }, { d: 2 }]),
  maxDailyScore: vi.fn(() => 2250),
}));

import { getDailyQuestions } from "@/lib/brain-dead/daily-service";
import { dayCounts, findOwnScore, recordFinish, scoreBounds } from "@/lib/games/daily-finish-service";

interface Row {
  id: string;
  game: string;
  play_date: string;
  score: number;
  user_id: string | null;
  guest_id: string | null;
}

/** Just enough of the Supabase query builder for this service: eq/lt/gt filters, counts, one insert. */
function fakeDb(rows: Row[]) {
  const query = (head: boolean) => {
    const filters: ((row: Row) => boolean)[] = [];
    const run = () => rows.filter((row) => filters.every((keep) => keep(row)));
    const q = {
      eq(column: keyof Row, value: unknown) {
        filters.push((row) => row[column] === value);
        return q;
      },
      lt(column: keyof Row, value: number) {
        filters.push((row) => (row[column] as number) < value);
        return q;
      },
      gt(column: keyof Row, value: number) {
        filters.push((row) => (row[column] as number) > value);
        return q;
      },
      async maybeSingle() {
        return { data: run()[0] ?? null, error: null };
      },
      then<T>(resolve: (value: { data: Row[] | null; count: number; error: null }) => T) {
        const found = run();
        return Promise.resolve({ data: head ? null : found, count: found.length, error: null }).then(resolve);
      },
    };
    return q;
  };

  return {
    from: () => ({
      select: (_columns: string, options?: { head?: boolean }) => query(Boolean(options?.head)),
      insert: async (row: Omit<Row, "id">) => {
        rows.push({ id: String(rows.length + 1), ...row });
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient<Database>;
}

const DAY = "2026-10-11";
const guest = (id: string) => ({ userId: null, guestId: id });
const row = (score: number, guestId: string, game = "freezeframes", date = DAY): Row => ({
  id: guestId,
  game,
  play_date: date,
  score,
  user_id: null,
  guest_id: guestId,
});

describe("recordFinish", () => {
  let rows: Row[];
  beforeEach(() => {
    rows = [];
  });

  it("stores the first finish of the day", async () => {
    const stored = await recordFinish(fakeDb(rows), "freezeframes", DAY, 2400, guest("g1"));

    expect(stored).toBe(2400);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ game: "freezeframes", play_date: DAY, score: 2400, guest_id: "g1", user_id: null });
  });

  it("keeps the first score when the same player posts again", async () => {
    const db = fakeDb(rows);
    await recordFinish(db, "freezeframes", DAY, 2400, guest("g1"));
    const stored = await recordFinish(db, "freezeframes", DAY, 4000, guest("g1"));

    expect(stored).toBe(2400);
    expect(rows).toHaveLength(1);
  });

  it("stores a signed-in player under their user id, not a guest id", async () => {
    await recordFinish(fakeDb(rows), "anyguessr", DAY, 500, { userId: "u1", guestId: "g1" });
    expect(rows[0]).toMatchObject({ user_id: "u1", guest_id: null });
  });

  it("keeps games and days apart", async () => {
    const db = fakeDb(rows);
    await recordFinish(db, "freezeframes", DAY, 2400, guest("g1"));
    await recordFinish(db, "anyguessr", DAY, 300, guest("g1"));
    await recordFinish(db, "freezeframes", "2026-10-12", 100, guest("g1"));
    expect(rows).toHaveLength(3);
  });
});

describe("findOwnScore", () => {
  it("returns null for a player with no identity or no finish", async () => {
    const db = fakeDb([row(900, "g1")]);
    expect(await findOwnScore(db, "freezeframes", DAY, { userId: null, guestId: null })).toBeNull();
    expect(await findOwnScore(db, "freezeframes", DAY, guest("g2"))).toBeNull();
    expect(await findOwnScore(db, "freezeframes", DAY, guest("g1"))).toBe(900);
  });
});

describe("dayCounts", () => {
  const rows = [row(100, "a"), row(200, "b"), row(200, "c"), row(300, "d"), row(999, "e", "anyguessr"), row(50, "f", "freezeframes", "2026-10-10")];

  it("counts only strictly lower scores as worse when higher is better", async () => {
    expect(await dayCounts(fakeDb(rows), "freezeframes", DAY, 200, "higher")).toEqual({ total: 4, worse: 1 });
  });

  it("counts only strictly higher scores as worse when lower is better", async () => {
    expect(await dayCounts(fakeDb(rows), "freezeframes", DAY, 200, "lower")).toEqual({ total: 4, worse: 1 });
    expect(await dayCounts(fakeDb(rows), "freezeframes", DAY, 100, "lower")).toEqual({ total: 4, worse: 3 });
  });

  it("is zero on a day nobody has played", async () => {
    expect(await dayCounts(fakeDb([]), "freezeframes", DAY, 200, "higher")).toEqual({ total: 0, worse: 0 });
  });
});

describe("scoreBounds", () => {
  const db = fakeDb([]);

  it("uses each game's own limits", async () => {
    expect(await scoreBounds(db, "anyguessr", DAY)).toEqual({ min: 0, max: 700 });
    expect(await scoreBounds(db, "freezeframes", DAY)).toEqual({ min: 0, max: 4000 });
    expect(await scoreBounds(db, "ball-knowledge", DAY)).toEqual({ min: 0, max: 200 });
    expect(await scoreBounds(db, "getting-warmer", DAY)).toEqual({ min: 1, max: 500 });
  });

  it("limits Brain Dead to a perfect run of that day's questions", async () => {
    expect(await scoreBounds(db, "brain-dead", DAY)).toEqual({ min: 0, max: 2250 });
  });

  it("falls back to the all-days ceiling when the day's questions cannot be loaded", async () => {
    vi.mocked(getDailyQuestions).mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await scoreBounds(db, "brain-dead", DAY)).toEqual({ min: 0, max: 6750 });
  });
});
```

- [ ] **Step 4: Run to see it fail**

Run: `pnpm exec vitest run tests/lib/games/daily-finish-service.test.ts`
Expected: FAIL, cannot resolve `@/lib/games/daily-finish-service`.

- [ ] **Step 5: Implement the service**

Create `lib/games/daily-finish-service.ts`:

```ts
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DAILY_MAX_ROUND_SCORE } from "@/lib/anyguessr/daily";
import { LINEUP_ROUNDS } from "@/lib/anyguessr/lineup";
import { MAX_SCORE as BALL_KNOWLEDGE_MAX } from "@/lib/ball-knowledge/game-logic";
import { getDailyQuestions, maxDailyScore } from "@/lib/brain-dead/daily-service";
import { MAX_DAILY_SCORE as FREEZEFRAMES_MAX } from "@/lib/freezeframes/game-logic";
import type { CompetitiveGameId, Direction } from "@/lib/games/percentile";
import { MAX_LEADERBOARD_GUESSES } from "@/lib/getting-warmer/game-logic";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/** Same ceiling the Brain Dead leaderboard route uses when the day's questions cannot be read. */
const BRAIN_DEAD_CEILING = 6750;

export interface FinishPlayer {
  userId: string | null;
  guestId: string | null;
}

/** The lowest and highest score a player could honestly post for this game today. */
export async function scoreBounds(db: Db, game: CompetitiveGameId, playDate: string): Promise<{ min: number; max: number }> {
  switch (game) {
    case "brain-dead":
      try {
        return { min: 0, max: maxDailyScore(await getDailyQuestions(db, playDate)) };
      } catch (err) {
        console.error("Could not load the daily to bound a score:", err);
        return { min: 0, max: BRAIN_DEAD_CEILING };
      }
    case "anyguessr":
      return { min: 0, max: LINEUP_ROUNDS * DAILY_MAX_ROUND_SCORE };
    case "freezeframes":
      return { min: 0, max: FREEZEFRAMES_MAX };
    case "ball-knowledge":
      return { min: 0, max: BALL_KNOWLEDGE_MAX };
    case "getting-warmer":
      return { min: 1, max: MAX_LEADERBOARD_GUESSES };
  }
}

export async function findOwnScore(
  db: Db,
  game: CompetitiveGameId,
  playDate: string,
  player: FinishPlayer,
): Promise<number | null> {
  if (!player.userId && !player.guestId) return null;

  const query = db.from("daily_finishes").select("score").eq("game", game).eq("play_date", playDate);
  const { data, error } = await (player.userId
    ? query.eq("user_id", player.userId)
    : query.eq("guest_id", player.guestId!)
  ).maybeSingle();

  if (error) throw new Error(error.message);
  return data?.score ?? null;
}

/**
 * Stores the player's finish for the day and returns the stored score. A player's first
 * finish of the day is the one that counts: a later post never changes it.
 */
export async function recordFinish(
  db: Db,
  game: CompetitiveGameId,
  playDate: string,
  score: number,
  player: FinishPlayer,
): Promise<number> {
  const existing = await findOwnScore(db, game, playDate, player);
  if (existing !== null) return existing;

  const { error } = await db.from("daily_finishes").insert({
    game,
    play_date: playDate,
    score,
    user_id: player.userId,
    guest_id: player.userId ? null : player.guestId,
  });

  if (error) {
    // Two requests from the same player can race; the unique index lets one in. Use that one.
    const raced = await findOwnScore(db, game, playDate, player);
    if (raced !== null) return raced;
    throw new Error(error.message);
  }

  return score;
}

/** How many players finished this game today, and how many of them did strictly worse than `score`. */
export async function dayCounts(
  db: Db,
  game: CompetitiveGameId,
  playDate: string,
  score: number,
  direction: Direction,
): Promise<{ total: number; worse: number }> {
  const today = () =>
    db.from("daily_finishes").select("id", { count: "exact", head: true }).eq("game", game).eq("play_date", playDate);

  const [all, worse] = await Promise.all([
    today(),
    direction === "higher" ? today().lt("score", score) : today().gt("score", score),
  ]);

  if (all.error) throw new Error(all.error.message);
  if (worse.error) throw new Error(worse.error.message);
  return { total: all.count ?? 0, worse: worse.count ?? 0 };
}
```

Run: `pnpm exec vitest run tests/lib/games/daily-finish-service.test.ts && pnpm typecheck`
Expected: PASS. If typecheck complains that `"daily_finishes"` is not a table, Step 2's block is in the wrong place in `database.types.ts`.

Check one assumption while here: `grep -n "LINEUP_ROUNDS" lib/anyguessr/*.ts app/api/anyguessr/daily/route.ts`. The daily must always have `LINEUP_ROUNDS` (7) rounds for the AnyGuessr bound of 700 to be right. If the daily can have more, make the AnyGuessr case `max: 10 * DAILY_MAX_ROUND_SCORE` and update the test.

- [ ] **Step 6: Write the failing route test**

Create `tests/api/daily-finish.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock("@/features/guest/session", () => ({
  ensureGuestSession: vi.fn(async () => ({ guestId: "g1" })),
  requireGuestSession: vi.fn(async () => ({ guestId: "g1" })),
}));
vi.mock("@/lib/games/daily-finish-service", () => ({
  scoreBounds: vi.fn(async (_db: unknown, game: string) =>
    game === "getting-warmer" ? { min: 1, max: 500 } : { min: 0, max: 4000 },
  ),
  recordFinish: vi.fn(async (_db: unknown, _game: string, _date: string, score: number) => score),
  findOwnScore: vi.fn(async () => null),
  dayCounts: vi.fn(async () => ({ total: 3, worse: 1 })),
}));

import { GET, POST } from "@/app/api/daily-finish/route";
import { requireGuestSession } from "@/features/guest/session";
import { dayCounts, findOwnScore, recordFinish } from "@/lib/games/daily-finish-service";
import { estimatedPercentile } from "@/lib/games/percentile";
import { _resetRateLimitStore } from "@/lib/rate-limit";

const post = (body: unknown) =>
  POST(
    new Request("https://example.test/api/daily-finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const get = (query: string) => GET(new Request(`https://example.test/api/daily-finish${query}`));

describe("/api/daily-finish", () => {
  beforeEach(() => {
    _resetRateLimitStore();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST", () => {
    it("records the finish and answers with an estimate while few have played", async () => {
      const res = await post({ game: "freezeframes", score: 2200 });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        percentile: estimatedPercentile("freezeframes", 2200, 4000),
        source: "estimated",
        sample: 3,
        max: 4000,
      });
      expect(recordFinish).toHaveBeenCalledWith(expect.anything(), "freezeframes", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 2200, {
        userId: null,
        guestId: "g1",
      });
    });

    it("answers for the stored score when the player had already finished today", async () => {
      vi.mocked(recordFinish).mockResolvedValueOnce(900);

      const res = await post({ game: "freezeframes", score: 4000 });
      const body = await res.json();

      expect(dayCounts).toHaveBeenCalledWith(expect.anything(), "freezeframes", expect.any(String), 900, "higher");
      expect(body.percentile).toBe(estimatedPercentile("freezeframes", 900, 4000));
    });

    it("measures against the other players once thirty have finished", async () => {
      vi.mocked(dayCounts).mockResolvedValueOnce({ total: 41, worse: 30 });

      const body = await (await post({ game: "freezeframes", score: 2200 })).json();

      expect(body).toMatchObject({ percentile: 75, source: "measured", sample: 41 });
    });

    it("asks for players who needed more guesses in Getting Warmer", async () => {
      await post({ game: "getting-warmer", score: 6 });
      expect(dayCounts).toHaveBeenCalledWith(expect.anything(), "getting-warmer", expect.any(String), 6, "lower");
    });

    it.each([
      ["a game that is not competitive", { game: "chainlink", score: 3 }],
      ["a missing score", { game: "freezeframes" }],
      ["a score that is not a whole number", { game: "freezeframes", score: 12.5 }],
      ["a negative score", { game: "freezeframes", score: -1 }],
      ["a score above the game's maximum", { game: "freezeframes", score: 4001 }],
      ["zero guesses in Getting Warmer", { game: "getting-warmer", score: 0 }],
      ["a body that is not JSON", "not json"],
    ])("refuses %s", async (_name, body) => {
      const res = await post(body);

      expect(res.status).toBe(400);
      expect(recordFinish).not.toHaveBeenCalled();
    });

    it("answers 503 when the table cannot be read", async () => {
      vi.mocked(recordFinish).mockRejectedValueOnce(new Error('relation "daily_finishes" does not exist'));

      const res = await post({ game: "freezeframes", score: 2200 });

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "UNAVAILABLE" });
    });
  });

  describe("GET", () => {
    it("answers without recording anything", async () => {
      const res = await get("?game=freezeframes&score=2200");

      expect(res.status).toBe(200);
      expect((await res.json()).percentile).toBe(estimatedPercentile("freezeframes", 2200, 4000));
      expect(recordFinish).not.toHaveBeenCalled();
    });

    it("leaves the player out of the crowd only when their finish is stored", async () => {
      vi.mocked(dayCounts).mockResolvedValueOnce({ total: 31, worse: 15 });
      vi.mocked(findOwnScore).mockResolvedValueOnce(2200);
      expect((await (await get("?game=freezeframes&score=2200")).json()).percentile).toBe(50);

      vi.mocked(dayCounts).mockResolvedValueOnce({ total: 31, worse: 15 });
      vi.mocked(findOwnScore).mockResolvedValueOnce(null);
      expect((await (await get("?game=freezeframes&score=2200")).json()).percentile).toBe(48);
    });

    it("works for a visitor with no guest session, without creating one", async () => {
      vi.mocked(requireGuestSession).mockRejectedValueOnce(new Error("No guest session found"));

      const res = await get("?game=anyguessr&score=400");

      expect(res.status).toBe(200);
      expect(findOwnScore).toHaveBeenCalledWith(expect.anything(), "anyguessr", expect.any(String), { userId: null, guestId: null });
    });

    it.each(["", "?game=freezeframes", "?game=freezeframes&score=", "?game=freezeframes&score=abc", "?game=hot-takes&score=5", "?game=freezeframes&score=9999"])(
      "refuses %s",
      async (query) => {
        expect((await get(query)).status).toBe(400);
      },
    );
  });
});
```

Run: `pnpm exec vitest run tests/api/daily-finish.test.ts`
Expected: FAIL, cannot resolve `@/app/api/daily-finish/route`.

- [ ] **Step 7: Implement the route**

Create `app/api/daily-finish/route.ts`:

```ts
import { z } from "zod/v4";
import { ensureGuestSession, requireGuestSession } from "@/features/guest/session";
import {
  dayCounts,
  findOwnScore,
  recordFinish,
  scoreBounds,
  type FinishPlayer,
} from "@/lib/games/daily-finish-service";
import { COMPETITIVE_GAMES, DIRECTION, percentileFor, type CompetitiveGameId } from "@/lib/games/percentile";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDateString } from "@/lib/streak/date";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Schema-level ceiling; each game's real limits are checked against `scoreBounds`. */
const SCORE_CEILING = 100_000;

const postSchema = z.object({
  game: z.enum(COMPETITIVE_GAMES),
  score: z.number().int().min(0).max(SCORE_CEILING),
});

const getSchema = z.object({
  game: z.enum(COMPETITIVE_GAMES),
  score: z
    .string()
    .regex(/^\d{1,6}$/)
    .transform(Number),
});

const invalid = () => Response.json({ error: "INVALID_INPUT" }, { status: 400 });

function rateLimited(key: string, max: number): Response | null {
  const result = checkRateLimit(key, max, 60 * 1000);
  if (result.allowed) return null;
  return Response.json(
    { error: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } },
  );
}

async function signedInUserId(): Promise<string | null> {
  const supa = await createClient();
  const { data } = await supa.auth.getUser();
  return data.user?.id ?? null;
}

/** `record` stores the finish first (the game just ended); otherwise this only reads. */
async function answer(game: CompetitiveGameId, score: number, player: FinishPlayer, record: boolean): Promise<Response> {
  try {
    const db = createAdminClient();
    const playDate = getDateString();

    const bounds = await scoreBounds(db, game, playDate);
    if (score < bounds.min || score > bounds.max) return invalid();

    // A player's first finish of the day is the one that counts, so a repeat post is
    // answered for the stored score, not the one just sent.
    const counted = record ? await recordFinish(db, game, playDate, score, player) : score;
    const ownCounted = record || (await findOwnScore(db, game, playDate, player)) !== null;
    const counts = await dayCounts(db, game, playDate, counted, DIRECTION[game]);

    return Response.json({
      ...percentileFor({ game, score: counted, max: bounds.max, total: counts.total, worse: counts.worse, ownCounted }),
      max: bounds.max,
    });
  } catch (err) {
    // The finish screen shows the result without the curve when this fails.
    console.error("Could not work out a daily percentile:", err);
    return Response.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const limited = rateLimited("daily-finish-post", 300);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return invalid();

  const userId = await signedInUserId();
  let guestId: string | null = null;
  if (!userId) {
    try {
      guestId = (await ensureGuestSession()).guestId;
    } catch {
      return Response.json({ error: "INVALID_GUEST_SESSION" }, { status: 400 });
    }
  }

  return answer(parsed.data.game, parsed.data.score, { userId, guestId }, true);
}

export async function GET(request: Request) {
  const limited = rateLimited("daily-finish-get", 600);
  if (limited) return limited;

  const parsed = getSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return invalid();

  const userId = await signedInUserId();
  let guestId: string | null = null;
  if (!userId) {
    try {
      guestId = (await requireGuestSession()).guestId;
    } catch {
      // No guest session yet. Reading a percentile is not a reason to create one.
    }
  }

  return answer(parsed.data.game, parsed.data.score, { userId, guestId }, false);
}
```

Run: `pnpm exec vitest run tests/api/daily-finish.test.ts`
Expected: PASS. (The "leaves the player out" test expects 15/30 = 50 with a stored finish and 15/31 = 48 without.)

- [ ] **Step 8: Write the failing hook test**

Create `tests/lib/games/use-daily-percentile.test.tsx`:

```tsx
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";

const fetchMock = vi.fn();
const ok = (body: unknown) => ({ ok: true, json: async () => body });

describe("useDailyPercentile", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does nothing until it is enabled", () => {
    const { result } = renderHook(() => useDailyPercentile("freezeframes", 2200, { enabled: false, record: true }));

    expect(result.current).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the finish when the game has just ended", async () => {
    fetchMock.mockResolvedValue(ok({ percentile: 64, source: "estimated", sample: 2, max: 4000 }));

    const { result } = renderHook(() => useDailyPercentile("freezeframes", 2200, { enabled: true, record: true }));

    await waitFor(() => expect(result.current).toEqual({ percentile: 64, max: 4000 }));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/daily-finish",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ game: "freezeframes", score: 2200 }) }),
    );
  });

  it("only reads on a return visit", async () => {
    fetchMock.mockResolvedValue(ok({ percentile: 31, source: "measured", sample: 80, max: 500 }));

    const { result } = renderHook(() => useDailyPercentile("getting-warmer", 9, { enabled: true, record: false }));

    await waitFor(() => expect(result.current).toEqual({ percentile: 31, max: 500 }));
    expect(fetchMock).toHaveBeenCalledWith("/api/daily-finish?game=getting-warmer&score=9", expect.anything());
  });

  it.each([
    ["the server refuses", () => Promise.resolve({ ok: false, json: async () => ({ error: "UNAVAILABLE" }) })],
    ["the network fails", () => Promise.reject(new Error("offline"))],
    ["the answer has no percentile", () => Promise.resolve(ok({ sample: 3 }))],
  ])("stays null when %s", async (_name, respond) => {
    fetchMock.mockImplementation(respond);

    const { result } = renderHook(() => useDailyPercentile("freezeframes", 2200, { enabled: true, record: true }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBeNull();
  });
});

describe("finishCurve", () => {
  it("is null until there is a percentile", () => {
    expect(finishCurve("freezeframes", null)).toBeNull();
  });

  it("adds the axis labels for the game", () => {
    expect(finishCurve("freezeframes", { percentile: 64, max: 4000 })).toEqual({
      percentile: 64,
      lowLabel: "0",
      highLabel: "4,000",
    });
    expect(finishCurve("getting-warmer", { percentile: 31, max: 500 })).toEqual({
      percentile: 31,
      lowLabel: "most guesses",
      highLabel: "fewest",
    });
  });
});
```

Run: `pnpm exec vitest run tests/lib/games/use-daily-percentile.test.tsx`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 9: Implement the hook**

Create `lib/games/use-daily-percentile.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { axisLabels, type CompetitiveGameId } from "@/lib/games/percentile";

export interface DailyPercentile {
  percentile: number;
  /** The day's highest possible score, for the curve's axis. */
  max: number | null;
}

/**
 * How the player did against everyone who finished this game today.
 *
 * `record: true` is for a game that has just ended: it stores the finish, then reads.
 * `record: false` is for a return visit, where the score comes from local storage.
 * Returns null while loading and whenever the request fails; the finish screen then
 * shows the result without the curve.
 */
export function useDailyPercentile(
  game: CompetitiveGameId,
  score: number,
  { enabled, record }: { enabled: boolean; record: boolean },
): DailyPercentile | null {
  const [result, setResult] = useState<DailyPercentile | null>(null);

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      return;
    }

    let cancelled = false;
    const request = record
      ? fetch("/api/daily-finish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ game, score }),
        })
      : fetch(`/api/daily-finish?game=${game}&score=${score}`, { credentials: "same-origin" });

    request
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { percentile?: unknown; max?: unknown } | null) => {
        if (cancelled || !data || typeof data.percentile !== "number") return;
        setResult({ percentile: data.percentile, max: typeof data.max === "number" ? data.max : null });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [game, score, enabled, record]);

  return result;
}

/** The `curve` prop for `FinishScreen`, or null when there is nothing to draw. */
export function finishCurve(
  game: CompetitiveGameId,
  result: DailyPercentile | null,
): { percentile: number; lowLabel: string; highLabel: string } | null {
  if (!result) return null;
  return { percentile: result.percentile, ...axisLabels(game, result.max) };
}
```

- [ ] **Step 10: Gate and commit**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint lib/games app/api/daily-finish tests/api/daily-finish.test.ts tests/lib/games`
Expected: all pass, no ESLint errors in these files.

```bash
git add supabase/migrations/202610110000_daily_finishes.sql lib/supabase/database.types.ts lib/games/daily-finish-service.ts lib/games/use-daily-percentile.ts app/api/daily-finish tests/api/daily-finish.test.ts tests/lib/games/daily-finish-service.test.ts tests/lib/games/use-daily-percentile.test.tsx
git commit -m "feat(daily): record competitive finishes and serve a percentile"
```

- [ ] **Step 11: Ask the user about the migration**

Until `daily_finishes` exists in the hosted database, the route answers 503 and every competitive game shows its result without a curve. Ask the user: "The finish table needs to be created in the hosted Supabase project before the bell curve can show. Do you want me to apply it, or will you run the SQL yourself?"

If they want you to apply it, list what would be pushed first:

```bash
pnpm exec supabase db push --dry-run
```

Go ahead with `pnpm exec supabase db push` only if `202610110000_daily_finishes.sql` is the only migration listed. If anything else is listed, stop and show the user the list; other sessions' migrations must not go out with this one. If they would rather do it themselves, give them the path of the SQL file. Carry on with Task 6 either way.

---

### A note for Tasks 6 to 11: results are drawn outside the game's page

`FinishScreen` renders into a portal on `<body>`, so the `result` node is not inside the game's page element. Chain Link, AnyGuessr and Getting Warmer already render their results that way. Brain Dead, Freeze Frames, Ball Knowledge and Hot Takes do not: today they put their whole page inside the overlay. Before moving a game's result markup, check what its CSS inherits from the page:

```bash
grep -n "^\.bd-game\b\|^\.freezeframes-app\b\|^\.bk-page\b\|^\.bk-app\b\|^\.hot-takes-page\b\|^\.hot-takes-wrap\b" -A12 app/brain-dead.css app/freezeframes.css app/ball-knowledge.css app/hot-takes.css
grep -n "\.bd-game \.\|\.freezeframes-app \.\|\.bk-page \.\|\.bk-app \.\|\.hot-takes-page \.\|\.hot-takes-wrap \." app/*.css
```

- If the page element sets `font-family`, `color`, or custom properties that the result's rules use, copy those declarations onto the result's root class (named in each task: `.bd-result`, `.ff-fin`, `.bk-finish`, `.hot-takes-finish`).
- If a rule for a class used in the result is written as a descendant of the page element (second grep), remove the ancestor from that selector.
- Leave layout declarations (`min-height`, `padding`, `max-width`, backgrounds) on the page element.

---

### Task 6: Brain Dead uses the finish screen

**Files:**
- Modify: `components/brain-dead/game.tsx`
- Modify: `app/brain-dead.css` (delete `.bd-note` and the `.bd-result-actions .share-result*` rules; add `.bd-free-link` and `.bd-reopen`)

**Interfaces:**
- Consumes: `FinishScreen` (Task 3); `useDailyPercentile`, `finishCurve` (Task 5).
- Produces: nothing new.

- [ ] **Step 1: Imports and state**

In `components/brain-dead/game.tsx`:

Delete these imports:

```ts
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { DailyCompleteShell } from "@/components/daily/daily-complete-shell";
import { WinStreakLine } from "@/components/streak/streak-notifier";
```

Add:

```ts
import { FinishScreen } from "@/components/daily/finish-screen";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";
```

Remove `getCountdownText,` from the `@/lib/brain-dead/game-logic` import. Delete the `OVERLAY_THEME` constant and its comment. Delete the `countdown` state line (`const [countdown, setCountdown] = useState("");`).

In the mount effect, the "already played" branch becomes:

```ts
      const played = getDailyPlayed();
      if (played) {
        setTodayScore(played.score);
        setTodayCorrect(played.correct);
        setScreen("played");
        return () => { cancelled = true; };
      }
```

- [ ] **Step 2: Ask for the percentile**

Directly after the "Freeplay: prefetch questions" effect and before `handleSubmitScore`, add:

```ts
  const dailyDone = isDaily && (screen === "played" || screen === "result");
  // A return visit reads the saved result; a run that just ended uses the live one.
  const finalScore = screen === "played" ? todayScore : score;
  const finalCorrect = screen === "played" ? todayCorrect : correct;
  const standing = useDailyPercentile("brain-dead", finalScore, { enabled: dailyDone, record: screen === "result" });
```

- [ ] **Step 3: Simplify `gameShell`**

The `bare` option existed so the overlay could hold the page without its header. Replace `gameShell` with:

```tsx
  const gameShell = (
    children: React.ReactNode,
    options?: { useRouterBack?: boolean; stats?: React.ReactNode },
  ) => (
    <div className="bd-game">
      <header className="bd-head">
        {options?.useRouterBack ? (
          <button type="button" className="bd-back" onClick={() => router.push(backHref)}>
            &larr; Back
          </button>
        ) : (
          <Link href={backHref} className="bd-back">
            &larr; Back
          </Link>
        )}
        <GameTitle game="brain-dead" as="h1" className="bd-title" />
        <span />
        {options?.stats && <div className="bd-stats-line">{options.stats}</div>}
      </header>
      {children}
    </div>
  );
```

Delete the `inOverlay` constant, the `dailyLinks` constant, and the comment above the old `gameShell`.

- [ ] **Step 4: Replace the "played" and "result" screens**

Replace everything from `/* ── Already played ── */` down to the end of the `if (screen === "result") { ... }` block with:

```tsx
  /* ── Daily: just finished, or already played today ── */
  if (dailyDone) {
    const justFinished = screen === "result";

    const body = (
      <div className={`bd-result${justFinished ? " anim-fade-slide-up" : ""}`}>
        {justFinished ? (
          <>
            <div className="bd-badge" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
            <h2>{result.title}</h2>
            <p className="bd-result-sub">{result.sub}</p>
          </>
        ) : (
          <p className="bd-eyebrow">Today&apos;s result</p>
        )}

        <div className="bd-big">{finalCorrect}</div>
        <div className="bd-big-label">correct</div>
        <div className="bd-stats">
          <div>
            <b>{finalScore}</b>
            <span>Score</span>
          </div>
          {justFinished && (
            <div>
              <b>{avgSpeed}s</b>
              <span>Avg time</span>
            </div>
          )}
        </div>

        {justFinished && !submitted && (
          <div className="bd-record">
            <input
              className="bd-name"
              placeholder="Enter your name"
              aria-label="Your name for the leaderboard"
              maxLength={20}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <button type="button" className="bd-btn is-accent" onClick={handleSubmitScore} disabled={submitting}>
              {submitting ? "Saving..." : "Record score"}
            </button>
            {submitError && <p className="bd-record-note is-error">Could not save score. Try again.</p>}
          </div>
        )}
        {submitted && <p className="bd-record-note is-ok">Score recorded.</p>}

        <Link href="/brain-dead/freeplay" className="bd-free-link">
          Play Free Mode
        </Link>
      </div>
    );

    return (
      <>
        {/* Under the finish screen the page shows the same result, with a way back to the summary. */}
        {gameShell(
          completeOpen ? null : (
            <>
              {body}
              <button type="button" className="bd-btn bd-reopen" onClick={() => setCompleteOpen(true)}>
                Back to today&apos;s summary
              </button>
            </>
          ),
        )}
        <FinishScreen
          gameId="brain-dead"
          open={completeOpen}
          onClose={() => setCompleteOpen(false)}
          result={body}
          shareText={brainDeadShare(finalCorrect, finalScore, shareDate(), justFinished ? questions.length || 15 : undefined)}
          secondary={{ label: "Leaderboard", href: "/brain-dead/leaderboard" }}
          curve={finishCurve("brain-dead", standing)}
        />
      </>
    );
  }

  /* ── Freeplay result ── */
  if (screen === "result") {
    return gameShell(
      <div className="bd-result anim-fade-slide-up">
        <div className="bd-badge" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
        </div>
        <h2>{result.title}</h2>
        <p className="bd-result-sub">{result.sub}</p>

        <div className="bd-big">{correct}</div>
        <div className="bd-big-label">correct</div>
        <div className="bd-stats">
          <div>
            <b>{score}</b>
            <span>Score</span>
          </div>
          <div>
            <b>{avgSpeed}s</b>
            <span>Avg time</span>
          </div>
        </div>

        <div className="bd-result-actions">
          <button type="button" className="bd-cta" onClick={handleFreeplayRestart}>
            Play Again
          </button>
        </div>
        <div className="bd-links">
          <button type="button" className="bd-btn" onClick={() => router.push(freeplayBackHref)}>
            Change Category
          </button>
          <button type="button" className="bd-btn" onClick={() => router.push("/")}>
            Home
          </button>
        </div>
      </div>,
      { useRouterBack: true },
    );
  }
```

- [ ] **Step 5: CSS**

In `app/brain-dead.css`: delete the `.bd-note` rule and the three rules whose selectors start with `.bd-result-actions .share-result`. Add after `.bd-links`:

```css
.bd-free-link {
  display: inline-block;
  margin-top: 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--bd-text-secondary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.bd-free-link:hover { color: var(--bd-text); }
.bd-reopen { margin: 18px auto 0; }
```

Then do the check from "A note for Tasks 6 to 11" for `.bd-game` and `.bd-result`.

Run: `grep -rn "bd-note\|DailyCompleteShell\|OtherDailies\|WinStreakLine\|inOverlay\|dailyLinks\|getCountdownText" components/brain-dead app/brain-dead.css`
Expected: no output.

- [ ] **Step 6: Gate**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint components/brain-dead/game.tsx && pnpm build`
Expected: all pass, nothing new from ESLint in this file.

- [ ] **Step 7: Check it in the browser**

`http://localhost:3210/brain-dead/daily`, at 1280px and 390px, dark and light:

- Play to a wrong answer. The finish screen opens with the badge, title, big number, Score and Avg time, the name box, and "Play Free Mode".
- If the migration is applied: the bell curve appears under the result, the shaded area and "YOU" marker slide in once, the number counts up, and the axis reads `0 … everyone who played today … <day's max>`. If it is not applied: no curve, no error on screen, and the rest of the page is intact.
- Type a name and record the score: "Score recorded." replaces the form without closing the screen.
- "Share result" and "Leaderboard" sit side by side.
- Close with ×: the same result is on the page with "Back to today's summary", which reopens the screen.
- Reload: the return-visit version shows "Today's result", the number and the score, with the curve read by GET (check the Network tab: one GET to `/api/daily-finish`, no POST).
- Free mode (`/brain-dead/freeplay`, pick a category, lose): the old result screen with "Play Again", no finish screen.
- Small labels are readable on the dark theme.

- [ ] **Step 8: Show the user, then commit**

```bash
git add components/brain-dead/game.tsx app/brain-dead.css
git commit -m "feat(brain-dead): finish screen with score percentile"
```

---

### Task 7: AnyGuessr uses the finish screen

**Files:**
- Modify: `components/anyguessr/results.tsx` (drop share, "More dailies" and the footer line)
- Modify: `components/anyguessr/game.tsx` (overlay at lines 306–322, the "playing" effect at 73–79)
- Modify: `app/anyguessr.css` (delete `.ag-results-actions*` and `.ag-results-foot` rules)

**Interfaces:**
- Consumes: `FinishScreen`; `useDailyPercentile`, `finishCurve`; existing `anyGuessrShare(rounds, totalScore, date)`.

- [ ] **Step 1: Trim `Results`**

In `components/anyguessr/results.tsx` delete these imports:

```ts
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { anyGuessrShare } from "@/lib/share/results";
```

and delete this from the end of the component's JSX:

```tsx
      <div className="ag-results-actions">
        <ShareResult gameId="anyguessr" text={anyGuessrShare(rounds, store.totalScore, store.date)} />
      </div>
      <OtherDailies currentGameId="anyguessr" />

      <p className="ag-results-foot">A new set of countries arrives tomorrow.</p>
```

- [ ] **Step 2: Wire the game**

In `components/anyguessr/game.tsx`:

Delete:

```ts
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";
import { WinStreakLine } from "@/components/streak/streak-notifier";
```

Add:

```ts
import { FinishScreen } from "@/components/daily/finish-screen";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";
import { anyGuessrShare } from "@/lib/share/results";
```

Next to `const playedThisVisitRef = useRef(false);` add:

```ts
  // Same fact as the ref, as state, so the finish is recorded once and return visits only read.
  const [playedThisVisit, setPlayedThisVisit] = useState(false);
```

In the effect that sets `playedThisVisitRef.current = true`, set the state as well:

```ts
      if (storeReady && !loading && store.dailyRounds.length > 0) {
        playedThisVisitRef.current = true;
        setPlayedThisVisit(true);
      }
```

After `const showRoundRecap = !!store.roundRecap;` add:

```ts
  const standing = useDailyPercentile("anyguessr", store.totalScore, {
    enabled: storeReady && !loading && isOver,
    record: playedThisVisit,
  });
```

Replace the whole `<DailyCompleteOverlay ...> ... </DailyCompleteOverlay>` element with:

```tsx
      <FinishScreen
        gameId="anyguessr"
        open={mounted && showResultsOverlay}
        onClose={() => setShowResultsOverlay(false)}
        ariaLabel="Puzzle results"
        result={<Results scoreActive embedded />}
        shareText={anyGuessrShare(store.roundResults, store.totalScore, store.date)}
        curve={finishCurve("anyguessr", standing)}
        theme={{ "--fin-result-w": "640px" } as CSSProperties}
      />
```

- [ ] **Step 3: CSS**

In `app/anyguessr.css` delete every rule whose selector starts with `.ag-results-actions`, and the `.ag-results-foot` rule.

Run: `grep -rn "ag-results-actions\|ag-results-foot\|WinStreakLine\|OtherDailies" components/anyguessr app/anyguessr.css`
Expected: no output.

- [ ] **Step 4: Gate**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint components/anyguessr/game.tsx components/anyguessr/results.tsx`
Expected: all pass. `tests/components/anyguessr-first-render*.test.tsx` must still pass; they render the game before anything is finished.

- [ ] **Step 5: Check it in the browser**

`http://localhost:3210/anyguessr/daily`, 1280px and 390px, dark and light. Play all seven rounds (use "Give up this round" to move quickly).

- After the last recap the finish screen opens: score out of 700, tally, passport stamps, round detail with arrows. The result is wider than the cards below it on desktop (640px against 440px) and nothing overflows on the phone.
- Curve (if the migration is applied) between the round detail and the buttons, axis `0 … 700`.
- Only "Share result" in the actions row (no second button), centred.
- Left and right arrow keys still step through rounds.
- Close: the map with "See your results", which reopens it.
- Reload: opens again; Network shows a GET, not a POST.
- The streak line shows whatever the score was (it no longer depends on a win).

- [ ] **Step 6: Show the user, then commit**

```bash
git add components/anyguessr/game.tsx components/anyguessr/results.tsx app/anyguessr.css
git commit -m "feat(anyguessr): finish screen with score percentile"
```

---

### Task 8: Getting Warmer uses the finish screen

**Files:**
- Modify: `lib/getting-warmer/storage.ts` (`saveDailyPlayed` records the day on a give-up too)
- Modify: `components/getting-warmer/results-modal.tsx`, `components/getting-warmer/game.tsx`
- Modify: `app/getting-warmer.css` (delete `.gw-streak-line` and `.gw-countdown` rules)
- Test: `tests/lib/getting-warmer-storage.test.ts`

**Interfaces:**
- Consumes: `FinishScreen`; `useDailyPercentile`, `finishCurve`; existing `gettingWarmerShare(won, attempts, emojis, date)`.
- Produces: `GettingWarmerResultsModal` without the `countdown` prop.

- [ ] **Step 1: Write the failing storage test**

Create `tests/lib/getting-warmer-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { getDailyPlayed, saveDailyPlayed } from "@/lib/getting-warmer/storage";
import { getDateString } from "@/lib/streak/date";
import { readStreakStore } from "@/lib/streak/storage";

describe("Getting Warmer saveDailyPlayed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("counts a solved puzzle as today's play", () => {
    saveDailyPlayed(true, 4, { answer: "LIGHTHOUSE", guesses: ["BOAT", "LIGHTHOUSE"] });

    expect(readStreakStore().games["getting-warmer"].playDates).toEqual([getDateString()]);
    expect(getDailyPlayed()).toMatchObject({ won: true, attempts: 4 });
  });

  it("counts giving up as today's play too, so the puzzle is not offered again as the next game", () => {
    saveDailyPlayed(false, 6, { answer: "LIGHTHOUSE", guesses: ["BOAT"], gaveUp: true });

    expect(readStreakStore().games["getting-warmer"].playDates).toEqual([getDateString()]);
    expect(getDailyPlayed()).toMatchObject({ won: false, gaveUp: true });
  });
});
```

Run: `pnpm exec vitest run tests/lib/getting-warmer-storage.test.ts`
Expected: the give-up test FAILS with `expected [] to deeply equal [ '2026-…' ]`.

- [ ] **Step 2: Record the day on any finish**

In `lib/getting-warmer/storage.ts`, in `saveDailyPlayed`, replace

```ts
  if (won) {
    recordDailyCompletion("getting-warmer", playDate);
  }
```

with

```ts
  // Giving up uses today's puzzle as much as solving it does, so both count as played.
  recordDailyCompletion("getting-warmer", playDate);
```

Run the test again. Expected: PASS.

- [ ] **Step 3: Trim the results component**

In `components/getting-warmer/results-modal.tsx`:

Delete these imports:

```ts
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { gettingWarmerShare } from "@/lib/share/results";
import { getDateString as shareDate } from "@/lib/streak/date";
import { WinStreakLine } from "@/components/streak/streak-notifier";
```

Remove `countdown?: string;` from the props interface and `countdown,` from the destructuring. Delete this from the end of the JSX (everything after the closing `</div>` of `gw-leaderboard`, up to the closing of `gw-results-modal-card`):

```tsx
        {won && (
          <div className="gw-streak-line">
            <WinStreakLine gameId="getting-warmer" />
          </div>
        )}

        <ShareResult
          gameId="getting-warmer"
          text={gettingWarmerShare(won, attempts, shareEmojis, shareDate())}
        />

        <OtherDailies currentGameId="getting-warmer" />

        {countdown ? (
          <p className="gw-countdown">Next puzzle in {countdown}</p>
        ) : null}
```

- [ ] **Step 4: Wire the game**

In `components/getting-warmer/game.tsx`:

Delete `import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";`. Change the game-logic import to `import { getDateString } from "@/lib/getting-warmer/game-logic";`. Add:

```ts
import { FinishScreen } from "@/components/daily/finish-screen";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";
import { gettingWarmerShare } from "@/lib/share/results";
```

Delete the `countdown` state line and the effect that ticks it:

```ts
  useEffect(() => {
    const tick = () => setCountdown(getCountdownText());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
```

Directly after the effect that sets `showResultsModal`, add:

```ts
  const isFinished = screen === "results" || screen === "played";
  // Only a solved puzzle has a guess count to compare. Giving up gets no curve.
  const standing = useDailyPercentile("getting-warmer", attempts, {
    enabled: isFinished && won && attempts >= 1,
    record: screen === "results",
  });
```

Replace the `<DailyCompleteOverlay ...> ... </DailyCompleteOverlay>` element with:

```tsx
      <FinishScreen
        gameId="getting-warmer"
        open={showResultsModal && isFinished}
        onClose={() => setShowResultsModal(false)}
        ariaLabel="Puzzle results"
        result={
          <GettingWarmerResultsModal
            won={won}
            gaveUp={gaveUp}
            answer={answer}
            attempts={attempts}
            guesses={guessHistory}
            shareEmojis={shareEmojis}
            alreadyPlayed={screen === "played"}
            leaderboard={leaderboard}
            lbLoading={lbLoading}
            submittedEntryId={submittedEntryIdRef.current}
            nameInput={nameInput}
            onNameInputChange={setNameInput}
            onJoinLeaderboard={handleJoinLeaderboard}
            lbSubmitting={lbSubmitting}
            lbSubmitted={lbSubmitted}
          />
        }
        shareText={gettingWarmerShare(won, attempts, shareEmojis, getDateString())}
        curve={finishCurve("getting-warmer", standing)}
      />
```

- [ ] **Step 5: CSS**

In `app/getting-warmer.css` delete the `.gw-streak-line` and `.gw-countdown` rules.

Run: `grep -rn "gw-streak-line\|gw-countdown\|getCountdownText\|WinStreakLine\|OtherDailies" components/getting-warmer app/getting-warmer.css`
Expected: no output.

- [ ] **Step 6: Gate**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint components/getting-warmer lib/getting-warmer/storage.ts tests/lib/getting-warmer-storage.test.ts`
Expected: all pass.

- [ ] **Step 7: Check it in the browser**

`http://localhost:3210/getting-warmer/daily`, 1280px and 390px, dark and light. The finish screen previously used the site's background here; it should now be Getting Warmer's.

- Solve it (or clear `getting_warmer_played_<today>` from localStorage and use another browser profile to give up). Solved: status, answer, guess count, emoji row, your guesses, leaderboard join and list, then the curve with `most guesses … fewest` on the axis, then Share.
- Gave up: the same result block, **no curve**, and Getting Warmer is ticked in the run.
- No second share button, streak pill, "More dailies" or countdown inside the result card.
- Join the leaderboard: the row appears and is highlighted, the screen stays open.
- Reload: opens again with a GET only.

- [ ] **Step 8: Show the user, then commit**

```bash
git add lib/getting-warmer/storage.ts components/getting-warmer app/getting-warmer.css tests/lib/getting-warmer-storage.test.ts
git commit -m "feat(getting-warmer): finish screen with guess percentile"
```

---

### Task 9: Freeze Frames uses the finish screen

**Files:**
- Create: `components/freezeframes/finish-result.tsx`
- Modify: `components/freezeframes/game.tsx`
- Modify: `app/freezeframes.css` (add `.ff-fin*` and `.freezeframes-error`; delete rules for the removed "played" card and old results header once unused)
- Test: `tests/components/freezeframes-finish-result.test.tsx`

**Interfaces:**
- Consumes: `FinishScreen`; `useDailyPercentile`, `finishCurve`; existing `ROUNDS` (`@/lib/freezeframes/rounds`, each with `key`, `icon`, `title`), `freezeFramesShare(rounds | null, score, date)`.
- Produces:

```ts
// components/freezeframes/finish-result.tsx
export interface FreezeFramesRound { answer: string; score: number; correct: boolean }
export interface FreezeFramesEntry {
  name: string;
  onNameChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}
export function FreezeFramesFinishResult(props: {
  score: number;
  max: number;
  /** Null on a return visit, when only the day's total was saved. */
  rounds: readonly FreezeFramesRound[] | null;
  /** Null when there is nothing to save (a return visit). */
  entry: FreezeFramesEntry | null;
}): JSX.Element
```

- [ ] **Step 1: Write the failing test**

Create `tests/components/freezeframes-finish-result.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FreezeFramesFinishResult } from "@/components/freezeframes/finish-result";

const rounds = [
  { answer: "Jaws", score: 820, correct: true },
  { answer: "Hey Ya!", score: 0, correct: false },
  { answer: "Lost", score: 640, correct: true },
  { answer: "Adele", score: 1000, correct: true },
];

const entry = (over = {}) => ({ name: "", onNameChange: vi.fn(), onSave: vi.fn(), saving: false, saved: false, ...over });

describe("FreezeFramesFinishResult", () => {
  afterEach(cleanup);

  it("shows the score out of the maximum and a row for each round", () => {
    render(<FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry()} />);

    expect(screen.getByTestId("ff-fin-score")).toHaveTextContent("2,460/ 4,000");
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent("Jaws");
    expect(rows[0]).toHaveTextContent("+820");
    expect(rows[1]).toHaveTextContent("Hey Ya!");
    expect(rows[1]).not.toHaveTextContent("+");
  });

  it("shows only the total on a return visit", () => {
    render(<FreezeFramesFinishResult score={2460} max={4000} rounds={null} entry={null} />);

    expect(screen.getByTestId("ff-fin-score")).toHaveTextContent("2,460/ 4,000");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("saves a name to the leaderboard and then says so", async () => {
    const save = vi.fn();
    const { rerender } = render(
      <FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry({ name: "Josh", onSave: save })} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save score" }));
    expect(save).toHaveBeenCalledTimes(1);

    rerender(<FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry({ saved: true })} />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Saved to the leaderboard.")).toBeInTheDocument();
  });

  it("disables the button while saving", () => {
    render(<FreezeFramesFinishResult score={2460} max={4000} rounds={rounds} entry={entry({ saving: true })} />);
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
```

Run: `pnpm exec vitest run tests/components/freezeframes-finish-result.test.tsx`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 2: Create the result component**

Create `components/freezeframes/finish-result.tsx`:

```tsx
"use client";

import { ROUNDS } from "@/lib/freezeframes/rounds";

export interface FreezeFramesRound {
  answer: string;
  score: number;
  correct: boolean;
}

export interface FreezeFramesEntry {
  name: string;
  onNameChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

const number = (n: number) => n.toLocaleString("en-US");

/** The day's Freeze Frames result, as shown on the finish screen and on the page under it. */
export function FreezeFramesFinishResult({
  score,
  max,
  rounds,
  entry,
}: {
  score: number;
  max: number;
  /** Null on a return visit, when only the day's total was saved. */
  rounds: readonly FreezeFramesRound[] | null;
  /** Null when there is nothing to save (a return visit). */
  entry: FreezeFramesEntry | null;
}) {
  return (
    <div className="ff-fin">
      <p className="ff-fin-eyebrow">Today&apos;s result</p>
      <div className="ff-fin-score" data-testid="ff-fin-score">
        {number(score)}
        <span>/ {number(max)}</span>
      </div>

      {rounds ? (
        <ul className="ff-fin-rounds">
          {ROUNDS.map((round, i) => {
            const result = rounds[i];
            return (
              <li key={round.key}>
                <span className="ff-fin-icon" aria-hidden="true">
                  {round.icon}
                </span>
                <span className="ff-fin-answer">{result?.answer ?? "—"}</span>
                <span className={`ff-fin-pts${result?.correct ? " is-got" : ""}`}>
                  {result?.correct ? `+${result.score}` : "−"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {entry && !entry.saved ? (
        <div className="ff-fin-save">
          <input
            className="freezeframes-name-inp"
            value={entry.name}
            onChange={(e) => entry.onNameChange(e.target.value)}
            placeholder="Your name"
            aria-label="Your name for the leaderboard"
            maxLength={20}
          />
          <button
            type="button"
            className="freezeframes-btn freezeframes-btn-purple freezeframes-btn-sm"
            onClick={entry.onSave}
            disabled={entry.saving}
          >
            {entry.saving ? "Saving…" : "Save score"}
          </button>
        </div>
      ) : null}
      {entry?.saved ? <p className="ff-fin-saved">Saved to the leaderboard.</p> : null}
    </div>
  );
}
```

Run the test again. Expected: PASS.

- [ ] **Step 3: Wire the game**

In `components/freezeframes/game.tsx`:

Imports. Delete:

```ts
import { useRouter } from "next/navigation";
import { useCountUp } from "@/lib/motion/count-up";
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { DailyCompleteShell } from "@/components/daily/daily-complete-shell";
```

Remove `getCountdownText,` from the `@/lib/freezeframes/game-logic` import. Keep `WinStreakLine` (the home screen still shows it). Add:

```ts
import { FinishScreen } from "@/components/daily/finish-screen";
import { FreezeFramesFinishResult } from "@/components/freezeframes/finish-result";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";
```

State and effects. Delete `const router = useRouter();`, the `countdown` state line, the `setCountdown(getCountdownText());` line inside `tryPlay`, the effect that ticks `countdown` while `screen === "played"`, and `const displayTotal = useCountUp(...)`.

`submitToLeaderboard` stays on the finish screen after saving:

```ts
  const submitToLeaderboard = useCallback(async () => {
    if (lbSubmitting || lbSubmitted) return;
    setLbSubmitting(true);
    const result = await saveLeaderboardEntry(
      nameInput.trim() || "Anonymous",
      finishResultsTotal,
    );
    setLbSubmitting(false);
    if (result.ok) setLbSubmitted(true);
  }, [lbSubmitting, lbSubmitted, nameInput, finishResultsTotal]);
```

Directly after the effect that sets `completeOpen` (just above `return (`), add:

```tsx
  const finishedScreen = screen === "played" || screen === "results";
  const justFinished = screen === "results" && roundResults.length === 4;
  const finalScore = screen === "played" ? playedScore : finishResultsTotal;
  const standing = useDailyPercentile("freezeframes", finalScore, {
    enabled: screen === "played" || justFinished,
    record: justFinished,
  });

  const finishResult = (
    <FreezeFramesFinishResult
      score={finalScore}
      max={screen === "played" ? playedMax : MAX_DAILY_SCORE}
      rounds={justFinished ? roundResults : null}
      entry={
        justFinished
          ? {
              name: nameInput,
              onNameChange: setNameInput,
              onSave: () => void submitToLeaderboard(),
              saving: lbSubmitting,
              saved: lbSubmitted,
            }
          : null
      }
    />
  );
```

JSX. Change the opening `<DailyCompleteShell ...>` to `<>` and the closing `</DailyCompleteShell>` to `</>`.

Replace the fetch error paragraph with:

```tsx
      {fetchError && <p className="freezeframes-error">{fetchError}</p>}
```

Delete the whole `screen === "played"` screen `<div>` (the one containing `freezeframes-played-card`) and the whole `screen === "results"` screen `<div>` (from `<div className={`freezeframes-screen${screen === "results" ? " active" : ""}`}>` through its closing tag). In the place of the first one, put:

```tsx
      {/* Under the finish screen the page shows the same result, with a way back to the summary. */}
      <div className={`freezeframes-screen${finishedScreen ? " active" : ""}`}>
        {finishedScreen && !completeOpen && (
          <>
            {finishResult}
            <button
              type="button"
              className="freezeframes-btn freezeframes-btn-ghost freezeframes-btn-sm ff-fin-reopen"
              onClick={() => setCompleteOpen(true)}
            >
              Back to today&apos;s summary
            </button>
          </>
        )}
      </div>
```

Directly before the closing `</>` (after the `</div>` that closes `freezeframes-app`), add:

```tsx
      <FinishScreen
        gameId="freezeframes"
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        result={finishResult}
        shareText={freezeFramesShare(justFinished ? roundResults : null, finalScore, shareDate())}
        secondary={{ label: "Leaderboard", href: "/freezeframes/leaderboard" }}
        curve={finishCurve("freezeframes", standing)}
      />
```

- [ ] **Step 4: CSS**

In `app/freezeframes.css` add:

```css
/* ── Finish result ── */
.ff-fin {
  font-family: "Outfit", system-ui, sans-serif;
  color: var(--ff-text);
  text-align: center;
}
.ff-fin-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ff-muted);
}
.ff-fin-score {
  font-family: "Space Mono", monospace;
  font-size: 50px;
  font-weight: 700;
  line-height: 1;
}
.ff-fin-score span { margin-left: 6px; font-size: 16px; color: var(--ff-muted); }
.ff-fin-rounds { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 6px; }
.ff-fin-rounds li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--ff-border);
  background: var(--ff-surface);
  text-align: left;
  font-size: 13.5px;
}
.ff-fin-icon { flex: none; }
.ff-fin-answer { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.ff-fin-pts { flex: none; font-family: "Space Mono", monospace; font-weight: 700; color: var(--ff-muted); }
.ff-fin-pts.is-got { color: var(--ff-green); }
.ff-fin-save { display: flex; gap: 8px; margin-top: 14px; }
.ff-fin-save .freezeframes-name-inp { flex: 1; min-width: 0; }
.ff-fin-saved { margin: 14px 0 0; font-size: 13px; font-weight: 600; color: var(--ff-green); }
.ff-fin-reopen { margin-top: 18px; }
.freezeframes-error { margin: 0; padding: 1rem; text-align: center; color: var(--ff-red); }
```

Confirm the variables exist (`grep -n "\-\-ff-green\|\-\-ff-red\|\-\-ff-surface\|\-\-ff-border\|\-\-ff-muted\|\-\-ff-text" app/freezeframes.css | head`), and do the check from "A note for Tasks 6 to 11" for `.freezeframes-app`, `.freezeframes-name-inp` and `.freezeframes-btn`.

Then delete rules that nothing uses any more. For each of these class prefixes, run the grep and delete the CSS rules only when the grep finds no use outside the CSS file:

```bash
for c in freezeframes-played- freezeframes-cdown- freezeframes-results-logo freezeframes-total-score freezeframes-score-max freezeframes-breakdown freezeframes-bd- freezeframes-name-section; do echo "== $c"; grep -rn "$c" components app --include="*.tsx"; done
```

- [ ] **Step 5: Gate**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint components/freezeframes tests/components/freezeframes-finish-result.test.tsx`
Expected: all pass. If ESLint flags an unused variable (`displayDate`, `totalScore`), check whether the game screen still uses it before removing it.

- [ ] **Step 6: Check it in the browser**

`http://localhost:3210/freezeframes/daily`, 1280px and 390px, dark and light. The finish screen used to be the whole page on the site's background; it should now be the shared screen on Freeze Frames' background.

- Play four rounds (Skip works). After "See Results →": score out of 4,000, four rows (icon, answer, points), the name box, then the curve with `0 … 4,000`, then Share and Leaderboard.
- Save a name: "Saved to the leaderboard." and the screen stays open.
- There is no "🔒 Come back tomorrow" card anywhere.
- Close: the result on the page with "Back to today's summary". The nav's Play button, when today is played, shows the same thing.
- Reload, press Play: the return visit shows the total only (no rows, no name box), with a GET.
- Long answers are cut with an ellipsis and do not push the points off the row on the phone.

- [ ] **Step 7: Show the user, then commit**

```bash
git add components/freezeframes app/freezeframes.css tests/components/freezeframes-finish-result.test.tsx
git commit -m "feat(freezeframes): finish screen with a compact result and percentile"
```

---

### Task 10: Hot Takes uses the finish screen

**Files:**
- Modify: `components/hot-takes/game.tsx`
- Modify: `app/hot-takes.css` (add `.hot-takes-finish` and `.hot-takes-reopen`; un-nest result selectors if needed)

**Interfaces:**
- Consumes: `FinishScreen`. Hot Takes is the crowd game: no percentile, no secondary button. The agreement figure and the per-item breakdown are the result.

- [ ] **Step 1: Wire the game**

In `components/hot-takes/game.tsx`:

Delete:

```ts
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { DailyCompleteShell } from "@/components/daily/daily-complete-shell";
```

Add:

```ts
import { FinishScreen } from "@/components/daily/finish-screen";
```

Directly before `return (`, add the result as one node, so the page and the finish screen show the same thing:

```tsx
  const resultsBody = results ? (
    <div className="hot-takes-finish">
      <div className="hot-takes-score-banner anim-pop-in">
        <div ref={scoreNumRef} className="hot-takes-score-num">{displayAvg}%</div>
        <div className="hot-takes-score-text">
          average agreement with the crowd across your 15 picks.
          {results.hottest && (
            <>
              {" "}
              Your hottest take: {results.hottest.label} in {results.hottest.tier} tier
              (only {results.hottest.pct}% agree).
            </>
          )}
        </div>
      </div>

      {results.rows.map(({ item, yourTier, dist }) => (
        <div key={item.id} className="hot-takes-consensus-item">
          <div className="hot-takes-consensus-top">
            <HotTakesImage src={item.imageUrl} alt="" width={28} />
            <div className="hot-takes-consensus-name">{item.label}</div>
            <div className="hot-takes-consensus-pick">
              you said <b>{yourTier}</b> · {dist[yourTier]}% agree
            </div>
          </div>
          <div className="hot-takes-bars">
            {TIERS.map((t) => {
              const w = dist[t];
              return (
                <div
                  key={t}
                  className={`hot-takes-bar${t === yourTier ? " you" : ""}`}
                  style={{ width: `${w}%`, background: TIER_COLORS[t] }}
                >
                  {w >= 10 ? <span className="hot-takes-bar-pct">{w}%</span> : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  ) : null;
```

Change the opening `<DailyCompleteShell ...>` to `<>` and the closing `</DailyCompleteShell>` to `</>`.

Replace the whole `{results && ( <div className="hot-takes-results" id="hot-takes-results"> ... </div> )}` block with:

```tsx
        {results && (
          <div className="hot-takes-results" id="hot-takes-results">
            <h2>How you stack up</h2>
            <p className="hot-takes-sub">Here&apos;s how everyone else ranked today&apos;s category.</p>
            {/* The finish screen shows the same breakdown while it is open. */}
            {!completeOpen && (
              <>
                {resultsBody}
                <button
                  type="button"
                  className="hot-takes-btn hot-takes-btn-ghost hot-takes-reopen"
                  onClick={() => setCompleteOpen(true)}
                >
                  Back to today&apos;s summary
                </button>
              </>
            )}
          </div>
        )}
```

Directly before the closing `</>` (after the `</div>` that closes `hot-takes-page`), add:

```tsx
      <FinishScreen
        gameId="hot-takes"
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        result={resultsBody}
        shareText={shareText}
      />
```

- [ ] **Step 2: CSS**

In `app/hot-takes.css` add:

```css
/* The crowd breakdown, on the page and on the finish screen. */
.hot-takes-finish { color: var(--ht-text); text-align: left; }
.hot-takes-bar-pct { font-size: 9px; font-weight: 700; color: #1a1a1a; }
.hot-takes-reopen { margin-top: 20px; }
```

Then do the check from "A note for Tasks 6 to 11" for `.hot-takes-page` and `.hot-takes-wrap`: copy the page's `font-family` onto `.hot-takes-finish`, and remove a `.hot-takes-page` or `.hot-takes-wrap` ancestor from any rule for `.hot-takes-score-banner`, `.hot-takes-score-num`, `.hot-takes-score-text`, `.hot-takes-consensus-*`, `.hot-takes-bars` or `.hot-takes-bar`.

Run: `grep -rn "DailyCompleteShell\|OtherDailies\|ShareResult" components/hot-takes`
Expected: no output.

- [ ] **Step 3: Gate**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint components/hot-takes/game.tsx`
Expected: all pass.

- [ ] **Step 4: Check it in the browser**

`http://localhost:3210/hot-takes`, 1280px and 390px, dark and light. Tap an item then a tier to place all fifteen, then "Lock in my ranking".

- The finish screen opens on Hot Takes' own background (it used to be the site's), with the agreement banner counting up and the fifteen breakdown rows.
- No bell curve, and only "Share result" in the actions row.
- The streak line is there (Hot Takes had none before), then Up next and the countdown.
- The breakdown is long: check that Up next is reachable by scrolling and that nothing is clipped at 390px.
- Close: the tier board and the breakdown are on the page, with "Back to today's summary".
- The burst of particles still fires from the percentage.

If the fifteen rows push "Up next" too far down for the user's taste, say so when you show them; the spec keeps the full breakdown in the result, so do not shorten it without asking.

- [ ] **Step 5: Show the user, then commit**

```bash
git add components/hot-takes/game.tsx app/hot-takes.css
git commit -m "feat(hot-takes): finish screen with the crowd breakdown and streak"
```

---

### Task 11: Ball Knowledge uses the finish screen

Another branch, `feature/ball-knowledge-polish`, has been changing this game. Do this task last and start by finding out where that work is.

**Files:**
- Create: `components/ball-knowledge/answer-row.tsx`, `components/ball-knowledge/finish-result.tsx`
- Modify: `components/ball-knowledge/game.tsx`
- Modify: `app/ball-knowledge.css`
- Test: `tests/components/ball-knowledge-finish-result.test.tsx`

**Interfaces:**
- Consumes: `FinishScreen`; `useDailyPercentile`, `finishCurve`; existing `ballKnowledgeShare(category, score)`, `AnswerEntry` and `LeaderboardEntry` from `@/lib/ball-knowledge/types`.
- Produces:

```ts
// components/ball-knowledge/answer-row.tsx
export function AnswerRow(props: { entry: AnswerEntry }): JSX.Element

// components/ball-knowledge/finish-result.tsx
export interface BallKnowledgeJoin { name: string; onNameChange: (value: string) => void; onJoin: () => void; joining: boolean }
export function BallKnowledgeFinishResult(props: {
  score: number;
  category: string;
  /** This round's answers. Null on a return visit, when they were not kept. */
  entries: readonly AnswerEntry[] | null;
  /** Null on a return visit. */
  join: BallKnowledgeJoin | null;
  leaderboard: readonly LeaderboardEntry[];
  leaderboardLoading: boolean;
  myEntryId: string | null;
}): JSX.Element
```

- [ ] **Step 0: Bring in the other branch's work if it has landed**

```bash
git -C /Users/joshoguh/WebstormProjects/draft-anything-finish-screen fetch --all --quiet
git -C /Users/joshoguh/WebstormProjects/draft-anything-finish-screen log --oneline -3 main -- components/ball-knowledge app/ball-knowledge.css
git -C /Users/joshoguh/WebstormProjects/draft-anything-finish-screen branch --contains feature/ball-knowledge-polish 2>/dev/null
```

- If `main` has Ball Knowledge commits this branch does not, ask the user for a go-ahead and then `git merge main`, resolve, and re-run the gate before continuing. Re-read `components/ball-knowledge/game.tsx` afterwards: the line references below describe the file as it was on 2026-10-11, and the steps must be applied by what they do, not by line number.
- If `feature/ball-knowledge-polish` exists but is not merged, tell the user this task will conflict with it and ask whether to go ahead now or wait.

- [ ] **Step 1: Write the failing test**

Create `tests/components/ball-knowledge-finish-result.test.tsx`:

```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BallKnowledgeFinishResult } from "@/components/ball-knowledge/finish-result";
import type { AnswerEntry, LeaderboardEntry } from "@/lib/ball-knowledge/types";

const entries: AnswerEntry[] = [
  { id: "e0", text: "pepperoni", displayText: "Pepperoni", status: "ok", reason: "" },
  { id: "e1", text: "mushroom", displayText: "Mushrooms", status: "ok", reason: "" },
  { id: "e2", text: "gravel", displayText: "gravel", status: "bad", reason: "not valid" },
];
const board = [
  { id: "a", name: "Sam", score: 31 },
  { id: "b", name: "Josh", score: 2 },
] as LeaderboardEntry[];
const join = (over = {}) => ({ name: "", onNameChange: vi.fn(), onJoin: vi.fn(), joining: false, ...over });

function renderResult(over: Partial<React.ComponentProps<typeof BallKnowledgeFinishResult>> = {}) {
  return render(
    <BallKnowledgeFinishResult
      score={2}
      category="Pizza Toppings"
      entries={entries}
      join={join()}
      leaderboard={board}
      leaderboardLoading={false}
      myEntryId={null}
      {...over}
    />,
  );
}

describe("BallKnowledgeFinishResult", () => {
  afterEach(cleanup);

  it("shows the score, the category and today's top ten", () => {
    renderResult({ myEntryId: "b" });

    expect(screen.getByTestId("bk-fin-score")).toHaveTextContent("2");
    expect(screen.getByText("Pizza Toppings")).toBeInTheDocument();
    const rows = within(screen.getByTestId("bk-fin-board")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("1Sam31");
    expect(rows[1]).toHaveClass("me");
  });

  it("switches between accepted and missed answers", async () => {
    renderResult();

    expect(screen.getByText("Pepperoni")).toBeInTheDocument();
    expect(screen.queryByText("gravel")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Missed" }));
    expect(screen.getByText("gravel")).toBeInTheDocument();
    expect(screen.queryByText("Pepperoni")).toBeNull();
  });

  it("leaves out the answers and the name box on a return visit", () => {
    renderResult({ entries: null, join: null });

    expect(screen.queryByRole("button", { name: "Accepted" })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByTestId("bk-fin-board")).toBeInTheDocument();
  });

  it("joins the leaderboard", async () => {
    const onJoin = vi.fn();
    renderResult({ join: join({ name: "Josh", onJoin }) });

    await userEvent.click(screen.getByRole("button", { name: "Join" }));
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it("says so when nobody has posted a score yet, and while loading", () => {
    const { rerender } = renderResult({ leaderboard: [] });
    expect(screen.getByText("No scores yet today.")).toBeInTheDocument();

    rerender(
      <BallKnowledgeFinishResult
        score={2}
        category="Pizza Toppings"
        entries={null}
        join={null}
        leaderboard={[]}
        leaderboardLoading
        myEntryId={null}
      />,
    );
    expect(screen.getByText("Loading leaderboard…")).toBeInTheDocument();
  });
});
```

Check the fixtures against the real types first (`sed -n 1,25p lib/ball-knowledge/types.ts`) and adjust field names if `AnswerEntry` or `LeaderboardEntry` differ.

Run: `pnpm exec vitest run tests/components/ball-knowledge-finish-result.test.tsx`
Expected: FAIL, cannot resolve the module.

- [ ] **Step 2: Move `AnswerRow` to its own file**

Create `components/ball-knowledge/answer-row.tsx` with the `AnswerRow` function cut from the top of `game.tsx`, exported:

```tsx
import type { AnswerEntry } from "@/lib/ball-knowledge/types";

export function AnswerRow({ entry }: { entry: AnswerEntry }) {
  const icon =
    entry.status === "pending" ? (
      <div className="bk-spin" />
    ) : entry.status === "ok" ? (
      "✓"
    ) : (
      "✕"
    );

  return (
    <div className={`bk-answer-row ${entry.status}`} data-id={entry.id}>
      <div className="bk-icon">{icon}</div>
      <div>{entry.displayText}</div>
      {entry.status !== "pending" && entry.reason ? (
        <div className="bk-reason">{entry.reason}</div>
      ) : null}
    </div>
  );
}
```

In `game.tsx` delete the local `AnswerRow` and add `import { AnswerRow } from "./answer-row";`.

- [ ] **Step 3: Create the result component**

Create `components/ball-knowledge/finish-result.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { AnswerEntry, LeaderboardEntry } from "@/lib/ball-knowledge/types";
import { AnswerRow } from "./answer-row";

export interface BallKnowledgeJoin {
  name: string;
  onNameChange: (value: string) => void;
  onJoin: () => void;
  joining: boolean;
}

type Tab = "ok" | "bad";

/** The day's Ball Knowledge result, as shown on the finish screen and on the page under it. */
export function BallKnowledgeFinishResult({
  score,
  category,
  entries,
  join,
  leaderboard,
  leaderboardLoading,
  myEntryId,
}: {
  score: number;
  category: string;
  /** This round's answers. Null on a return visit, when they were not kept. */
  entries: readonly AnswerEntry[] | null;
  /** Null on a return visit. */
  join: BallKnowledgeJoin | null;
  leaderboard: readonly LeaderboardEntry[];
  leaderboardLoading: boolean;
  myEntryId: string | null;
}) {
  const [tab, setTab] = useState<Tab>("ok");
  const shown = entries ? entries.filter((entry) => entry.status === tab) : [];

  return (
    <div className="bk-finish">
      <div className="bk-end-score">
        <div className="bk-end-num" data-testid="bk-fin-score">
          {score}
        </div>
        <div className="bk-end-lbl">Ball Knowledge Score</div>
      </div>
      <p className="bk-finish-category">
        Category: <strong>{category}</strong>
      </p>

      {entries ? (
        <>
          <div className="bk-tabs">
            <button type="button" className={`bk-tab${tab === "ok" ? " active" : ""}`} onClick={() => setTab("ok")}>
              Accepted
            </button>
            <button type="button" className={`bk-tab${tab === "bad" ? " active" : ""}`} onClick={() => setTab("bad")}>
              Missed
            </button>
          </div>
          <div className="bk-answer-list bk-end-list">
            {shown.length === 0 ? (
              <div className="bk-empty-note">
                {tab === "ok" ? "Nothing accepted this round." : "Nothing missed. Clean round."}
              </div>
            ) : (
              [...shown].reverse().map((entry) => <AnswerRow key={entry.id} entry={entry} />)
            )}
          </div>
        </>
      ) : null}

      <div className="bk-divider" />

      {join ? (
        <>
          <div className="bk-section-label">Join Today&apos;s Leaderboard</div>
          <div className="bk-join-row">
            <input
              type="text"
              value={join.name}
              onChange={(e) => join.onNameChange(e.target.value)}
              placeholder="Your name"
              aria-label="Your name for the leaderboard"
              maxLength={18}
            />
            <button type="button" onClick={join.onJoin} disabled={join.joining}>
              {join.joining ? "…" : "Join"}
            </button>
          </div>
        </>
      ) : (
        <div className="bk-section-label">Today&apos;s Leaderboard</div>
      )}

      {leaderboardLoading ? (
        <div className="bk-empty-note">Loading leaderboard…</div>
      ) : leaderboard.length === 0 ? (
        <div className="bk-empty-note">No scores yet today.</div>
      ) : (
        <ol className="bk-finish-board" data-testid="bk-fin-board">
          {leaderboard.slice(0, 10).map((row, i) => (
            <li key={row.id} className={`bk-lb-row${row.id === myEntryId ? " me" : ""}`}>
              <div className="bk-lb-rank">{i + 1}</div>
              <div className="bk-lb-name">{row.name}</div>
              <div className="bk-lb-score">{row.score}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

Note the board is only rendered with rows; the "leaves out the answers" test passes `board` so `bk-fin-board` exists.

Run the test again. Expected: PASS.

- [ ] **Step 4: Wire the game**

In `components/ball-knowledge/game.tsx`:

Delete these imports:

```ts
import { OtherDailies } from "@/components/daily/other-dailies";
import { track } from "@/lib/analytics/track";
import { DailyCompleteShell } from "@/components/daily/daily-complete-shell";
import { WinStreakLine } from "@/components/streak/streak-notifier";
```

Remove `getCountdownText,` from the `@/lib/ball-knowledge/game-logic` import and `type CSSProperties,` from the React import. Add:

```ts
import { FinishScreen } from "@/components/daily/finish-screen";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";
import { BallKnowledgeFinishResult } from "./finish-result";
```

Delete: the `EndTab` type and the `endTab` state; the `countdown` state and the effect that ticks it; the `copyShareText` function; the `endItems` constant.

Replace `const shareText = ballKnowledgeShare(category, score);` with:

```ts
  const finishedScreen = screen === "end" || screen === "played";
  // A return visit reads the saved score; a round that just ended uses the live one.
  const finalScore = screen === "played" ? playedScore : score;
  const shareText = ballKnowledgeShare(category, finalScore);
  const standing = useDailyPercentile("ball-knowledge", finalScore, {
    enabled: finishedScreen,
    record: screen === "end",
  });

  const finishResult = (
    <BallKnowledgeFinishResult
      score={finalScore}
      category={category}
      entries={screen === "end" ? entries : null}
      join={
        screen === "end"
          ? { name: nameInput, onNameChange: setNameInput, onJoin: () => void handleJoin(), joining }
          : null
      }
      leaderboard={leaderboard}
      leaderboardLoading={lbLoading}
      myEntryId={submittedEntryIdRef.current}
    />
  );
```

Move this block so it sits after `handleJoin` is defined (function declarations are hoisted, but `handleJoin` is a `const`).

JSX. Change the opening `<DailyCompleteShell ...>` (with its `style` prop) to `<>` and the closing tag to `</>`. Change `<main className={`bk-page${completeOpen ? " bk-page--complete" : ""}`}>` to `<main className="bk-page">`. Make the brand unconditional:

```tsx
        <div className="bk-brand">
          <div className="bk-brand-dot" />
          <span>Stim Games</span>
        </div>
```

Delete the whole `{screen === "played" && ( ... )}` block and the whole `{screen === "end" && ( ... )}` block. In the place of the first one, put:

```tsx
        {/* Under the finish screen the page shows the same result, with a way back to the summary. */}
        {finishedScreen && !completeOpen && (
          <div className="bk-results">
            <div className="bk-back-link">
              <GameBackLink href="/" color="var(--bk-chalk-dim)" />
            </div>
            {finishResult}
            <button type="button" className="bk-btn-ghost" onClick={() => setCompleteOpen(true)}>
              Back to today&apos;s summary
            </button>
            {screen === "end" && (
              <button type="button" className="bk-btn-ghost" onClick={() => setScreen("start")}>
                Back to Start
              </button>
            )}
          </div>
        )}
```

Directly before the closing `</>` (after `</main>`), add:

```tsx
      <FinishScreen
        gameId="ball-knowledge"
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        result={finishResult}
        shareText={shareText}
        curve={finishCurve("ball-knowledge", standing)}
      />
```

`toast` stays: `handleJoin` still uses it.

- [ ] **Step 5: CSS**

In `app/ball-knowledge.css` add:

```css
/* ── Finish result ── */
.bk-finish { color: var(--bk-chalk); text-align: left; }
.bk-finish .bk-end-score { text-align: center; }
.bk-finish-category {
  margin: 0 0 20px;
  text-align: center;
  font-size: 13px;
  color: var(--bk-chalk-dim);
}
.bk-finish-category strong { color: var(--bk-chalk); }
.bk-finish-board { list-style: none; margin: 0; padding: 0; }
```

Do the check from "A note for Tasks 6 to 11" for `.bk-page` and `.bk-app` (copy the page's `font-family` onto `.bk-finish`; un-nest any `.bk-page .bk-…` rule for a class the result uses).

Then delete what nothing uses: the `.bk-page--complete` rules, and the `.bk-share-grid`, `.bk-share-btn` and `.bk-streak-line` rules.

Run: `grep -rn "bk-page--complete\|bk-share-\|bk-streak-line\|DailyCompleteShell\|OtherDailies\|WinStreakLine\|copyShareText\|twitter.com\|tiktok.com\|instagram.com" components/ball-knowledge app/ball-knowledge.css`
Expected: no output.

- [ ] **Step 6: Gate**

Run: `pnpm typecheck && pnpm test && pnpm exec eslint components/ball-knowledge tests/components/ball-knowledge-finish-result.test.tsx`
Expected: all pass.

- [ ] **Step 7: Check it in the browser**

`http://localhost:3210/ball-knowledge/daily`, 1280px and 390px, dark and light.

- Play the 60 seconds. The finish screen opens with the score, the category, Accepted and Missed tabs, the name box and today's top ten, then the curve with `0 … most named`, then one "Share result" button.
- There are no X, Instagram, TikTok or Messages buttons.
- Join the leaderboard: the toast shows on top of the finish screen (if it is hidden behind it, raise `.bk-toast`'s `z-index` above 1000), and your row is highlighted.
- Close: the result is on the page with "Back to today's summary" and "Back to Start".
- Reload: the return visit shows the score, category and top ten, **with the Share button** (it had none before), and a GET only.
- The browser's toolbar colour still matches the court on mobile.

- [ ] **Step 8: Show the user, then commit**

```bash
git add components/ball-knowledge app/ball-knowledge.css tests/components/ball-knowledge-finish-result.test.tsx
git commit -m "feat(ball-knowledge): finish screen with one share button and percentile"
```

---

### Task 12: Remove what nothing uses, and check all seven together

**Files:**
- Delete: `components/daily/daily-complete-shell.tsx`, `components/daily/other-dailies.tsx`
- Modify: `components/streak/streak-notifier.tsx` (delete `WinStreakLine` only if nothing uses it), `app/globals.css` (delete the `.od-section`, `.od-label`, `.od-grid`, `.od-card*` rules), `lib/games/today.ts` and its test (delete `otherDailies` only if nothing uses it)

- [ ] **Step 1: Find what is still used**

```bash
for name in DailyCompleteShell OtherDailies WinStreakLine "otherDailies(" DailyCompleteOverlay; do echo "== $name"; grep -rn "$name" app components lib tests --include="*.ts" --include="*.tsx" | grep -v "^components/daily/daily-complete-shell.tsx\|^components/daily/other-dailies.tsx"; done
for cls in od-section od-label od-grid od-card od-preview; do echo "== $cls"; grep -rn "$cls" app components --include="*.tsx"; done
```

Expected: `DailyCompleteShell` and `OtherDailies` have no users. `DailyCompleteOverlay` is used by `finish-screen.tsx` only. `WinStreakLine` is still used by the Freeze Frames home screen. `od-preview*` classes are still used by `components/daily/game-card-preview.tsx` (the home page).

- [ ] **Step 2: Delete**

- Delete the two component files that have no users.
- In `app/globals.css` delete the rules for `.od-section`, `.od-label`, `.od-grid` (including its media query), and every `.od-card…` rule. Keep every `.od-preview…` rule.
- Delete `WinStreakLine` from `components/streak/streak-notifier.tsx` only if Step 1 found no user. If Freeze Frames' home screen still uses it, leave it.
- Delete `otherDailies` from `lib/games/today.ts` and its `describe("otherDailies", ...)` block in `tests/lib/games/today.test.ts` only if Step 1 found no user outside the test.
- Change the heading comment in `app/globals.css` from `/* ── Daily complete overlay + other-dailies cards ── */` to `/* ── Daily complete overlay ── */`.

- [ ] **Step 3: Full gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all pass.

Run: `git diff --name-only main...HEAD -- '*.ts' '*.tsx' | xargs pnpm exec eslint`
Expected: no errors that are not also reported on `main` for the same file. For any file with errors, compare against `git show main:<file> | pnpm exec eslint --stdin --stdin-filename <file>`.

- [ ] **Step 4: All seven, side by side**

With `pnpm dev -p 3210` running, go through every game once more in this order, in a fresh browser profile (empty localStorage), dark theme, 390px wide: Chain Link, Brain Dead, AnyGuessr, Freeze Frames, Ball Knowledge, Hot Takes, Getting Warmer. After each one, follow the "Play <game> →" button instead of navigating by hand.

- The run fills left to right, and "Up next" always names the next unplayed game in that order.
- The sweep line counts up from "1 of 7 today · 6 to go for a Sweep" to "6 of 7 today · 1 to go for a Sweep".
- "Or pick another" shrinks by one each time and is gone when one game is left.
- After the seventh: the Sweep panel with "Your 1st Sweep.", the countdown inside it, and "Create a Draft room →"; no separate countdown line under the streak.
- The order of blocks is the same in all seven: run, result, curve (five games), buttons, Up next, streak, countdown.
- The countdown reads "New puzzles in Xh Ym" everywhere.
- Go back to `/`: all seven show as done, as before.

Repeat a spot check in the light theme at 1280px on Brain Dead, Freeze Frames and Hot Takes.

- [ ] **Step 5: Show the user, then commit**

```bash
git add -A components/daily components/streak app/globals.css lib/games/today.ts tests/lib/games/today.test.ts
git commit -m "chore(daily): remove the old finish shell and More dailies block"
```

Then tell the user the branch is ready and ask how they want it merged. Do not merge or push without their say-so.
