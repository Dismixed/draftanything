# Arcade Punch — Visual Intensity Design Spec

**Date:** 2026-10-06  
**Status:** Approved  
**Builds on:** `2026-06-23-game-juice-design.md`

## Overview

Brain Dead and Chainlink already use the shared juice layer, but the visual feedback is timid: 3% pop overshoot, 5px shake, a 35%-opacity inner glow, plain `ease` timing, and nothing that grows with a streak. This pass pushes both games to an "arcade" level of visual punch by retuning the shared animation classes and adding a small kit of impact effects.

The target feel was approved from an interactive mock (`.superpowers/brainstorm/70198-1791314848/content/arcade-kit.html`, gitignored). The numbers below come from that mock and are the starting values.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Lever | Intensity of existing feedback | The juiced games are the ones that feel soft |
| Sound | Unchanged | No edits to `lib/audio`, `public/sounds`, or any `play()` call |
| Ceiling | Arcade | Particles, screen shake, streak escalation; no full-screen takeovers |
| Scope | Brain Dead and Chainlink | Both have every feedback moment hooked up already |
| Haptics | Not included | Not supported in Safari on iPhone; keeps the pass purely visual |
| Architecture | Extend `app/globals.css` and `lib/motion`, no new dependencies | Slots into the existing `triggerAnimation` hooks; `canvas-confetti` is already installed |
| Class names | Retune in place | Existing call sites need no rewiring |

**Side effect accepted:** AnyGuessr also uses `anim-pop-in`, so its pops get the punchier tuning. `anim-fade-slide-up`, `anim-slide-in-top` and `anim-glow-pulse` are not touched, so Draft Anything is unaffected.

## Shared Kit

### Retuned keyframes (`app/globals.css`)

| Class | Today | After |
|-------|-------|-------|
| `anim-pop-in` | `scale(.92)` → `1.03` → `1`, 0.35s `ease` | `scale(.8)` → `calc(1.12 + .03 * var(--juice, 0))` at 50% → `.97` at 75% → `1`, 0.42s `ease-out` |
| `anim-shake` | ±5px, 0.4s | ±10px decaying to ±2px with ±1.5deg rotation, 0.38s `ease-out` |
| `anim-flash-green` / `anim-flash-red` | inset glow, 35% opacity | inset and outer glow at 50–60% opacity plus a background tint (~28–30% opacity) peaking at 25%, 0.5s `ease-out` |
| `anim-score-float` | rises 28px, 0.7s | pops in from `scale(.5)` to `1.25`, settles, rises 48px, 0.9s; font size `calc(20px + 3px * var(--juice, 0))` set at the call site |
| `anim-streak-pulse` | `scale(1.12)` | `scale(calc(1.25 + .08 * var(--juice, 0)))`, 0.4s |
| `cl-letter-in` | 8px rise, `scale(.8)` → `1.04` | 14px rise, `scale(.5)` with -8deg tilt → `1.2` with 3deg → rest, 0.4s `cubic-bezier(.3,1.5,.5,1)` |

The tint is a third, full-cover inset shadow (`inset 0 0 0 999px`) rather than an animated `background-color`. The Chainlink word row changes its inline background by state (active, solved, wrong), so animating the background would fight it; a shadow layers on top of whatever is there.

### New classes (`app/globals.css`)

| Class | Effect |
|-------|--------|
| `anim-screen-shake` | 0.25s linear jolt, ±6px horizontal and ±3px vertical, on the gameplay wrapper |
| `anim-impact-ring` | A ring that expands from `scale(1)` to `calc(1.5 + .12 * var(--juice, 0))` and fades, 0.45s; colour from `--ring` |
| `anim-score-slam` | `scale(1.5)` brightened, snapping to `scale(1)`, 0.32s `cubic-bezier(.2,1.4,.4,1)` |

`anim-screen-shake` goes on the wrapper around the question and answers (Brain Dead) or the chain (Chainlink), never on an ancestor of a modal or overlay: a transform on an ancestor would displace `position: fixed` children while it runs.

### New helpers (`lib/motion`)

**`juice-level.ts`** — `juiceLevel(streak: number): 0 | 1 | 2 | 3`. Returns 1 at 3, 2 at 5, 3 at 8 or more, matching the existing streak-sound thresholds in Brain Dead.

**`burst.ts`** — `burstFrom(el: HTMLElement | null, level = 0, preset: ConfettiPreset = "gold"): Promise<void>`. Fires one small `canvas-confetti` burst from the centre of `el`:

- `particleCount: 14 + 12 * level`, `spread: 60 + 12 * level`, `startVelocity: 20 + 4 * level`
- `ticks: 70`, `gravity: 1.3`, `scalar: 0.7`
- origin computed from `el.getBoundingClientRect()` over the viewport size
- no-op on the server, when `el` is null, or under `prefers-reduced-motion`
- lazy-imports `canvas-confetti` the same way `fireConfetti` does

A `correct` preset (`#22c55e`, `#86efac`, `#f0c860`, `#ffffff`) is added to the `PRESETS` map in `confetti.ts`, which `burst.ts` reuses. `fireConfetti` is unchanged.

**`impact-ring.ts`** — `impactRing(el: HTMLElement | null, color: string): void`. Appends an absolutely positioned `anim-impact-ring` child to `el` and removes it after 460ms. The target must be `position: relative`. No-op under reduced motion.

**`count-up.ts`** — `useCountUp` restarts from 0 whenever its target changes. Add an optional `fromPrevious` flag that animates from the last displayed value; the default behaviour stays as is. Under reduced motion it jumps straight to the target.

### Escalation

The game sets `--juice` on its gameplay wrapper as an inline style. Pop, ring, streak pulse and score float read it through `calc()`, and `burstFrom` takes the level as an argument.

## Per-Game Moment Map

Every row keeps its current sound call untouched.

### Brain Dead (`components/brain-dead/game.tsx`)

A wrong answer ends the run, so the `correct` count is the streak. `--juice` is `juiceLevel(correct)`.

| Moment | Today | Added |
|--------|-------|-------|
| Correct answer | card `anim-flash-green`, button `anim-pop-in`, `+points` float | retuned versions, plus `impactRing` (green) and `burstFrom(button, level, "correct")` on the tapped button |
| Score change | number swaps instantly | `anim-score-slam` on the in-game score, counting up over 400ms with `fromPrevious` |
| Streak hits 3, 5, 8 | streak sound only | `anim-streak-pulse` on the existing streak dots; all later pops, rings and bursts scale up via `--juice` |
| Wrong answer | card `anim-flash-red`, button `anim-shake`, correct answer pops | retuned versions, plus `impactRing` (red) on the tapped button and `anim-screen-shake` on the gameplay wrapper |
| Timeout | card `anim-flash-red` | retuned flash plus `anim-screen-shake` |
| Perfect run | `fireConfetti("brain-dead")` | unchanged |

Two small UI changes in the top bar make these moments visible, both shown in the approved mock:

- **Score:** today it is an 11px "Score: N" label. The number becomes 18px at weight 800 so the slam and count-up read; the "Score" label stays 11px.
- **Streak indicator:** Brain Dead already shows a "Streak" row of five dots under the answers. No new badge is added; that existing block gets `anim-streak-pulse` at 3, 5 and 8. (An earlier draft of this spec wrongly said there was no indicator and proposed a new "STREAK N" pill.)

The answer buttons need `position: relative` for the ring. The tapped button is found from the click event rather than new per-button refs.

### Chainlink (`components/chainlink/game.tsx`)

Chainlink has no in-run streak, so it uses a fixed level of 1 and does not set `--juice`.

| Moment | Today | Added |
|--------|-------|-------|
| Wrong guess | row `anim-shake` and `anim-flash-red` | retuned versions, plus `anim-screen-shake` on the chain wrapper |
| Word solved | letters `cl-letter-in`, link `cl-chain-grow` | retuned `cl-letter-in` with a 55ms per-letter stagger; after 260ms, `impactRing` (green) and `burstFrom(row, 1, "correct")` on the solved row |
| Hint used | `cl-hint-pulse` | unchanged |
| Chain complete | `fireConfetti("gold")` | unchanged |

## Out of Scope

- Any sound change
- Haptics
- Wiring AnyGuessr, Draft Anything, Freeze Frames, Getting Warmer, Ball Knowledge, Hot Takes or Slippery Slope into the new effects (a follow-up pass can reuse this kit)
- Streak escalation in Chainlink
- A user-facing "reduce effects" setting; the OS reduced-motion preference is the only switch

## Rollout to the Other Games (added 2026-10-06)

After the Brain Dead and Chainlink pass, the same kit was applied to the remaining seven games, still with no sound changes. This supersedes the "wiring other games" line under Out of Scope. Each game bursts in its own colour via new confetti presets (`ember`, `blue`, `lime`, `purple`).

| Game | Right / success | Wrong | Score and finish |
|------|-----------------|-------|------------------|
| Freeze Frames | result card pops, ring and `purple` burst sized by round score | game area screen shake, bigger input shake | final total counts up |
| Getting Warmer | ring and `ember` burst sized by number of guesses, win line pops | card screen shake, bigger input shake; new-clue "ignite" enlarged | — |
| Ball Knowledge | `blue` burst from the score, growing at 3, 5 and 8 answers; stronger row flash | bigger row shake only (no screen shake while typing against the clock) | score slams on each accepted answer |
| Hot Takes | item pops when placed in a tier | — | agreement % counts up, banner pops, `gold` burst |
| Slippery Slope (solo and multiplayer) | answer pops, ring and `lime` burst on the question card | answer shakes, question card screen shake (own answers only in multiplayer) | confetti when you win |
| AnyGuessr | ring and `gold` burst on the feedback banner | banner shakes instead of popping | — |
| Draft Anything | ring and small `gold` burst on your own pick only | — | — |

`anim-score-slam` no longer sets `display`, so it can go on block elements.

## Accessibility

- The existing global `prefers-reduced-motion` rule in `globals.css` flattens every CSS animation, including the new classes.
- `burstFrom`, `impactRing` and the count-up check the same preference and do nothing or jump to the end.
- All effects are decorative. Correct, wrong and score remain readable from colour, text and layout without them.
- Flashes are a single pulse of at most 0.5s; nothing strobes.

## Testing

### Unit (colocated in `lib/motion`, matching `lib/audio`)

- `juiceLevel`: 0–2 → 0, 3–4 → 1, 5–7 → 2, 8+ → 3
- `burstFrom`: computes the origin from the element's rect; scales particle count with level; no-op for a null element and under reduced motion (`canvas-confetti` mocked)
- `impactRing`: appends the ring, removes it after the timeout, no-op under reduced motion
- `useCountUp` with `fromPrevious`: starts from the prior value; default path still starts from 0

### Manual

- Brain Dead: a run reaching a streak of 8, a wrong answer, a timeout, a perfect run; check that no modal jumps during a screen shake
- Chainlink: wrong guess, solve, hint, full chain, failed chain
- Both games in light and dark theme, on a phone-width viewport
- AnyGuessr: confirm the punchier `anim-pop-in` looks acceptable where it is used
- OS reduced motion on: no bursts, rings, shakes or count-up

### Gate

`pnpm verify` (lint, typecheck, unit tests, build).
