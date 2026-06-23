# Brain Dead Redesign — Design Spec

**Date:** 2026-06-23  
**Scope:** Full visual refresh of all Brain Dead screens (Hub, Game, Results, Category Picker, Leaderboard)  
**Approach:** Visual Refresh + UX Improvements (Approach 2)  

---

## Overview

Brain Dead is a solo trivia game where one wrong answer ends your run. The redesign shifts the visual identity from a generic dark-themed game to a clean, confident, intellectual aesthetic — dark navy backgrounds with warm amber accents, sans-serif typography, and subtle iconography. The tone is smart and focused without being overly academic.

---

## Design Principles

1. **Clean over cluttered** — every element earns its place
2. **Color as identity** — amber (#d97706) for primary actions, blue (#0ea5e9) for secondary, green (#22c55e) for success
3. **Typography-first** — confident sans-serif weights, no decorative fonts
4. **No emojis** — SVG icons only
5. **Consistent spacing** — 8px grid, rounded corners (8px–12px)

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0f172a` | Page backgrounds |
| Surface | `#1e293b` | Cards, panels |
| Border | `#334155` | Card borders, dividers |
| Primary | `#d97706` | CTAs, accents, highlights, timer |
| Secondary | `#0ea5e9` | Free play, secondary actions |
| Success | `#22c55e` | Leaderboard, correct answers |
| Text Primary | `#e2e8f0` | Headlines, body |
| Text Secondary | `#94a3b8` | Labels, inactive states |
| Text Muted | `#64748b` | Captions, metadata |

---

## Typography

- **Font family:** Keep existing `'Outfit'` stack — no global font change
- **Headlines:** 18–22px, weight 700, letter-spacing -0.5px
- **Body:** 13–16px, weight 400–500
- **Labels:** 10–11px, weight 600, uppercase, letter-spacing 1–2px
- **Captions:** 9–10px, weight 400, color: Text Muted

---

## Screen-by-Screen Breakdown

### 1. Hub / Landing Page (`/brain-dead`)

**Layout:** Single column, centered, max-width 400px.

**Header:**
- Title: "Brain Dead" — 22px, weight 700
- Subtitle: "TRIVIA CHALLENGE" — 11px, uppercase, letter-spacing 2px, Text Muted

**Mode Cards (3 stacked):**
Each card:
- Background: Surface
- Border: 1px solid Border
- Border-radius: 10px
- Top accent bar: 3px height, full width (amber for Daily, blue for Free Play, green for Leaderboard)
- Icon: 24px SVG, stroke color matching accent
- Title: 14px, weight 600, Text Primary
- Description: 10px, Text Muted
- Optional: countdown timer for Daily (9px, Primary color)

**Personal Stats Bar:**
- Background: Surface, 1px Border, border-radius 8px
- Three stats inline: Best / Games / Streak
- Values in accent colors, labels in Text Muted

**Interactions:**
- Cards lift slightly on hover (translateY -2px, border-color lightens)
- Active state: border color matches accent

---

### 2. Game Screen (`/brain-dead/daily`, `/brain-dead/freeplay/play`)

**Top Bar:**
- Left: Question counter (e.g., "3 / 15") — 11px, Text Muted, current number in Primary
- Right: Score — 11px, Text Muted, value in Primary weight 600

**Timer Bar:**
- Category label left, time remaining right
- Horizontal progress bar: 4px height, Primary fill on Surface track

**Question Card:**
- Background: Surface, 1px Border, border-radius 12px
- Difficulty + point value inline (10px, Primary, uppercase)
- Question text: 16px, weight 500, line-height 1.4

**Answer Grid:**
- 2x2 layout, gap 8px
- Each option: Surface background, 1px Border, border-radius 8px
- Letter label (A/B/C/D): 11px, Text Secondary, above answer text
- Answer text: 13px, weight 500, Text Primary
- Hover: border lightens
- Selected: border-color Primary, letter label turns Primary
- Correct: border-color Success, green flash
- Wrong: border-color red (#ef4444), red flash

**Streak Indicator:**
- 5 dots in a row, centered below answers
- Filled: Primary color
- Empty: Border color
- Optional pulse animation at milestone streaks (3, 5, 8)

---

### 3. Results Screen (in-component screen state within `game.tsx`)

**Header:**
- Icon: 40px medal/trophy SVG, Primary stroke
- Title: "Great Run" — 20px, weight 700
- Subtitle: "You answered 7 of 15 correctly" — 12px, Text Muted

**Stats Grid:**
- 3 columns: Correct / Score / Avg Time
- Each: Surface card, 1px Border, border-radius 8px
- Value: 20px, weight 700, Primary color
- Label: 10px, Text Muted

**Category Breakdown (deferred — not in this phase):**
- Collapsible section
- Each row: category name + mini progress bar + ratio
- Progress bar colors: green (>66%), yellow (33–66%), red (<33%)

**Name Input:**
- Full-width text field
- Background: Surface, Border, border-radius 8px
- Placeholder: "Enter your name"

**Primary CTA:**
- "RECORD SCORE"
- Transparent background, 1px Primary border, Primary text
- Border-radius 8px, full width
- Hover: background fills with Primary, text becomes Background

**Secondary Actions:**
- Two buttons side by side: "Play Again" / "Home"
- Surface background, Border border, Text Muted color
- Border-radius 8px

---

### 4. Category Picker (`/brain-dead/freeplay`)

**Header:**
- Label: "FREE PLAY" — 11px, uppercase, Text Muted
- Title: "Pick a Category" — 18px, weight 700

**Category Grid:**
- 3 columns, gap 8px
- 9 category cards + 1 "Random Mix" row below
- Each card: Surface, Border, border-radius 10px, centered
- Icon: 24px SVG, unique color per category
- Name: 11px, weight 600

**Category Colors:**
| Category | Icon Color |
|----------|-----------|
| General | `#0ea5e9` (blue) |
| Sports | `#22c55e` (green) |
| Movies | `#d97706` (amber) |
| Music | `#a855f7` (purple) |
| Science | `#06b6d4` (cyan) |
| History | `#eab308` (yellow) |
| Food | `#f97316` (orange) |
| Tech | `#6366f1` (indigo) |
| Geography | `#14b8a6` (teal) |

**Random Mix:**
- Full-width row below grid
- Amber border to highlight
- Shuffle/refresh icon + "Random Mix" title + "All categories, shuffled" subtitle

---

### 5. Leaderboard (`/brain-dead/leaderboard`)

**Header:**
- Label: "DAILY" — 11px, uppercase, Text Muted
- Title: "Leaderboard" — 18px, weight 700
- Subtitle: "Top 20 scores today" — 10px, Text Muted

**Podium (Top 3):**
- Horizontal bar chart, bottom-aligned
- 1st: tallest (80px), amber border, trophy icon
- 2nd: medium (60px), silver tone (#94a3b8)
- 3rd: shortest (45px), bronze tone (#b45309)
- Name + score above each bar

**Table:**
- Header row: # / Name / Score / Time
- 10–20 rows below podium
- Top 3 rows: distinct background (Surface) + color-coded rank text
- Rest: transparent background
- Columns: rank (30px), name (flex), score (60px, right), time (60px, right)

**"You" Row:**
- Fixed at bottom
- Surface background, amber border
- Shows your current rank, name, score, time

---

## Component Inventory

### New Components
1. `ModeCard` — hub mode selection card
2. `QuestionCard` — game question display
3. `AnswerOption` — individual answer button
4. `StreakDots` — streak progress indicator
5. `StatsCard` — results stat display
6. `CategoryCard` — category picker item
7. `PodiumBar` — leaderboard top 3 visualization
8. `LeaderboardRow` — leaderboard table row

### Modified Components
1. `BrainDeadGame` — main game component (screen switching)
2. `FreeplayPicker` — category grid layout
3. `Leaderboard` — table + podium layout

---

## Animation & Motion

- **Card hover:** translateY(-2px), border-color lighten, 200ms ease
- **Answer select:** border-color transition, 150ms
- **Correct/wrong:** flash animation (green/red background pulse, 300ms)
- **Timer bar:** width transition, linear, synced to countdown
- **Streak milestone:** subtle scale pulse on dots
- **Page transitions:** fade-slide-up, 300ms

---

## Responsive Behavior

- **Mobile (< 640px):** Single column, full-width cards, 3-column category grid
- **Tablet (640–1024px):** Centered content, max-width 480px
- **Desktop (> 1024px):** Centered content, max-width 520px, larger padding

The game is inherently mobile-first — layout stays single-column across all breakpoints.

---

## Accessibility

- All interactive elements have focus states (amber outline)
- Color alone does not convey meaning (icons + text labels)
- Timer has visual + numerical representation
- Answer options have clear active/hover/focus states
- Reduced motion: disable animations, instant state changes

---

## Implementation Notes

1. **Styling approach:** Add Brain Dead-specific CSS custom properties in `globals.css` (prefixed `--bd-*`) alongside the existing global variables. Do not modify existing global variables like `--bg`, `--panel`, `--text`, etc. — those are used by other parts of the app. Update Brain Dead components to use the new `--bd-*` variables. Keep the inline `style` prop pattern — do not migrate to Tailwind utility classes. Update hardcoded color constants in component files (e.g., `const ACCENT = "#ff3c3c"`) to reference the new `--bd-*` tokens.
2. **Icons:** Inline SVG components (no icon library dependency)
3. **State management:** Keep existing useState pattern — no global store changes needed
4. **Data flow:** No API changes, same question pool, same scoring logic
5. **LocalStorage:** Schema unchanged (daily played state, player token)
6. **Sound:** Keep existing audio system as-is. No new sound features.

---

## CSS Variable Mapping

Add these new Brain Dead-scoped variables to `globals.css`. Do not modify existing global variables.

| New Variable | Value | Replaces |
|--------------|-------|----------|
| `--bd-bg` | `#0f172a` | `--bg` in Brain Dead only |
| `--bd-surface` | `#1e293b` | `--panel` in Brain Dead only |
| `--bd-border` | `#334155` | `--border` in Brain Dead only |
| `--bd-primary` | `#d97706` | `--gold` in Brain Dead only |
| `--bd-secondary` | `#0ea5e9` | `--cyan` in Brain Dead only |
| `--bd-success` | `#22c55e` | `--purple` usages in Brain Dead (leaderboard, correct-answer states) |
| `--bd-text` | `#e2e8f0` | `--text` in Brain Dead only |
| `--bd-text-secondary` | `#94a3b8` | `--text-dim` (for labels, inactive states) |
| `--bd-text-muted` | `#64748b` | new — for captions, metadata |
| `--bd-danger` | `#ef4444` | `--red` or hardcoded `#ff3c3c` for wrong answers |

**Notes:**
- `--border-hi` usages in Brain Dead become `--bd-border` (the new single border token is sufficient)
- `--text-dim` splits into two: `--bd-text-secondary` for labels and inactive states, `--bd-text-muted` for captions and metadata
- `--gold`, `--purple`, `--cyan` are left untouched for non-Brain-Dead usage; Brain Dead components switch to `--bd-primary`, `--bd-success`, `--bd-secondary`

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/brain-dead/page.tsx` | Hub layout, ModeCard components |
| `components/brain-dead/game.tsx` | Game screen, Results screen, QuestionCard, AnswerOption, StreakDots |
| `components/brain-dead/freeplay-picker.tsx` | Category grid, CategoryCard |
| `components/brain-dead/leaderboard.tsx` | Podium + table layout |
| `app/globals.css` | New color tokens, animation keyframes |
| `app/brain-dead/daily/page.tsx` | Layout wrapper: update max-width, background, remove old gradient overlays |
| `app/brain-dead/freeplay/page.tsx` | Layout wrapper: update max-width, background |
| `app/brain-dead/freeplay/play/game.tsx` | Layout wrapper: update max-width, background |
| `app/brain-dead/leaderboard/page.tsx` | Layout wrapper: update max-width, background |
| `lib/brain-dead/types.ts` | No changes |
| `lib/brain-dead/game-logic.ts` | No changes |
| `lib/brain-dead/storage.ts` | No changes |

---

## Out of Scope

- Academic rank system (Freshman → Professor)
- Knowledge Profile / per-category stats
- Review Mode for missed questions
- Difficulty badges
- Multiplayer / team play
- New question generation
- Auth / user accounts

These are reserved for a future phase.

---

## Success Criteria

- [ ] All 5 screens match this spec
- [ ] No emojis anywhere in the UI
- [ ] All interactions have hover/focus/active states
- [ ] Animations are smooth and purposeful
- [ ] Responsive across mobile, tablet, desktop
- [ ] No regressions in game logic or scoring
- [ ] Lighthouse accessibility score ≥ 90
