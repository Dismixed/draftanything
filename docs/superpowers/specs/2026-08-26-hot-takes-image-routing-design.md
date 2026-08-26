# Hot Takes: Real-Photo-First Image Routing

**Date:** 2026-08-26
**Status:** Draft

## Overview

Hot Takes items must be sourced with real photos for real, named entities (people, films, brands, landmarks, dishes) and AI-generated icons only for generic/abstract concepts. The goal is to route each item to the correct image source automatically, so the dynamically-generated categories can be illustrated at scale without hand-curating photos.

The key principle: **the Wikipedia/Commons lookup is the source of truth for "is this a real entity or not," not a tag.** A `subject_type` tag emitted by the category LLM acts as a *hint* (generator bias, admin label, fallback prompt style) but never decides whether a lookup happens. This makes mis-tags harmless in both directions.

---

## 1. Data Model

### 1.1 Modify: `hot_takes_items`

Migration `supabase/migrations/20260826_hot_takes_subject_type.sql`:

```sql
alter table public.hot_takes_items
  add column subject_type text not null default 'generic'
    check (subject_type in ('real_entity', 'generic'));

alter table public.hot_takes_items
  add column photo_query text;
```

- `subject_type`:
  - `real_entity` — a specific, named, findable thing with a Wikipedia article (person, film, TV show, brand, landmark, dish, etc.).
  - `generic` — an abstract concept, activity, or idea (a meeting type, a gym exercise, a topping).
  - Defaults to `generic`, so existing seeded items backfill automatically with no data migration.
- `photo_query`: nullable free-text search string for Wikimedia Commons. May equal `wiki_title` or `label`, but exists to decouple "the search term" from "the exact article title" (`wiki_title`).

### 1.2 Types (`lib/hot-takes/types.ts`)

```ts
export const SUBJECT_TYPES = ["real_entity", "generic"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];
```

Add `subject_type: SubjectType` and `photo_query: string | null` to `ItemRow`.

### 1.3 `lib/hot-takes/seed-db.ts`

- `rowToItem`: map `subject_type` (with fallback to `"generic"` for pre-migration rows) and `photo_query`.
- `replaceCategoryItems`: accept and insert the two new fields.
- `updateItem`: accept the two new fields in the patch.

---

## 2. Proposal LLM (`lib/hot-takes/propose.ts`)

Extend the Zod `ProposalSchema` per-item to include:

- `subject_type`: enum `"real_entity" | "generic"`.
- `photo_query`: string (min 1).
- Relax `wiki_title` from `z.string().min(1)` to `z.string().nullable().optional()` — the current schema rejects empty/null, which would make every `generic` item fail validation.

`ProposedItem` gains the two new fields and makes `wiki_title` nullable.

Update the system prompt to:

1. Define the two subject types and instruct classification: named/findable entity with a Wikipedia article → `real_entity`; abstract concept/activity → `generic`.
2. `wiki_title` = exact Wikipedia article title for `real_entity` items; empty/null for `generic` items.
3. `photo_query` = the best Wikimedia Commons search string (may equal `wiki_title` or `label`).
4. Retain the existing nudge "prefer Wikipedia article titles that have strong lead photos" — this is the **lean-real** bias, hardcoded for v1 (no admin toggle yet).

---

## 3. Routing / Sourcing Layer (core)

New module `lib/hot-takes/source-item.ts` with a single entry point:

```ts
sourceItemImage(db, item, categoryName): Promise<{ kind: "photo" | "generated" }>
```

`db` is a `SupabaseClient<Database>` passed in by the route handler (which creates it via `createAdminClient()`), matching the `daily-service`/`schedule-service` pattern. Re-sourcing is always allowed: each run overwrites `image_candidates`/`image_url` and sets `status = "needs_review"`.

Flow:

1. **Always look up first.** Extend `resolveItemImageCandidates` (in `lib/hot-takes/image-sourcing.ts`) to accept an optional `photoQuery?: string | null`; when present, it is added as an extra `searchCommonsFiles` term. Call it with `{ label: item.label, wikiTitle: item.wiki_title, categoryName, photoQuery: item.photo_query }`. If ≥1 candidate returns:
   - Set `image_candidates`, `selected_candidate_index = 0`, `image_url = first candidate`, `image_source = "wikimedia"`, `status = "needs_review"`.
   - Return `{ kind: "photo" }`.
2. **Fallback generate on miss.** If lookup returns zero candidates, call `generateItemIcon({ categorySlug, itemSlug, categoryName, label, subjectType: item.subject_type })`. Extend `generateItemIcon`/`iconPrompt` (in `lib/hot-takes/icon-generate.ts`) to accept `subjectType`; the prompt remains the flat-vector icon style, and for `subjectType === "real_entity"` it appends a no-likeness instruction: "generic symbolic representation; do not render a specific named individual's likeness." Set `image_source = "generated"`. Return `{ kind: "generated" }`.

**Error handling:** the lookup path already swallows errors and returns `[]` (so it degrades to generation). If generation also fails (network/quota/storage error), `sourceItemImage` throws, and the route returns a 500 with the error message — the admin sees it and can retry or use "Add URL". No partial writes: the item is only updated on success.

**Return value:** `sourceItemImage` returns `{ kind }` only; the admin route re-fetches the category afterward (the existing `fetchCategory` pattern), so the updated item is always read fresh from the DB rather than reconstructed.

`subject_type` is consulted **only** for the fallback prompt style — never to decide whether the lookup runs. Consequences:

- `real_entity` mis-tagged `generic` → lookup still runs and resolves → real photo used. Safe.
- `generic` mis-tagged `real_entity` → lookup misses → generated icon. Safe.

### Fallback prompt guard (real_entity)

The existing generator already produces a flat vector icon, not a photorealistic image, so a lookup miss can never synthesize a person's likeness. The added no-likeness instruction is a defense-in-depth prompt guard, not a schema change.

---

## 4. Admin API + UI

### 4.1 New route: `app/api/admin/hot-takes/items/[id]/source/route.ts`

- `POST`, admin-guarded (same `checkAdmin()` pattern as sibling routes).
- Loads item + category, calls `sourceItemImage`, returns `{ item, kind, candidateCount }`.
- The existing `images/route.ts` (the old "Fetch" lookup-only endpoint) becomes unused by the UI once "Fetch" is renamed to "Source"; remove it or leave it, but it should no longer be referenced.

### 4.2 UI (`app/admin/hot-takes/page.tsx`)

- Rename the per-item "Fetch" button to **"Source"** and point it at the new `source` route (lookup-first → generate-fallback).
- Keep **"Generate"** (force-generate, no lookup — escape hatch when the photo is bad).
- Keep **"Add URL"** (manual URL).

---

## 5. Testing

- Unit test `sourceItemImage` with mocked `resolveItemImageCandidates` + `generateItemIcon`:
  - lookup hit → photo/`wikimedia`, `image_url` set.
  - lookup miss + `real_entity` → generated with no-likeness prompt.
  - lookup miss + `generic` → generated.
- Unit test `propose.ts` schema by mocking `generateJson` (pattern used in `tests/lib/`): asserts the new fields are validated.
- `vitest.config.ts` already stubs `server-only` (via `tests/__mocks__/server-only.ts`), so server modules are importable in tests.

---

## 6. Out of Scope (explicitly deferred)

- **TMDB** and any `source_hint`/`domain` field to route film/TV/actor lookups. Requires API key, new resolver, attribution display.
- Admin "lean real vs. lean generic" toggle — v1 hardcodes lean-real.
- De-duplicating `hot-takes/image-sourcing.ts` against `anyguessr/image-sourcing.ts` (both define `searchCommonsFiles`).

---

## 7. Non-Goals / Constraints

- Do not generate photorealistic images of real, named people — enforced by (a) preferring the real-photo lookup, and (b) the generator already being flat-vector style plus the no-likeness guard on the real_entity fallback.
- No player-facing behavior change. This is purely the content-pipeline image-sourcing path; the daily game resolution (`daily-service.ts`), scoring, and admin approval flow are unchanged.
