# Arcade Punch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Brain Dead and Chainlink visually punchier (bigger springier feedback, impact rings, particle bursts, screen shake, streak escalation, score slam) without touching sound.

**Architecture:** Retune the shared `anim-*` keyframes in `app/globals.css` in place and add three new classes. Add four small helpers to `lib/motion` (`juiceLevel`, `prefersReducedMotion`, `burstFrom`, `impactRing`) and a `fromPrevious` option on `useCountUp`. Wire them into the existing feedback hooks in the two game components. Streak escalation travels through one CSS variable, `--juice`.

**Tech Stack:** Next.js 16, React 19 (React Compiler on), TypeScript, plain CSS in `app/globals.css`, `canvas-confetti` 1.9 (already installed), Vitest 4 with jsdom and Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-arcade-punch-design.md`

## Global Constraints

- No sound changes: do not edit `lib/audio`, `public/sounds`, or add, remove or alter any `play()` call.
- No new dependencies.
- No haptics.
- Scope is Brain Dead and Chainlink. Do not edit other games' components.
- Do not touch `anim-fade-slide-up`, `anim-slide-in-top` or `anim-glow-pulse` (Draft Anything uses them).
- Retune existing classes in place; keep their names.
- Every new effect is a no-op or flattened under `prefers-reduced-motion`.
- `anim-screen-shake` must never go on an ancestor of a modal or overlay.
- Do not commit unless the user asks; leave changes in the working tree.

## Review Focus

1. **Browser without `matchMedia`** (old webviews, jsdom): helpers must not throw; effects simply run. Pinned in Task 1.
2. **Target element gone when a delayed effect fires** (Chainlink row unmounted by reset inside the 260ms delay): `burstFrom` and `impactRing` accept `null` and do nothing. Pinned in Task 1.
3. **Rapid repeated triggers** (two rings on the same element before the first is removed): each ring is removed by its own timer, none leak. Pinned in Task 1.
4. **Score dropping to a lower value** (new Brain Dead run resets score to 0 while `fromPrevious` is on): the count animates down to the target and lands exactly on it. Pinned in Task 2.
5. **Screen shake displacing fixed-position UI**: a transform on an ancestor moves `position: fixed` children. Not unit-testable; pinned as an explicit manual check in Task 6, and enforced structurally in Tasks 4 and 5 by which element receives the class.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lib/motion/prefers-reduced-motion.ts` (new) | One non-hook check of the OS reduced-motion preference, safe without `matchMedia` |
| `lib/motion/juice-level.ts` (new) | Streak count → level 0–3 |
| `lib/motion/burst.ts` (new) | Small particle burst from an element |
| `lib/motion/impact-ring.ts` (new) | Expanding ring appended to an element |
| `lib/motion/confetti.ts` (modify) | Export `PRESETS`, add `correct` palette |
| `lib/motion/count-up.ts` (modify) | `fromPrevious` option, reduced-motion jump |
| `lib/motion/motion-kit.test.ts` (new) | Tests for the four new helpers |
| `lib/motion/count-up.test.tsx` (new) | Tests for `useCountUp` |
| `app/globals.css` (modify) | Retuned keyframes, three new classes |
| `components/brain-dead/game.tsx` (modify) | Wire effects into Brain Dead |
| `components/chainlink/game.tsx` (modify) | Wire effects into Chainlink |

---

### Task 1: Motion helpers

**Files:**
- Create: `lib/motion/prefers-reduced-motion.ts`, `lib/motion/juice-level.ts`, `lib/motion/burst.ts`, `lib/motion/impact-ring.ts`
- Modify: `lib/motion/confetti.ts:1-6`
- Test: `lib/motion/motion-kit.test.ts`

**Interfaces:**
- Produces:
  - `prefersReducedMotion(): boolean`
  - `type JuiceLevel = 0 | 1 | 2 | 3` and `juiceLevel(streak: number): JuiceLevel`
  - `burstFrom(el: HTMLElement | null, level?: JuiceLevel, preset?: ConfettiPreset): Promise<void>`
  - `impactRing(el: HTMLElement | null, color: string): void`
  - `PRESETS` exported from `confetti.ts`, with a new `"correct"` key in `ConfettiPreset`

- [ ] **Step 1: Write the failing tests**

Create `lib/motion/motion-kit.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import confetti from "canvas-confetti";
import { burstFrom } from "./burst";
import { impactRing } from "./impact-ring";
import { juiceLevel } from "./juice-level";
import { prefersReducedMotion } from "./prefers-reduced-motion";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

function setReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches }));
}

function makeEl(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  el.getBoundingClientRect = () =>
    ({ left: 100, top: 200, width: 200, height: 100 }) as DOMRect;
  return el;
}

beforeEach(() => {
  vi.mocked(confetti).mockClear();
  setReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("prefersReducedMotion", () => {
  it("reflects the media query", () => {
    setReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    setReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns false when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("juiceLevel", () => {
  it.each([
    [0, 0], [2, 0], [3, 1], [4, 1], [5, 2], [7, 2], [8, 3], [20, 3],
  ])("streak %i is level %i", (streak, level) => {
    expect(juiceLevel(streak)).toBe(level);
  });
});

describe("burstFrom", () => {
  it("fires from the centre of the element", async () => {
    await burstFrom(makeEl(), 0, "correct");
    expect(confetti).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(confetti).mock.calls[0][0]!;
    expect(opts.origin!.x).toBeCloseTo(200 / window.innerWidth);
    expect(opts.origin!.y).toBeCloseTo(250 / window.innerHeight);
    expect(opts.particleCount).toBe(14);
  });

  it("scales particle count with level", async () => {
    await burstFrom(makeEl(), 3);
    expect(vi.mocked(confetti).mock.calls[0][0]!.particleCount).toBe(50);
  });

  it("does nothing for a null element", async () => {
    await burstFrom(null, 2);
    expect(confetti).not.toHaveBeenCalled();
  });

  it("does nothing under reduced motion", async () => {
    setReducedMotion(true);
    await burstFrom(makeEl(), 2);
    expect(confetti).not.toHaveBeenCalled();
  });

  it("still fires when matchMedia is unavailable", async () => {
    vi.stubGlobal("matchMedia", undefined);
    await burstFrom(makeEl());
    expect(confetti).toHaveBeenCalledTimes(1);
  });
});

describe("impactRing", () => {
  it("appends a ring and removes it after the animation", () => {
    vi.useFakeTimers();
    const el = makeEl();
    impactRing(el, "red");
    const ring = el.querySelector<HTMLElement>(".anim-impact-ring");
    expect(ring).not.toBeNull();
    expect(ring!.style.getPropertyValue("--ring")).toBe("red");
    vi.advanceTimersByTime(460);
    expect(el.querySelector(".anim-impact-ring")).toBeNull();
  });

  it("cleans up every ring when triggered twice in quick succession", () => {
    vi.useFakeTimers();
    const el = makeEl();
    impactRing(el, "red");
    vi.advanceTimersByTime(100);
    impactRing(el, "red");
    expect(el.querySelectorAll(".anim-impact-ring")).toHaveLength(2);
    vi.advanceTimersByTime(460);
    expect(el.querySelectorAll(".anim-impact-ring")).toHaveLength(0);
  });

  it("does nothing for a null element or under reduced motion", () => {
    expect(() => impactRing(null, "red")).not.toThrow();
    setReducedMotion(true);
    const el = makeEl();
    impactRing(el, "red");
    expect(el.querySelector(".anim-impact-ring")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run lib/motion/motion-kit.test.ts`
Expected: FAIL, cannot resolve `./burst` (and the other new modules).

- [ ] **Step 3: Implement**

Create `lib/motion/prefers-reduced-motion.ts`:

```ts
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

Create `lib/motion/juice-level.ts`:

```ts
export type JuiceLevel = 0 | 1 | 2 | 3;

export function juiceLevel(streak: number): JuiceLevel {
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}
```

In `lib/motion/confetti.ts`, replace the `PRESETS` declaration (lines 1–4) with:

```ts
export const PRESETS = {
  gold: ["#c9a84c", "#f0c860", "#7c3aff", "#00e5ff", "#ffffff"],
  "brain-dead": ["#ff3c3c", "#f0c860", "#ffffff", "#ef4444", "#c9a84c"],
  correct: ["#22c55e", "#86efac", "#f0c860", "#ffffff"],
} as const;
```

Create `lib/motion/burst.ts`:

```ts
import { PRESETS, type ConfettiPreset } from "./confetti";
import type { JuiceLevel } from "./juice-level";
import { prefersReducedMotion } from "./prefers-reduced-motion";

export async function burstFrom(
  el: HTMLElement | null,
  level: JuiceLevel = 0,
  preset: ConfettiPreset = "gold",
): Promise<void> {
  if (typeof window === "undefined" || !el || prefersReducedMotion()) return;

  const rect = el.getBoundingClientRect();
  const { default: confetti } = await import("canvas-confetti");

  confetti({
    particleCount: 14 + 12 * level,
    spread: 60 + 12 * level,
    startVelocity: 20 + 4 * level,
    ticks: 70,
    gravity: 1.3,
    scalar: 0.7,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    colors: [...PRESETS[preset]],
    disableForReducedMotion: true,
  });
}
```

Create `lib/motion/impact-ring.ts`:

```ts
import { prefersReducedMotion } from "./prefers-reduced-motion";

export function impactRing(el: HTMLElement | null, color: string): void {
  if (!el || prefersReducedMotion()) return;
  const ring = document.createElement("div");
  ring.className = "anim-impact-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.style.setProperty("--ring", color);
  el.appendChild(ring);
  window.setTimeout(() => ring.remove(), 460);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run lib/motion/motion-kit.test.ts`
Expected: PASS, all tests.

---

### Task 2: `useCountUp` from previous value

**Files:**
- Modify: `lib/motion/count-up.ts` (whole file)
- Test: `lib/motion/count-up.test.tsx`

**Interfaces:**
- Consumes: `prefersReducedMotion()` from Task 1
- Produces: `useCountUp(target: number, active: boolean, durationMs?: number, fromPrevious?: boolean): number`. The first three parameters behave as before; `components/anyguessr/results.tsx` calls it with three and must keep working unchanged.

- [ ] **Step 1: Write the failing tests**

Create `lib/motion/count-up.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "./count-up";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function settle() {
  act(() => {
    vi.advanceTimersByTime(600);
  });
}

describe("useCountUp", () => {
  it("counts up from 0 to the target", () => {
    const { result } = renderHook(() => useCountUp(100, true, 400));
    expect(result.current).toBe(0);
    settle();
    expect(result.current).toBe(100);
  });

  it("restarts from 0 on a new target by default", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 400), {
      initialProps: { t: 100 },
    });
    settle();
    rerender({ t: 250 });
    expect(result.current).toBe(0);
    settle();
    expect(result.current).toBe(250);
  });

  it("continues from the previous value with fromPrevious", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 400, true), {
      initialProps: { t: 100 },
    });
    settle();
    rerender({ t: 250 });
    expect(result.current).toBe(100);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBeGreaterThan(100);
    expect(result.current).toBeLessThan(250);
    settle();
    expect(result.current).toBe(250);
  });

  it("counts down to a lower target with fromPrevious", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 400, true), {
      initialProps: { t: 300 },
    });
    settle();
    rerender({ t: 0 });
    settle();
    expect(result.current).toBe(0);
  });

  it("jumps straight to the target under reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { result } = renderHook(() => useCountUp(100, true, 400));
    expect(result.current).toBe(100);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run lib/motion/count-up.test.tsx`
Expected: the `fromPrevious` tests and the reduced-motion test FAIL; the first two pass.

- [ ] **Step 3: Implement**

Replace `lib/motion/count-up.ts` with:

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./prefers-reduced-motion";

export function useCountUp(
  target: number,
  active: boolean,
  durationMs = 800,
  fromPrevious = false,
): number {
  const [value, setValue] = useState(active ? 0 : target);
  const shownRef = useRef(value);

  useEffect(() => {
    const show = (next: number) => {
      shownRef.current = next;
      setValue(next);
    };

    if (!active || prefersReducedMotion()) {
      show(target);
      return;
    }

    const from = fromPrevious ? shownRef.current : 0;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      show(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    if (!fromPrevious) show(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, durationMs, fromPrevious]);

  return value;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run lib/motion`
Expected: PASS for both test files.

---

### Task 3: Retune and extend the shared CSS

**Files:**
- Modify: `app/globals.css` — `cl-letter-in` (~line 940), the "Shared game juice keyframes" block (~lines 1114–1176)

**Interfaces:**
- Produces: classes `anim-screen-shake`, `anim-impact-ring`, `anim-score-slam`; retuned `anim-shake`, `anim-pop-in`, `anim-flash-green`, `anim-flash-red`, `anim-score-float`, `anim-streak-pulse`; retuned keyframe `cl-letter-in`. Pop, ring and streak pulse read `var(--juice, 0)`; the ring reads `var(--ring)`.

There is no unit test for CSS; the deliverable is checked by lint/build here and by eye in Task 6.

- [ ] **Step 1: Retune `cl-letter-in`**

Replace the existing `@keyframes cl-letter-in { … }` block with:

```css
@keyframes cl-letter-in {
  0%   { opacity: 0; transform: translateY(14px) scale(0.5) rotate(-8deg); }
  55%  { opacity: 1; transform: translateY(-6px) scale(1.2) rotate(3deg); }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
}
```

- [ ] **Step 2: Retune the shared keyframes**

Replace the existing `anim-shake-kf`, `anim-pop-in-kf`, `anim-flash-green-kf`, `anim-flash-red-kf`, `anim-score-float-kf` and `anim-streak-pulse-kf` blocks with these (leave `anim-slide-in-top-kf`, `anim-fade-slide-up-kf`, `anim-glow-pulse-kf`, `anim-question-out-kf`, `anim-question-in-kf` exactly as they are):

```css
@keyframes anim-shake-kf {
  0%, 100% { transform: translateX(0) rotate(0); }
  15%      { transform: translateX(-10px) rotate(-1.5deg); }
  30%      { transform: translateX(9px) rotate(1.5deg); }
  45%      { transform: translateX(-7px) rotate(-1deg); }
  60%      { transform: translateX(5px) rotate(0.6deg); }
  80%      { transform: translateX(-2px) rotate(0); }
}
@keyframes anim-pop-in-kf {
  0%   { opacity: 0; transform: scale(0.8); }
  50%  { opacity: 1; transform: scale(calc(1.12 + 0.03 * var(--juice, 0))); }
  75%  { transform: scale(0.97); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes anim-flash-green-kf {
  0%, 100% { box-shadow: inset 0 0 0 999px rgba(34,197,94,0), inset 0 0 28px rgba(34,197,94,0), 0 0 26px rgba(34,197,94,0); }
  25%      { box-shadow: inset 0 0 0 999px rgba(34,197,94,0.22), inset 0 0 28px rgba(34,197,94,0.55), 0 0 26px rgba(34,197,94,0.5); }
}
@keyframes anim-flash-red-kf {
  0%, 100% { box-shadow: inset 0 0 0 999px rgba(255,60,60,0), inset 0 0 28px rgba(255,60,60,0), 0 0 26px rgba(255,60,60,0); }
  25%      { box-shadow: inset 0 0 0 999px rgba(255,60,60,0.24), inset 0 0 28px rgba(255,60,60,0.6), 0 0 26px rgba(255,60,60,0.5); }
}
@keyframes anim-score-float-kf {
  0%   { opacity: 0; transform: translateY(6px) scale(0.5); }
  18%  { opacity: 1; transform: translateY(-6px) scale(1.25); }
  35%  { opacity: 1; transform: translateY(-10px) scale(1); }
  100% { opacity: 0; transform: translateY(-48px) scale(1); }
}
@keyframes anim-streak-pulse-kf {
  0%, 100% { transform: scale(1); }
  40%      { transform: scale(calc(1.25 + 0.08 * var(--juice, 0))); }
}
```

- [ ] **Step 3: Add the new keyframes**

Directly after `anim-streak-pulse-kf`, add:

```css
@keyframes anim-screen-shake-kf {
  0%, 100% { transform: translate(0, 0); }
  20%      { transform: translate(-6px, 3px); }
  40%      { transform: translate(6px, -3px); }
  60%      { transform: translate(-4px, -2px); }
  80%      { transform: translate(3px, 2px); }
}
@keyframes anim-impact-ring-kf {
  0%   { opacity: 0.9; transform: scale(1); }
  100% { opacity: 0; transform: scale(calc(1.5 + 0.12 * var(--juice, 0))); }
}
@keyframes anim-score-slam-kf {
  0%   { transform: scale(1.5); filter: brightness(1.6); }
  100% { transform: scale(1); filter: brightness(1); }
}
```

- [ ] **Step 4: Update the class rules**

Replace these six existing rules:

```css
.anim-shake { animation: anim-shake-kf 0.38s ease-out; }
.anim-pop-in { animation: anim-pop-in-kf 0.42s ease-out both; }
.anim-flash-green { animation: anim-flash-green-kf 0.5s ease-out; }
.anim-flash-red { animation: anim-flash-red-kf 0.5s ease-out; }
.anim-score-float { animation: anim-score-float-kf 0.9s ease-out forwards; }
.anim-streak-pulse { animation: anim-streak-pulse-kf 0.4s ease-out; }
```

and add after `.anim-streak-pulse`:

```css
.anim-screen-shake { animation: anim-screen-shake-kf 0.25s linear; }
.anim-impact-ring {
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  border: 2px solid var(--ring, #22c55e);
  pointer-events: none;
  animation: anim-impact-ring-kf 0.45s ease-out forwards;
}
.anim-score-slam {
  display: inline-block;
  animation: anim-score-slam-kf 0.32s cubic-bezier(0.2, 1.4, 0.4, 1);
}
```

- [ ] **Step 5: Verify**

Run: `git diff --stat app/globals.css && grep -n "anim-slide-in-top-kf\|anim-fade-slide-up-kf\|anim-glow-pulse-kf" -A3 app/globals.css`
Expected: only `app/globals.css` changed; the three untouched keyframes still read `translateY(-8px)`, `translateY(12px)` and `0 0 16px rgba(201,168,76,0.28)`.

---

### Task 4: Wire Brain Dead

**Files:**
- Modify: `components/brain-dead/game.tsx`

**Interfaces:**
- Consumes: `burstFrom`, `impactRing`, `juiceLevel`, `useCountUp(target, active, durationMs, fromPrevious)`, classes from Task 3.

Leave every `play()` call exactly where it is.

- [ ] **Step 1: Imports**

After the `triggerAnimation` import add:

```ts
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { juiceLevel } from "@/lib/motion/juice-level";
import { useCountUp } from "@/lib/motion/count-up";
```

- [ ] **Step 2: Refs, derived values, score slam**

After `const questionCardRef = useRef<HTMLDivElement>(null);` add:

```ts
  const playAreaRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const displayScore = useCountUp(score, true, 400, true);
```

After the `useEffect` that sets `screenRef.current = screen` add:

```ts
  useEffect(() => {
    if (score > 0) triggerAnimation(scoreRef.current, "anim-score-slam", 320);
  }, [score]);
```

- [ ] **Step 3: Timeout**

In the timer interval's `remaining <= 0` branch, replace

```ts
          triggerAnimation(questionCardRef.current, "anim-flash-red", 450);
```

with

```ts
          triggerAnimation(questionCardRef.current, "anim-flash-red", 500);
          triggerAnimation(playAreaRef.current, "anim-screen-shake", 250);
```

- [ ] **Step 4: `handleAnswer`**

Change the signature to `const handleAnswer = (idx: number, btn: HTMLElement) => {`.

In the correct branch replace

```ts
      triggerAnimation(questionCardRef.current, "anim-flash-green", 450);
      setScoreFloat(points);
      setTimeout(() => setScoreFloat(null), 700);
```

with

```ts
      const nextCorrect = correct + 1;
      triggerAnimation(questionCardRef.current, "anim-flash-green", 500);
      impactRing(btn, "var(--bd-success)");
      void burstFrom(btn, juiceLevel(nextCorrect), "correct");
      if (nextCorrect === 3 || nextCorrect === 5 || nextCorrect === 8) {
        triggerAnimation(streakRef.current, "anim-streak-pulse", 400);
      }
      setScoreFloat(points);
      setTimeout(() => setScoreFloat(null), 900);
```

In the wrong branch replace

```ts
      triggerAnimation(questionCardRef.current, "anim-flash-red", 450);
```

with

```ts
      triggerAnimation(questionCardRef.current, "anim-flash-red", 500);
      impactRing(btn, "var(--bd-danger)");
      triggerAnimation(playAreaRef.current, "anim-screen-shake", 250);
```

- [ ] **Step 5: Gameplay wrapper**

In the final `return gameShell(<> … </>)`, the `DailyIntroModal` block stays first and outside the wrapper. Immediately after it, open a wrapper around everything else (top bar, timer, question, answers, streak) and close it just before `</>`:

```tsx
      <div
        ref={playAreaRef}
        style={{ "--juice": juiceLevel(correct) } as React.CSSProperties}
      >
        {/* top bar … streak block, unchanged order */}
      </div>
```

- [ ] **Step 6: Score, float, buttons, streak**

Score in the top bar — replace

```tsx
          Score: <span style={{ color: "var(--bd-primary)", fontWeight: 600 }}>{score}</span>
```

with

```tsx
          Score:{" "}
          <span
            ref={scoreRef}
            style={{ display: "inline-block", color: "var(--bd-primary)", fontWeight: 800, fontSize: "18px" }}
          >
            {displayScore}
          </span>
```

Score float — in the `anim-score-float` div's style, replace `fontSize: "14px",` with:

```tsx
              fontSize: "calc(20px + 3px * var(--juice, 0))",
              textShadow: "0 0 12px rgba(34,197,94,0.6)",
              pointerEvents: "none",
```

Answer buttons — replace `onClick={() => handleAnswer(i)}` with `onClick={(e) => handleAnswer(i, e.currentTarget)}` and add `position: "relative",` to the button's inline style.

Streak block — add `ref={streakRef}` to the `<div style={{ textAlign: "center" }}>` that contains the "Streak" label and dots.

- [ ] **Step 7: Verify**

Run: `pnpm typecheck && pnpm lint && git diff components/brain-dead/game.tsx | grep -E '^[+-].*play\(' ; echo "play-diff-exit=$?"`
Expected: typecheck and lint clean; no diff lines containing `play(` (grep exit 1).

---

### Task 5: Wire Chainlink

**Files:**
- Modify: `components/chainlink/game.tsx`

**Interfaces:**
- Consumes: `burstFrom`, `impactRing`, classes from Task 3.

Leave every `play()` call exactly where it is.

- [ ] **Step 1: Imports**

After the `triggerAnimation` import add:

```ts
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
```

- [ ] **Step 2: Mark the chain wrapper**

In the main component, the rows are rendered inside `<div style={{ display: "flex", flexDirection: "column" }}>` under the `{/* ---- Word chain + completion overlay ---- */}` comment. Add `className="cl-chain"` to that div. The completion and fail overlays are its siblings, not its children, so shaking it cannot move them.

- [ ] **Step 3: Wrong guess**

In `WordRow`'s `trySubmit`, in the `result === "incorrect"` branch, after the existing `triggerAnimation(rowRef.current, "anim-flash-red", 500);` add:

```ts
      triggerAnimation(
        rowRef.current?.closest<HTMLElement>(".cl-chain") ?? null,
        "anim-screen-shake",
        250,
      );
```

- [ ] **Step 4: Solve burst**

In `WordRow`, after the "Clear local input when word changes" effect, add:

```ts
  useEffect(() => {
    if (!revealTrigger) return;
    const timer = window.setTimeout(() => {
      impactRing(rowRef.current, "var(--cl-green)");
      void burstFrom(rowRef.current, 1, "correct");
    }, 260);
    return () => window.clearTimeout(timer);
  }, [revealTrigger]);
```

The row already has `position: "relative"`, which the ring needs.

- [ ] **Step 5: Letter stagger**

In `letterStyle`, replace

```ts
        animation: `cl-letter-in 0.35s ease both`,
        animationDelay: `${0.05 * i}s`,
```

with

```ts
        animation: `cl-letter-in 0.4s cubic-bezier(0.3, 1.5, 0.5, 1) both`,
        animationDelay: `${0.055 * i}s`,
```

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint && git diff components/chainlink/game.tsx | grep -E '^[+-].*play\(' ; echo "play-diff-exit=$?"`
Expected: typecheck and lint clean; no diff lines containing `play(` (grep exit 1).

---

### Task 6: Full verification

- [ ] **Step 1: Gate**

Run: `pnpm verify`
Expected: lint, typecheck, all unit tests and the production build pass.

- [ ] **Step 2: Sound untouched**

Run: `git status --short lib/audio public/sounds`
Expected: no output.

- [ ] **Step 3: Manual check in the browser** (`pnpm dev`)

- Brain Dead freeplay: correct answer shows ring, burst, bigger pop, score slam and count-up; streak dots pulse at 3, 5 and 8 and later effects grow; wrong answer and timeout shake the play area.
- Brain Dead daily: the intro modal and the completion modal do not jump during a shake (Review Focus 5).
- Chainlink: wrong guess shakes the chain; solved word staggers letters then rings and bursts; hint and full-chain confetti unchanged; overlays do not jump.
- Both games in light and dark theme at phone width.
- AnyGuessr: the punchier `anim-pop-in` looks acceptable.
- OS reduced motion on: no bursts, rings, shakes or count-up.
