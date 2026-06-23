# Game Juice — Sound & Animation Design Spec

**Date:** 2026-06-23  
**Status:** Approved

## Overview

Add a shared sound and animation layer across Stim Labs games (Chainlink, Brain Dead, Draft Anything). Solo games get arcade-style feedback; Draft Anything gets restrained multiplayer cues. Audio unlocks on first site interaction; users can mute globally for the session via `localStorage`.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | All three live games | Consistent feel; one system to maintain |
| Vibe | Arcade (Chainlink, Brain Dead) · Restrained (Draft Anything) | Matches how each game is played |
| Sound default | On after first tap/click | Satisfies browser autoplay policy; quiet until interaction |
| Assets | Hybrid — synth micro-SFX + samples for big moments | Lightweight UI feedback without asset bloat; polish on key events |
| Architecture | Lightweight shared hook (no new deps) | Matches inline-style + CSS patterns; `canvas-confetti` already in use |
| Mute | Global toggle, persisted in `localStorage` | Simple v1; per-game prefs deferred |
| Reduced motion | Skip celebratory sounds/animations | Aligns with existing `prefers-reduced-motion` in `globals.css` |

## Shared Infrastructure

### `SoundProvider` (root layout)

Wraps the app in `app/layout.tsx` via a client `Providers` shell.

- `unlocked: boolean` — `false` until first `pointerdown` or `keydown` on `document`
- `muted: boolean` — persisted in `localStorage` key `stim-sound-muted` (default `false`)
- `play(id: SoundId)` — no-op when locked or muted; respects reduced motion for celebratory IDs
- `toggleMute()` — flips muted state and persists

### Sound registry (`lib/audio/sounds.ts`)

```ts
type SoundId =
  | "ui.tap"
  | "ui.tick"
  | "ui.whoosh"
  | "ui.error"
  | "turn"
  | "phase"
  | "correct"
  | "wrong"
  | "win"
  | "streak"
  | "hint"
  | "pick"
  | "veto"
  | "veto-success";
```

Each entry defines `{ type: "synth" | "sample", src?, synthKey?, volume, profile: "arcade" | "restrained" }`.

Arcade profile: full volume. Restrained profile: ~50–60% of arcade levels.

### Synth layer (`lib/audio/synth.ts`)

Web Audio API oscillators — no files:

| Key | Use |
|-----|-----|
| `tap` | button presses |
| `tick` | timer urgency |
| `whoosh` | question/card transitions |
| `error` | rejected actions |
| `turn` | your turn chime |
| `phase` | phase transitions |
| `hint` | hint sparkle (optional synth instead of sample) |

### Sample layer (`public/sounds/`)

| File | Use |
|------|-----|
| `correct.mp3` | correct answer / word solved |
| `wrong.mp3` | wrong guess / wrong answer |
| `win.mp3` | puzzle complete / perfect run / draft complete |
| `streak.mp3` | streak milestones |
| `pick.mp3` | pick locked |
| `veto.mp3` | veto phase opens |
| `veto-success.mp3` | pick vetoed |

Preload samples on unlock. Keep files short (&lt;1s), small (&lt;50KB each).

### Mute toggle (`components/ui/sound-toggle.tsx`)

Speaker icon button. Placed in:

- Stim Games hub header (`app/page.tsx`)
- Chainlink game header
- Brain Dead game header
- Draft board top bar

### Animation utilities

**`lib/motion/use-reduced-motion.ts`** — wraps `matchMedia("(prefers-reduced-motion: reduce)")`.

**`lib/motion/trigger-class.ts`** — `triggerAnimation(el, className, durationMs)` for one-shot CSS classes.

**`globals.css`** — shared keyframes and utility classes:

| Class | Use |
|-------|-----|
| `anim-shake` | wrong guesses, rejected picks |
| `anim-pop-in` | solved letters, correct answers, banners |
| `anim-flash-green` / `anim-flash-red` | answer feedback |
| `anim-slide-in-top` | pick history rows |
| `anim-fade-slide-up` | result screens, phase panels |
| `anim-score-float` | Brain Dead +score popup |
| `anim-glow-pulse` | your turn, timer urgency |

Chainlink-specific keyframes (`cl-letter-in`, `cl-chain-grow`, `cl-shake`, `cl-hint-pulse`) move from injected `<style>` in `components/chainlink/game.tsx` to `globals.css`.

**Confetti** — reuse `components/results/results-confetti.tsx` pattern; extract shared `lib/motion/confetti.ts` with palette presets (`gold`, `brain-dead`).

## Per-Game Moment Map

### Chainlink (arcade)

| Moment | Trigger | Sound | Animation |
|--------|---------|-------|-----------|
| Wrong guess | `onSubmitGuess` → `"incorrect"` | `wrong` | `cl-shake` + `anim-flash-red` on word row |
| Word solved | `onSubmitGuess` → `"correct"` | `correct` | `cl-letter-in` stagger + `cl-chain-grow` |
| Already solved | `"already-solved"` | `ui.tap` | subtle wiggle |
| Hint used | `storeUseHint()` success | `hint` (synth) | `cl-hint-pulse` + letter pop-in |
| Chain complete | `gameStatus === "completed"` | `win` | confetti (gold palette) + score count-up + `anim-fade-slide-up` |
| Button tap | hint / reset | `ui.tap` | none |

### Brain Dead (arcade)

| Moment | Trigger | Sound | Animation |
|--------|---------|-------|-----------|
| Answer tap | `handleAnswer` | `ui.tap` | button scale active state |
| Correct | `idx === q.c` | `correct` | `anim-flash-green` + `anim-pop-in` on button + `anim-score-float` |
| Wrong | wrong answer | `wrong` | `anim-flash-red` + `anim-shake` on button |
| Timeout | timer → 0 | `wrong` (softer) | same as wrong |
| Streak | correct count 3, 5, 8… | `streak` | streak badge pulse + scale |
| Question advance | after 650ms correct delay | `ui.whoosh` | question card slide out/in |
| Timer urgency | `timerSecs <= 3` | `ui.tick` (once/sec) | timer bar red + `anim-glow-pulse` |
| Game over | `endGame()` | (already played on wrong/timeout) | result icon bounce + stats stagger |
| Perfect run | all questions correct | `win` | confetti (red/gold palette) |

### Draft Anything (restrained)

| Moment | Trigger | Sound | Animation |
|--------|---------|-------|-----------|
| Your pick locked | pick API success (yours) | `pick` | card gold flash → history `anim-slide-in-top` |
| Opponent pick | new pick in projection (not yours) | `pick` (50% vol, debounced 500ms) | history row `fade-in`; pool item fades |
| Pick rejected | pick API 4xx | `ui.error` | card `anim-shake` |
| Your turn | `currentPlayerId === myPlayerId` | `turn` | turn banner `anim-glow-pulse` |
| Timer low | `TurnTimer` ≤ 10s | `ui.tick` (quiet) | existing color shift + pulse |
| Auto-pick | timer expires | `pick` (50% vol) | history row fade-in with auto-pick badge |
| Veto phase opens | phase → `VETO_VOTING` | `veto` | veto panel `anim-fade-slide-up`; pick amber pulse |
| Veto succeeds | pick removed | `veto-success` | pick row strike-through + fade-out |
| Veto fails | pick stands | `phase` | panel collapse |
| Phase change | any phase transition | `phase` | phase label crossfade |
| AI commentary | new `commentary` entry | none | ai desk card slide-in |
| Draft complete | results page | `win` (restrained) | existing `ResultsConfetti` |

**Multiplayer rule:** debounce opponent pick sounds — max one `pick` per 500ms window.

## Rollout Phases

### Phase 1 — Shared foundation
`SoundProvider`, synth layer, registry, mute toggle, shared CSS animations, sample files, unit tests.

### Phase 2 — Solo games
Chainlink first (existing animation hooks), then Brain Dead.

### Phase 3 — Draft Anything
Pick, turn, timer, veto, phase, commentary animations and restrained sounds.

### Phase 4 — Polish (optional)
Volume tuning, mobile haptics, Chainlink solve streaks, E2E mute smoke test.

## Deferred

- Per-game sound preferences
- Custom / user-uploaded sound packs
- Lottie or 3D animations
- Chat sound effects
- Coming-soon games (Frames, Would You Rather, Budget Manager)

## Testing

### Unit
- Unlock on first interaction
- Mute persistence via `localStorage`
- `play()` no-op when locked/muted
- Reduced motion skips celebratory sounds
- Debounce helper for opponent picks

### Manual
- Full Chainlink puzzle with sound on/off
- Brain Dead run through correct, wrong, timeout, streak
- 2-player draft: picks, veto, phase change, mute toggle

### E2E (Phase 4)
- Mute toggle persists across navigation
- No sound before first click; sound after click

## Accessibility

- Mute toggle has `aria-label` and `aria-pressed`
- Celebratory effects respect `prefers-reduced-motion`
- Sounds never required to play — all info remains visual
- Timer urgency uses visual + optional audio tick
