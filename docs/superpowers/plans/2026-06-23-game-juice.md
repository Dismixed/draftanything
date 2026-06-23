# Game Juice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shared sound and animation feedback across Chainlink, Brain Dead, and Draft Anything.

**Architecture:** Client-only `SoundProvider` at the root unlocks Web Audio on first interaction. A typed `play(SoundId)` API routes to synth oscillators or preloaded `HTMLAudioElement` samples. Shared CSS animation utilities in `globals.css`; per-game components call `play()` and apply one-shot classes at existing state-transition hooks. No new npm dependencies.

**Tech Stack:** Next.js 16, React 19, Web Audio API, `canvas-confetti` (existing), Vitest, Playwright

**Design spec:** `docs/superpowers/specs/2026-06-23-game-juice-design.md`

---

## File Map

```text
app/
  layout.tsx                          Add Providers wrapper with SoundProvider
  providers.tsx                       NEW — client shell for SoundProvider
  page.tsx                            Add SoundToggle to hub header
  globals.css                         Shared keyframes + anim-* utilities; cl-* keyframes

lib/
  audio/
    types.ts                          SoundId, SoundDefinition, SoundProfile
    synth.ts                          Web Audio synth presets (tap, tick, whoosh, etc.)
    samples.ts                        Preload/cache HTMLAudioElement per sample
    sounds.ts                         Registry mapping SoundId → definition
    sound-context.tsx                 SoundProvider, useSound hook
    play.ts                           play(id) with unlock/mute/reduced-motion gating
    debounce.ts                       pickSoundDebounce for multiplayer
    synth.test.ts                     Unit tests
    play.test.ts                      Unit tests
  motion/
    use-reduced-motion.ts             matchMedia hook
    trigger-class.ts                  One-shot CSS class helper
    confetti.ts                       Shared confetti presets (extract from results)
    count-up.ts                       Optional score count-up helper

components/
  ui/
    sound-toggle.tsx                  Mute/unmute button
  results/
    results-confetti.tsx              Refactor to use lib/motion/confetti.ts
  chainlink/
    game.tsx                          Wire sounds; remove injected keyframes
  brain-dead/
    game.tsx                          Wire sounds + animations
  draft/
    draft-board.tsx                   Phase/pick/turn sound hooks
    pick-history.tsx                  Slide-in on new pick
    turn-timer.tsx                    Urgency tick sound
    veto-panel.tsx                    Veto phase sounds
    ai-desk.tsx                       Commentary slide-in

public/
  sounds/
    correct.mp3                       NEW
    wrong.mp3                         NEW
    win.mp3                           NEW
    streak.mp3                        NEW
    pick.mp3                          NEW
    veto.mp3                          NEW
    veto-success.mp3                  NEW
```

---

## Task 1: Audio types and synth layer

**Files:**
- Create: `lib/audio/types.ts`
- Create: `lib/audio/synth.ts`
- Create: `lib/audio/synth.test.ts`

- [ ] **Step 1: Define types**

```ts
// lib/audio/types.ts
export type SoundId =
  | "ui.tap" | "ui.tick" | "ui.whoosh" | "ui.error"
  | "turn" | "phase"
  | "correct" | "wrong" | "win" | "streak" | "hint"
  | "pick" | "veto" | "veto-success";

export type SoundProfile = "arcade" | "restrained";

export type SoundDefinition =
  | { type: "synth"; synthKey: SynthKey; volume: number; profile: SoundProfile; celebratory?: boolean }
  | { type: "sample"; src: string; volume: number; profile: SoundProfile; celebratory?: boolean };

export type SynthKey = "tap" | "tick" | "whoosh" | "error" | "turn" | "phase" | "hint";
```

- [ ] **Step 2: Implement synth presets**

`lib/audio/synth.ts` exports `createAudioContext()`, `playSynth(key, volume)`, and lazily creates one shared `AudioContext` after unlock. Each preset is a short oscillator envelope (&lt;200ms for tap, ~100ms for tick).

- [ ] **Step 3: Write synth tests**

Test that `playSynth` does not throw when context is suspended; mock `AudioContext` in jsdom.

- [ ] **Step 4: Run tests**

```bash
pnpm test -- lib/audio/synth.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/audio/types.ts lib/audio/synth.ts lib/audio/synth.test.ts
git commit -m "Add Web Audio synth layer for UI sound effects"
```

---

## Task 2: Sound registry, samples, and play API

**Files:**
- Create: `lib/audio/sounds.ts`
- Create: `lib/audio/samples.ts`
- Create: `lib/audio/play.ts`
- Create: `lib/audio/debounce.ts`
- Create: `lib/audio/play.test.ts`
- Create: `public/sounds/*.mp3` (7 short files — source from royalty-free pack, e.g. Kenney UI Audio)

- [ ] **Step 1: Build registry**

`sounds.ts` maps every `SoundId` to a `SoundDefinition`. Mark `correct`, `wrong`, `win`, `streak` as `celebratory: true`.

- [ ] **Step 2: Sample preloader**

`samples.ts` exports `preloadSamples()` and `playSample(src, volume)`. Clone `Audio` element per play to allow overlap.

- [ ] **Step 3: play() with gating**

`play.ts` accepts runtime state `{ unlocked, muted, reducedMotion, profile }`. Returns early if locked/muted. Skips `celebratory` sounds when `reducedMotion`. Applies profile volume multiplier (restrained = 0.55).

- [ ] **Step 4: Debounce helper**

`debounce.ts` exports `createSoundGate(ms)` for opponent pick debouncing.

- [ ] **Step 5: Write play tests**

Cover: no-op when locked, no-op when muted, celebratory skipped when reduced motion, profile volume scaling.

- [ ] **Step 6: Add sound files**

Place 7 mp3 files in `public/sounds/`. Verify total added size &lt; 350KB.

- [ ] **Step 7: Run tests**

```bash
pnpm test -- lib/audio/
```

- [ ] **Step 8: Commit**

```bash
git add lib/audio/ public/sounds/
git commit -m "Add sound registry and play API with sample preloading"
```

---

## Task 3: SoundProvider and mute toggle

**Files:**
- Create: `lib/audio/sound-context.tsx`
- Create: `app/providers.tsx`
- Create: `components/ui/sound-toggle.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: SoundProvider**

Client component. State: `unlocked`, `muted` (read `stim-sound-muted` from localStorage on mount). On mount, attach one-time `pointerdown`/`keydown` listeners to unlock + `preloadSamples()`. Expose `{ play, toggleMute, muted, unlocked }` via context.

- [ ] **Step 2: useSound hook**

```ts
export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
```

- [ ] **Step 3: Providers shell**

```tsx
// app/providers.tsx
"use client";
export function Providers({ children }: { children: React.ReactNode }) {
  return <SoundProvider>{children}</SoundProvider>;
}
```

- [ ] **Step 4: Wire root layout**

Wrap `{children}` in `<Providers>` inside `app/layout.tsx`.

- [ ] **Step 5: SoundToggle component**

Speaker icon (SVG inline). `aria-label={muted ? "Unmute sounds" : "Mute sounds"}`, `aria-pressed={muted}`. Calls `toggleMute()`.

- [ ] **Step 6: Add toggle to hub**

Place `SoundToggle` in Stim Games hub header (`app/page.tsx`), top-right near nav.

- [ ] **Step 7: Manual verify**

```bash
pnpm dev
```

Click anywhere → subsequent `play("ui.tap")` from console/hook should work. Toggle mute → silent.

- [ ] **Step 8: Commit**

```bash
git add lib/audio/sound-context.tsx app/providers.tsx app/layout.tsx components/ui/sound-toggle.tsx app/page.tsx
git commit -m "Add SoundProvider with global mute toggle on hub"
```

---

## Task 4: Shared motion utilities and CSS

**Files:**
- Create: `lib/motion/use-reduced-motion.ts`
- Create: `lib/motion/trigger-class.ts`
- Create: `lib/motion/confetti.ts`
- Modify: `app/globals.css`
- Modify: `components/results/results-confetti.tsx`

- [ ] **Step 1: useReducedMotion hook**

Subscribe to `matchMedia("(prefers-reduced-motion: reduce)")` changes.

- [ ] **Step 2: triggerAnimation helper**

```ts
export function triggerAnimation(el: HTMLElement | null, className: string, durationMs: number) {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth; // reflow
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), durationMs);
}
```

- [ ] **Step 3: Extract confetti presets**

Move confetti logic from `results-confetti.tsx` into `lib/motion/confetti.ts`:

```ts
export function fireConfetti(preset: "gold" | "brain-dead") { ... }
```

Update `ResultsConfetti` to call `fireConfetti("gold")`.

- [ ] **Step 4: Add shared CSS to globals.css**

Add keyframes: `anim-shake`, `anim-pop-in`, `anim-flash-green`, `anim-flash-red`, `anim-slide-in-top`, `anim-fade-slide-up`, `anim-score-float`, `anim-glow-pulse`.

Move Chainlink keyframes from `components/chainlink/game.tsx` (`cl-letter-in`, `cl-chain-grow`, `cl-shake`, `cl-hint-pulse`) into `globals.css`.

Add utility classes:

```css
.anim-shake { animation: anim-shake 0.4s ease; }
/* etc. */
```

- [ ] **Step 5: Verify build**

```bash
pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add lib/motion/ app/globals.css components/results/results-confetti.tsx
git commit -m "Add shared motion utilities and animation CSS"
```

---

## Task 5: Chainlink juice

**Files:**
- Modify: `components/chainlink/game.tsx`
- Create: `components/chainlink/chain-complete.tsx` (optional — confetti + count-up wrapper)

- [ ] **Step 1: Remove injected keyframes**

Delete `REVEAL_KEYFRAMES` constant and the `useEffect` that injects `<style id="cl-keyframes">`. Animations now come from `globals.css`.

- [ ] **Step 2: Wire sounds in WordRow**

In `handleLocalKeyDown`:
- `"correct"` → `play("correct")`
- `"incorrect"` → `play("wrong")` + `triggerAnimation` flash-red on row
- `"already-solved"` → `play("ui.tap")`

- [ ] **Step 3: Wire hint sound**

In `handleHint` → `play("hint")` on success.

- [ ] **Step 4: Wire completion**

When `isComplete` becomes true (useEffect on `gameStatus`):
- `play("win")`
- `fireConfetti("gold")`

- [ ] **Step 5: Button taps**

Hint button, reset, new puzzle → `play("ui.tap")`.

- [ ] **Step 6: Add SoundToggle to Chainlink header**

Top-right of game header row.

- [ ] **Step 7: Score count-up on completion card**

Animate score number from 0 → `score` over 800ms (use `lib/motion/count-up.ts` or inline `requestAnimationFrame`).

- [ ] **Step 8: Manual playtest**

Complete a Chainlink puzzle in daily and unlimited modes. Verify shake, solve chime, win fanfare, mute.

- [ ] **Step 9: Commit**

```bash
git add components/chainlink/
git commit -m "Add sound and celebration effects to Chainlink"
```

---

## Task 6: Brain Dead juice

**Files:**
- Modify: `components/brain-dead/game.tsx`

- [ ] **Step 1: Import useSound and motion helpers**

- [ ] **Step 2: handleAnswer feedback**

- Tap → `play("ui.tap")`
- Correct → `play("correct")`, flash-green on question card, `anim-pop-in` on button, show `+{points}` float element
- Wrong → `play("wrong")`, flash-red + shake on selected button

- [ ] **Step 3: Timeout**

In timer interval when remaining hits 0 → `play("wrong")` at 60% volume (pass volume override to play or use restrained profile).

- [ ] **Step 4: Streak milestones**

After incrementing correct count, if `correct` is 3, 5, or 8 → `play("streak")` + pulse streak badge.

- [ ] **Step 5: Question advance**

In the 650ms timeout after correct → `play("ui.whoosh")` before advancing `qi`. Add CSS class for question card slide transition.

- [ ] **Step 6: Timer urgency**

When `timerSecs <= 3` and ticking → `play("ui.tick")` once per second (track last tick second in ref to avoid duplicates).

- [ ] **Step 7: Result screen**

On `screen === "result"`:
- Stagger stat rows with `animation-delay`
- If `correct === questions.length` → `play("win")` + `fireConfetti("brain-dead")`

- [ ] **Step 8: Add SoundToggle to header**

- [ ] **Step 9: Manual playtest**

Play through correct, wrong, timeout, and a perfect run.

- [ ] **Step 10: Commit**

```bash
git add components/brain-dead/game.tsx
git commit -m "Add sound and animation feedback to Brain Dead"
```

---

## Task 7: Draft Anything juice

**Files:**
- Modify: `components/draft/draft-board.tsx`
- Modify: `components/draft/pick-history.tsx`
- Modify: `components/draft/turn-timer.tsx`
- Modify: `components/draft/veto-panel.tsx`
- Modify: `components/draft/ai-desk.tsx`

- [ ] **Step 1: Phase transition detection**

In `draft-board.tsx`, track `prevPhase` ref. On change → `play("phase")` with restrained profile. Special case `VETO_VOTING` → `play("veto")`.

- [ ] **Step 2: Pick success (yours)**

After successful `handlePoolPick` / `handleOffTheDomePick` → `play("pick")`.

- [ ] **Step 3: Pick from realtime (opponent)**

Track `picks.length` ref. On increase where latest pick is not yours → debounced `play("pick")` at reduced volume.

- [ ] **Step 4: Pick rejection**

In catch block of pick handlers → `play("ui.error")` + shake on active card (pass ref or use watchlist entry id).

- [ ] **Step 5: Your turn**

Track `isMyTurn` ref. On false→true during `DRAFTING` → `play("turn")` + glow pulse on turn banner.

- [ ] **Step 6: TurnTimer urgency**

In `turn-timer.tsx`, when `display <= 10` and isMyTurn, tick `play("ui.tick")` once per second at 40% volume.

- [ ] **Step 7: Pick history animation**

In `pick-history.tsx`, add `anim-slide-in-top` to newest `<li>` when `picks.length` increases.

- [ ] **Step 8: Veto panel**

On veto vote resolution (pick removed from projection) → `play("veto-success")`. On phase leaving `VETO_VOTING` with pick still present → `play("phase")`.

- [ ] **Step 9: AI commentary**

In `ai-desk.tsx`, when `commentary.length` increases → slide-in newest card (CSS class, no sound).

- [ ] **Step 10: SoundToggle in draft board header**

- [ ] **Step 11: Manual playtest**

2-browser draft: picks, veto, phase changes, mute toggle.

- [ ] **Step 12: Commit**

```bash
git add components/draft/
git commit -m "Add restrained sound and animation feedback to Draft Anything"
```

---

## Task 8: Verification and polish

**Files:**
- Create: `tests/e2e/sound.spec.ts` (optional Phase 4)
- Modify: volume tuning in `lib/audio/sounds.ts` if needed

- [ ] **Step 1: Run full verify**

```bash
pnpm verify
```

- [ ] **Step 2: Typecheck sound hook usage**

Ensure no `useSound()` called from server components.

- [ ] **Step 3: Reduced motion manual check**

Enable "Reduce motion" in OS → confirm no confetti, no celebratory sounds, animations instant.

- [ ] **Step 4: E2E smoke test (optional)**

```ts
// tests/e2e/sound.spec.ts
test("sound unlocks after first interaction", async ({ page }) => {
  await page.goto("/");
  // Verify mute toggle visible; click page; toggle mute; navigate to chainlink
});
```

- [ ] **Step 5: Final commit**

```bash
git add tests/e2e/sound.spec.ts
git commit -m "Add sound E2E smoke test and tune effect volumes"
```

---

## Implementation Notes

### Browser autoplay

`AudioContext.resume()` must be called inside the unlock handler (user gesture). Samples preload after unlock, not on page load.

### Server components

`SoundProvider` and `useSound` are client-only. Never import them in server components or API routes.

### Volume reference (starting points)

| Sound | Arcade | Restrained |
|-------|--------|------------|
| correct, wrong, win | 0.7 | 0.4 |
| pick | 0.5 | 0.3 |
| ui.tap, ui.tick | 0.3 | 0.2 |
| turn, phase, veto | 0.4 | 0.25 |

Tune by ear during Task 8.

### Sourcing sound files

Use a cohesive royalty-free pack (Kenney UI Audio or similar). Keep aesthetic consistent: short, dry, not realistic. Avoid copyrighted game SFX.

### Chainlink migration

After moving keyframes to CSS, grep for `cl-keyframes` and `REVEAL_KEYFRAMES` to confirm removal.
