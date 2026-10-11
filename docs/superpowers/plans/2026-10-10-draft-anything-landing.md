# Draft Anything Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/draft-anything` becomes a landing page with two buttons; today's Create Room / Join Room screen moves to `/draft-anything/play`.

**Architecture:** A pure helper builds and parses `/draft-anything/play` addresses. The landing page is a server component with two small client pieces (the typing topic, and a link that reports clicks). The play page parses `searchParams` and hands starting values to the existing `DraftLobbyPage`.

**Tech Stack:** Next.js App Router (server components, `searchParams` as a Promise), React, Vitest + Testing Library (globals off, so `afterEach(cleanup)`), Playwright, posthog via `@/lib/analytics/track`.

**Spec:** `docs/superpowers/specs/2026-10-10-draft-anything-landing-design.md`

**Visual source of truth:** `.superpowers/brainstorm/40201-1791645456/content/landing-c-click-through.html` (approved mockup). CSS values in Task 3 are taken from it.

## Global Constraints

- Work in a sibling worktree `../draft-anything-landing` on branch `feature/draft-anything-landing`, with its own `pnpm install --frozen-lockfile --prefer-offline`, a copy of `.env.local`, and a dev server on port 3210.
- Addresses: landing `/draft-anything`; room screen `/draft-anything/play`; query parameters `tab`, `topic`, `code`.
- Topic limit is 80 characters (the create form's `maxLength`).
- New CSS classes are prefixed `dal-` and live in `app/draft-anything.css`. Use existing tokens only (`--bg`, `--panel`, `--border`, `--border-hi`, `--gold`, `--gold-hi`, `--text`, `--text-dim`).
- Both themes. Small labels must reach 4.5:1.
- Do not change the create or join forms beyond an initial value.
- Do not run e2e specs that create guests or rooms (they write to the hosted database). Gate: `pnpm typecheck`, `pnpm test`, `pnpm build`, no new lint errors in touched files.
- Analytics event name: `draft_landing_cta_clicked` with `cta` (`start` | `join` | `topic`), `position` (`hero` | `ideas` | `closing`), and `topic` for topic clicks.

## Review Focus

1. A `topic` parameter longer than 80 characters or made of whitespace: the form opens with a trimmed, cut or empty topic, never an invalid one. (Task 1 tests.)
2. A `code` parameter in lower case or with spaces: the join form shows it upper-cased and trimmed, and the Join tab is open even without `tab=join`. (Task 1 and Task 2 tests.)
3. Repeated parameters (`?topic=a&topic=b`), which Next passes as an array: the first value is used, nothing throws. (Task 1 tests.)
4. JavaScript off or reduced motion on the landing page: the heading still reads as a full sentence. (Task 3 test: server render contains the first topic.)
5. A topic with `&`, `?` or `'` in it (for example "Things You'd Bring to a Desert Island"): the link round-trips to the same text. (Task 1 tests.)

---

### Task 1: Address helper

**Files:**
- Create: `lib/draft-landing/play-href.ts`
- Test: `tests/lib/draft-landing/play-href.test.ts`

**Interfaces:**
- Produces:
  - `PLAY_PATH = "/draft-anything/play"`
  - `TOPIC_MAX = 80`
  - `playHref(options?: { tab?: "create" | "join"; topic?: string; code?: string }): string`
  - `parsePlayParams(params: Record<string, string | string[] | undefined>): { tab: "create" | "join"; topic: string; code: string }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { parsePlayParams, playHref } from "@/lib/draft-landing/play-href";

describe("playHref", () => {
  it("builds the bare, join, topic and code addresses", () => {
    expect(playHref()).toBe("/draft-anything/play");
    expect(playHref({ tab: "create" })).toBe("/draft-anything/play");
    expect(playHref({ tab: "join" })).toBe("/draft-anything/play?tab=join");
    expect(playHref({ topic: "Ultimate Comfort Foods" })).toBe("/draft-anything/play?topic=Ultimate+Comfort+Foods");
    expect(playHref({ code: "abcde2" })).toBe("/draft-anything/play?code=ABCDE2");
  });

  it("round-trips topics with awkward characters", () => {
    for (const topic of ["Things You'd Bring to a Desert Island", "Rock & Roll?", "50% off #1"]) {
      const query = playHref({ topic }).split("?")[1];
      const params = Object.fromEntries(new URLSearchParams(query));
      expect(parsePlayParams(params).topic).toBe(topic);
    }
  });
});

describe("parsePlayParams", () => {
  it("defaults to the create tab with nothing filled in", () => {
    expect(parsePlayParams({})).toEqual({ tab: "create", topic: "", code: "" });
    expect(parsePlayParams({ tab: "nonsense" })).toEqual({ tab: "create", topic: "", code: "" });
  });

  it("opens the join tab for tab=join or any code", () => {
    expect(parsePlayParams({ tab: "join" }).tab).toBe("join");
    expect(parsePlayParams({ code: " abcde2 " })).toEqual({ tab: "join", topic: "", code: "ABCDE2" });
  });

  it("trims and cuts the topic to 80 characters", () => {
    expect(parsePlayParams({ topic: "   " }).topic).toBe("");
    expect(parsePlayParams({ topic: "  Best Films  " }).topic).toBe("Best Films");
    expect(parsePlayParams({ topic: "x".repeat(200) }).topic).toHaveLength(80);
  });

  it("uses the first of repeated values", () => {
    expect(parsePlayParams({ topic: ["a", "b"], code: ["one", "two"], tab: ["join", "create"] })).toEqual({
      tab: "join",
      topic: "a",
      code: "ONE",
    });
  });
});
```

- [ ] **Step 2:** Run `pnpm vitest run tests/lib/draft-landing/play-href.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
export const PLAY_PATH = "/draft-anything/play";
export const TOPIC_MAX = 80;

export type PlayTab = "create" | "join";

export interface PlayParams {
  tab: PlayTab;
  topic: string;
  code: string;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function playHref(options: { tab?: PlayTab; topic?: string; code?: string } = {}): string {
  const query = new URLSearchParams();
  if (options.code) query.set("code", options.code.trim().toUpperCase());
  else if (options.tab === "join") query.set("tab", "join");
  if (options.topic) query.set("topic", options.topic);
  const text = query.toString();
  return text ? `${PLAY_PATH}?${text}` : PLAY_PATH;
}

export function parsePlayParams(params: Record<string, string | string[] | undefined>): PlayParams {
  const code = first(params.code).trim().toUpperCase();
  const topic = first(params.topic).trim().slice(0, TOPIC_MAX).trim();
  const tab: PlayTab = code || first(params.tab) === "join" ? "join" : "create";
  return { tab, topic, code };
}
```

- [ ] **Step 4:** Run the test again. Expected: PASS.
- [ ] **Step 5:** Commit `feat(draft-anything): address helper for the room screen`.

---

### Task 2: Room screen at `/draft-anything/play`

**Files:**
- Modify: `components/lobby/draft-lobby-page.tsx` (props, back link)
- Modify: `components/lobby/create-room-form.tsx` (`initialTopic` prop)
- Create: `app/draft-anything/play/page.tsx`
- Test: `tests/components/draft-lobby-page.test.tsx`

**Interfaces:**
- Consumes: `parsePlayParams`, `PlayTab` from Task 1.
- Produces: `DraftLobbyPage({ initialTab?: PlayTab; initialTopic?: string; initialRoomCode?: string })`; `CreateRoomForm({ initialTopic?: string; onSuccess? })`.

- [ ] **Step 1: Write the failing test**

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DraftLobbyPage } from "@/components/lobby/draft-lobby-page";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("DraftLobbyPage", () => {
  afterEach(cleanup);

  it("opens on the create tab by default, with a link back to the landing page", () => {
    render(<DraftLobbyPage />);
    expect(screen.getByRole("tab", { name: /create room/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /draft anything/i })).toHaveAttribute("href", "/draft-anything");
  });

  it("fills the topic it is given", () => {
    render(<DraftLobbyPage initialTopic="Ultimate Comfort Foods" />);
    expect(screen.getByLabelText("Draft topic")).toHaveValue("Ultimate Comfort Foods");
  });

  it("opens on the join tab with the code filled in", () => {
    render(<DraftLobbyPage initialTab="join" initialRoomCode="abcde2" />);
    expect(screen.getByRole("tab", { name: /join room/i })).toHaveAttribute("aria-selected", "true");
    expect(document.querySelector("#join-room-code")).toHaveValue("ABCDE2");
  });
});
```

- [ ] **Step 2:** Run `pnpm vitest run tests/components/draft-lobby-page.test.tsx`. Expected: FAIL (no back link; props ignored).

- [ ] **Step 3: Implement**
  - `create-room-form.tsx`: add `initialTopic?: string` to `CreateRoomFormProps`; signature `CreateRoomForm({ initialTopic = "", onSuccess })`; state `useState({ ...DEFAULT_VALUES, topic: initialTopic })`.
  - `draft-lobby-page.tsx`: accept the three props; `useState<ActiveTab>(initialTab)`; render `<CreateRoomForm initialTopic={initialTopic} />` and `<JoinRoomForm initialRoomCode={initialRoomCode} />`; add, as the first child of the inner column, `<Link href="/draft-anything" className="dal-back">← Draft Anything</Link>`.
  - `app/draft-anything/play/page.tsx`:

```tsx
import type { Metadata } from "next";
import { DraftLobbyPage } from "@/components/lobby/draft-lobby-page";
import { parsePlayParams } from "@/lib/draft-landing/play-href";

export const metadata: Metadata = {
  title: "Start or join a draft",
  alternates: { canonical: "/draft-anything" },
  robots: { index: false, follow: true },
};

export default async function DraftAnythingPlayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tab, topic, code } = parsePlayParams(await searchParams);
  return <DraftLobbyPage initialTab={tab} initialTopic={topic} initialRoomCode={code} />;
}
```

- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat(draft-anything): room screen at /draft-anything/play`.

---

### Task 3: Landing page

**Files:**
- Create: `components/draft-landing/rotating-topic.tsx`, `components/draft-landing/landing-link.tsx`, `components/draft-landing/landing.tsx`, `app/draft-anything.css`
- Modify: `app/draft-anything/page.tsx`, `app/draft-anything/layout.tsx` (import the CSS)
- Test: `tests/components/draft-landing.test.tsx`, `tests/components/draft-landing.server.test.tsx`

**Interfaces:**
- Consumes: `playHref` (Task 1); `HOT_CATEGORIES`; `getGameContent`, `buildFaqJsonLd`; `track`; `JsonLdScript`.
- Produces: `DraftLanding()` (server-safe component), `RotatingTopic({ topics: string[] })`, `LandingLink({ href, cta, position, topic?, className, children })`.

Copy, fixed:
- Eyebrow: `Draft Anything · a party game for 2 to 6`
- Heading: `Tonight we are drafting` + rotating topic. Topics: `comfort foods.`, `movies of the 2010s.`, `the greatest athletes.`, `desert island items.`, `albums of all time.`
- Lede: `Pick a topic. Take turns choosing. Defend your lineup, then let the room or an AI judge decide who won.`
- Buttons: `Start a draft`, `Join a room`. Small print: `Free. No accounts, no download.`
- Hero chips: the `movies`, `food`, `sports`, `gaming`, `wild` categories (emoji + topic).
- Section 1 `How a draft works`: `Pick a topic` / `Anything you could make a list of. Films, snacks, holiday spots.`; `Share the code` / `Friends join with a room code and a name. Nobody signs up.`; `Take turns picking` / `Once something is taken, it is gone. Build the best lineup.`; `Defend and get judged` / `Argue your case. The room votes, an AI judge rules, or both.`
- Section 2 `Things people draft`: all eight categories.
- Section 3 `Pick your judge`: `The Analyst` / `“Maya took mac and cheese first overall. Correct, and it decided the draft.”`; `The Hype Voice` / `“Ramen in round two?! That is a STEAL. Somebody check on Dev.”`; `The Roaster` / `“Jo drafted plain toast. I have nothing further to add.”`
- Section 4 `Questions`: `content.faq`, then `content.sections.slice(1)`, all as `<details>`.
- Section 5: `Get the group chat ready.` + both buttons.
- Footer: `All Stim Games →`.

- [ ] **Step 1: Write the failing tests**

`tests/components/draft-landing.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DraftLanding } from "@/components/draft-landing/landing";
import { HOT_CATEGORIES } from "@/components/lobby/hot-categories";
import { GAME_CONTENT } from "@/lib/games/content";
import { track } from "@/lib/analytics/track";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a">) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("DraftLanding", () => {
  afterEach(cleanup);

  it("offers start and join in the opening and again at the end", () => {
    render(<DraftLanding />);
    const starts = screen.getAllByRole("link", { name: "Start a draft" });
    const joins = screen.getAllByRole("link", { name: "Join a room" });
    expect(starts).toHaveLength(2);
    expect(joins).toHaveLength(2);
    for (const link of starts) expect(link).toHaveAttribute("href", "/draft-anything/play");
    for (const link of joins) expect(link).toHaveAttribute("href", "/draft-anything/play?tab=join");
  });

  it("links every draft idea to the room screen with its topic", () => {
    render(<DraftLanding />);
    const ideas = within(screen.getByTestId("dal-ideas")).getAllByRole("link");
    expect(ideas).toHaveLength(HOT_CATEGORIES.length);
    const island = ideas.find((link) => link.textContent?.includes("Desert Island"));
    expect(new URL(island!.getAttribute("href")!, "https://x.test").searchParams.get("topic")).toBe(
      "Things You'd Bring to a Desert Island",
    );
  });

  it("reports which button was clicked", () => {
    render(<DraftLanding />);
    fireEvent.click(screen.getAllByRole("link", { name: "Join a room" })[1]);
    expect(track).toHaveBeenCalledWith("draft_landing_cta_clicked", { cta: "join", position: "closing" });
  });

  it("keeps the questions, the long-form text and one h1", () => {
    const content = GAME_CONTENT["draft-anything"];
    const { container } = render(<DraftLanding />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.querySelectorAll("details")).toHaveLength(content.faq.length + content.sections.length - 1);
    expect(screen.getByText(content.faq[0].question)).toBeInTheDocument();
    expect(container.querySelector('script[type="application/ld+json"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: /all stim games/i })).toHaveAttribute("href", "/");
  });
});
```

`tests/components/draft-landing.server.test.tsx` (first line `// @vitest-environment node`, as in `tests/components/chainlink-first-render.server.test.tsx`):

```tsx
// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DraftLanding } from "@/components/draft-landing/landing";

vi.mock("@/lib/analytics/track", () => ({ track: vi.fn() }));

describe("DraftLanding on the server", () => {
  it("renders the heading as a full sentence without JavaScript", () => {
    const html = renderToString(<DraftLanding />);
    expect(html).toContain("Tonight we are drafting");
    expect(html).toContain("comfort foods.");
  });
});
```

- [ ] **Step 2:** Run both. Expected: FAIL, module not found.

- [ ] **Step 3: Implement**
  - `rotating-topic.tsx` (client): state `text` starts as `topics[0]`. In an effect, return early if `matchMedia("(prefers-reduced-motion: reduce)").matches`; otherwise hold the full first topic for 1700 ms, then delete at 35 ms per character, type the next at 70 ms per character, hold 1700 ms, repeat. Timers via `setTimeout`, cleared on unmount. Renders `<span className="dal-rot" aria-hidden>{text}</span>` plus `<span className="sr-only">{topics[0]}</span>` so assistive tech hears a stable sentence. State changes happen in timer callbacks, not synchronously in the effect body (the repo's lint rule `react-hooks/set-state-in-effect`).
  - `landing-link.tsx` (client): `next/link` with `onClick={() => track("draft_landing_cta_clicked", topic ? { cta, position, topic } : { cta, position })}`.
  - `landing.tsx`: no `"use client"`. Markup follows the mockup, classes renamed with the `dal-` prefix. `<main className="dal game-page">`. Ideas grid has `data-testid="dal-ideas"`. Emits `<JsonLdScript data={buildFaqJsonLd("draft-anything")} />`.
  - `app/draft-anything.css`: the mockup's `.site` rules, renamed, with `@container` queries turned into `@media (max-width: 700px)`. Add `.dal-back` for Task 2's link. Add `--dal-on-gold` (`#1a1400` dark, `#fffdfa` light) and `--dal-glow` on `.dal`.
  - `app/draft-anything/page.tsx`: `export default function DraftAnythingPage() { return <DraftLanding />; }`
  - `app/draft-anything/layout.tsx`: `import "../draft-anything.css";`

- [ ] **Step 4:** Run both tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(draft-anything): landing page`.

---

### Task 4: Links, home tile, existing tests

**Files:**
- Modify: `app/draft/[roomCode]/page.tsx:30` → `redirect(playHref({ code: roomCode }))`
- Modify: `components/draft/complete-panel.tsx:157-162` → `href="/draft-anything"`, text `← Draft Anything`
- Modify: `app/page.tsx:66` → `cta="See the game"`
- Modify: `tests/e2e/responsive.spec.ts` (lines 41, 63, 100, 157, 188: `/draft-anything` → `/draft-anything/play`)
- Modify: `tests/e2e/game-about.spec.ts` (remove `/draft-anything` from `ABOUT_PAGES`)
- Create: `tests/e2e/draft-landing.spec.ts`

- [ ] **Step 1:** Make the four source edits above.
- [ ] **Step 2:** Add the public-page e2e (no guests or rooms created):

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`landing page has no serious accessibility violations in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("stim-theme", t), theme);
    await page.goto("/draft-anything");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
}

test("start and join lead to the room screen on the right tab", async ({ page }) => {
  await page.goto("/draft-anything");
  await page.getByRole("link", { name: "Join a room" }).first().click();
  await expect(page).toHaveURL(/\/draft-anything\/play\?tab=join/);
  await expect(page.getByRole("tab", { name: /join room/i })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("link", { name: /draft anything/i }).click();
  await page.getByRole("link", { name: /Ultimate Comfort Foods/ }).first().click();
  await expect(page.getByLabel("Draft topic")).toHaveValue("Ultimate Comfort Foods");
});

test("no horizontal scroll at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/draft-anything");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
```

(Match the axe import to whatever `tests/e2e/game-about.spec.ts` uses.)

- [ ] **Step 3:** Run the gate: `pnpm typecheck && pnpm test && pnpm build`, then `pnpm eslint` on touched files. Run `draft-landing.spec.ts`, `home.spec.ts` and `game-about.spec.ts` against the worktree's dev server on port 3210.
- [ ] **Step 4:** Screenshot landing and room screen at 1440 and 375 wide in both themes; compare with the mockup; check small-label contrast.
- [ ] **Step 5:** Commit `feat(draft-anything): point links at the landing page and room screen`.

Note: several older e2e specs (`lobby.spec.ts`, `draft.spec.ts`, `pool-review.spec.ts`, `accessibility.spec.ts`, `sound.spec.ts`) open `/` and expect the create form there. They were already stale before this work and are not touched here.
