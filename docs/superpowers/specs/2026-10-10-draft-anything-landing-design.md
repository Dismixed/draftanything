# Draft Anything: landing page and a separate room screen

Date: 2026-10-10
Status: awaiting review

## Why

Draft Anything is listed on Stim Games as one tile among nine, but it is a different kind of game: multiplayer, room codes, an AI judge, ten minutes or more with friends. Today `/draft-anything` opens straight onto the Create Room / Join Room form, with the descriptive text stacked underneath. A newcomer is asked to configure a room before anything has told them what the game is.

The owner's request, in their words: "draft anything needs to be its own independent game with a landing page type of thing and then the game."

Decisions made during brainstorming (mockups in `.superpowers/brainstorm/40201-1791645456/content/`):

- Independence level: its own section on the same site. No separate domain, deploy or brand.
- Landing opening: option C ("Tonight we are drafting…", topic types itself), with no form on the landing page.
- "You have to click and then get to a screen like the current Draft Anything": two buttons, Start a draft and Join a room, lead to a second screen that is today's screen.
- Joining must be easy: Join a room is a first-class button, one tap from the code box.
- All five mocked sections stay, in the mocked order.

## Goals

1. A first-time visitor to `/draft-anything` understands the game before being asked to fill anything in.
2. Starting a draft is one click from the landing page; joining a room is one click from the landing page.
3. Someone who opens a room link without a session ends up on the join form with the code filled in, not on the Stim Games home page.
4. The room screen (create / join) looks and works as it does today.

## Out of scope

- A visual redesign of the room screen, lobby, draft board or results. Draft Anything's turn in the per-game visual pass is separate.
- A separate domain, header brand or deploy.
- Changes to `/draft/[roomCode]` and `/results/[draftId]` addresses.
- Changes to the create and join forms beyond accepting an initial value.
- Sound.

## 1. Routes

| Address | What it is | Indexed |
| --- | --- | --- |
| `/draft-anything` | Landing page (new) | Yes, canonical, unchanged metadata |
| `/draft-anything/play` | Room screen: today's crest, title and Create Room / Join Room card | No (`robots: noindex`, canonical `/draft-anything`) |
| `/draft/[roomCode]` | Unchanged | Unchanged |
| `/results/[draftId]` | Unchanged | Unchanged |

`/draft-anything/play` reads three optional query parameters:

- `tab=join` opens the Join Room tab. Anything else opens Create Room.
- `topic=<text>` fills the topic field on the create form. Trimmed and cut to the form's existing topic length limit.
- `code=<text>` fills the room code on the join form and implies `tab=join`.

The registry entry keeps `playHref` and `canonicalPath` as `/draft-anything`, so the home page tile and the "All games" link go to the landing page. The home tile's button text changes from "Create a room" to "See the game", because it no longer lands on the form.

## 2. Landing page

A server component at `app/draft-anything/page.tsx`. Its content, top to bottom:

**Top bar.** "← Stim Games" on the left linking to `/`, the "Draft *Anything*" wordmark centred.

**Opening.**
- Eyebrow: "Draft Anything · a party game for 2 to 6".
- `h1`: "Tonight we are drafting" followed by a topic that types and deletes itself, cycling through five topics. The server renders the first topic in full, so the heading reads as a sentence without JavaScript. With `prefers-reduced-motion`, the first topic stays put and nothing animates.
- One line: "Pick a topic. Take turns choosing. Defend your lineup, then let the room or an AI judge decide who won."
- Two buttons: **Start a draft** → `/draft-anything/play`; **Join a room** → `/draft-anything/play?tab=join`. Side by side on desktop, stacked full-width on a phone.
- Small print: "Free. No accounts, no download."
- Five topic chips taken from `HOT_CATEGORIES`. Each links to `/draft-anything/play?topic=<that category's topic>`.

**Section 1, How a draft works.** Four numbered steps: Pick a topic; Share the code; Take turns picking; Defend and get judged. Four columns on desktop, one on a phone.

**Section 2, Things people draft.** All eight `HOT_CATEGORIES` as cards (category label, topic). Each card links to the room screen with that topic filled in. Four columns on desktop, two on a phone.

**Section 3, Pick your judge.** The three built-in judge personalities (Analyst, Hype, Roast), each with one sample line of verdict in its voice. Static text.

**Section 4, Questions.** The five FAQ items from `lib/games/content/draft-anything.ts` as `<details>`, followed by that file's long-form sections ("How judging works", "Fun draft ideas with friends", "Setting up a room") as further `<details>`. "How to play" is not repeated, since section 1 covers it. The FAQ JSON-LD from `buildFaqJsonLd` is emitted here. This keeps the descriptive text that search engines read today.

**Section 5, closing.** "Get the group chat ready." and the same two buttons.

**Footer.** "All Stim Games →" linking to `/`.

`GameAbout` is no longer rendered for Draft Anything; the landing page replaces it. The content file is unchanged.

### Look

Draft Anything's existing colours and fonts (Playfair Display headings, Outfit body, gold accent, the `--bg` / `--panel` / `--border-hi` / `--gold` / `--text` tokens), in both themes. Fewer boxes, generous space between groups. Small labels use `--text-dim` only at sizes and weights that reach 4.5:1 on the page background in both themes; where they do not, they use `--text`.

Styles go in a new `app/draft-anything.css`, imported by the Draft Anything layout, with every class prefixed `dal-`.

## 3. Room screen

`app/draft-anything/play/page.tsx` is a server component that reads `searchParams` and renders the existing `DraftLobbyPage` with three new optional props: `initialTab`, `initialTopic`, `initialRoomCode`.

- `DraftLobbyPage` uses `initialTab` as the starting value of its tab state and passes the other two down.
- `CreateRoomForm` gains an `initialTopic` prop, used as the starting topic.
- `JoinRoomForm` already accepts `initialRoomCode`.
- A small "← Draft Anything" link to `/draft-anything` is added above the crest.

Nothing else on this screen changes.

## 4. Links that currently go to the wrong place

- `app/draft/[roomCode]/page.tsx`: a visitor with no guest session is redirected to `/`. Change to `/draft-anything/play?code=<roomCode>`, so a friend who opens a shared room link lands on the join form with the code in place.
- `components/draft/complete-panel.tsx`: "← Back to Home" links to `/`. Change the link to `/draft-anything` and the text to "← Draft Anything".

## 5. Analytics

One new PostHog event from the landing page, `draft_landing_cta_clicked`, with:

- `cta`: `start`, `join` or `topic`
- `position`: `hero`, `ideas` or `closing`
- `topic`: the topic text, for `cta: topic` only

The existing `draft_lobby_tab_changed` event is unchanged.

## 6. Units

| Unit | Kind | Purpose |
| --- | --- | --- |
| `app/draft-anything/page.tsx` | server | Assembles the landing page |
| `components/draft-landing/rotating-topic.tsx` | client | The typing topic; reduced-motion aware |
| `components/draft-landing/landing-link.tsx` | client | A `Link` that fires `draft_landing_cta_clicked` |
| `lib/draft-landing/play-href.ts` | pure | Builds `/draft-anything/play` addresses and parses its query parameters |
| `app/draft-anything/play/page.tsx` | server | Parses parameters, renders `DraftLobbyPage` |
| `app/draft-anything.css` | styles | `dal-` classes |

## 7. Testing

Unit and component tests (Vitest):

- `play-href`: builds each address; parses `tab`, `topic`, `code`; `code` implies join; over-long and whitespace-only topics are handled; unknown `tab` falls back to create.
- Landing page render: both hero buttons and both closing buttons have the right addresses; eight idea cards link with their topic; five FAQ questions present; FAQ JSON-LD present.
- `DraftLobbyPage`: `initialTab="join"` shows the join panel; `initialTopic` reaches the topic field; `initialRoomCode` reaches the code field, upper-cased.
- `RotatingTopic`: server render contains the first topic in full.

Existing tests to update:

- `tests/e2e/responsive.spec.ts` and any other e2e that drives the create or join form at `/draft-anything`: point at `/draft-anything/play`.
- `tests/e2e/game-about.spec.ts`: `/draft-anything` no longer has a `GameAbout` section; remove it from that list and add an accessibility check of the landing page in both themes.
- `tests/components/home-today.test.tsx`, `tests/lib/games/registry.test.ts`, `tests/seo.test.ts`: addresses are unchanged; update only if the tile's button text is asserted.

Verification gate, as on earlier work in this repo: typecheck, Vitest, production build, and no new lint errors in touched files. End-to-end tests that create guests or rooms write to the hosted database and are not run locally; the public-page e2e tests are.

A visual check of the built landing page and room screen, at desktop and phone widths in both themes, before it is called done.
