# Hot Takes Real-Photo-First Image Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route each Hot Takes item to a real photo (Wikipedia/Commons) when it exists, and fall back to a generated flat-vector icon only when the lookup misses, using `subject_type` as a pure hint.

**Architecture:** Add `subject_type` + `photo_query` columns to `hot_takes_items`; have the category LLM emit both; add a `sourceItemImage` router that always runs the Wikipedia/Commons lookup first and only generates on a miss; swap the admin "Fetch" button for a "Source" button that calls a new admin route.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + Storage), Zod v4, Gemini (`@google/genai`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-26-hot-takes-image-routing-design.md`

---

## File Structure

**Create:**
- `supabase/migrations/202608260900_hot_takes_subject_type.sql` — adds the two columns.
- `lib/hot-takes/source-item.ts` — the routing function.
- `app/api/admin/hot-takes/items/[id]/source/route.ts` — admin endpoint.
- `tests/lib/hot-takes-propose.test.ts` — schema validation tests.
- `tests/lib/hot-takes-icon-prompt.test.ts` — fallback prompt tests.
- `tests/lib/hot-takes-source-item.test.ts` — router tests.

**Modify:**
- `lib/hot-takes/types.ts` — `SUBJECT_TYPES`, `SubjectType`, `ItemRow` fields.
- `lib/supabase/database.types.ts` — `hot_takes_items` Row/Insert/Update columns.
- `lib/hot-takes/seed-db.ts` — `rowToItem`, `replaceCategoryItems`, `updateItem`.
- `lib/hot-takes/propose.ts` — `ProposalSchema`, `ProposedItem`, prompt.
- `lib/hot-takes/icon-generate.ts` — `generateItemIcon`, `iconPrompt`.
- `lib/hot-takes/image-sourcing.ts` — `resolveItemImageCandidates` gains `photoQuery`.
- `app/admin/hot-takes/page.tsx` — "Fetch" → "Source".

---

### Task 1: Data model — types, migration, DB types

**Files:**
- Create: `supabase/migrations/202608260900_hot_takes_subject_type.sql`
- Modify: `lib/hot-takes/types.ts`
- Modify: `lib/supabase/database.types.ts:679-727`

- [ ] **Step 1: Add the `SubjectType` union to `lib/hot-takes/types.ts`**

Add `SUBJECT_TYPES = ["real_entity", "generic"] as const` and `export type SubjectType = (typeof SUBJECT_TYPES)[number]`. Add `subject_type: SubjectType` and `photo_query: string | null` to the `ItemRow` interface.

- [ ] **Step 2: Write the migration SQL**

Create `supabase/migrations/202608260900_hot_takes_subject_type.sql`:

```sql
alter table public.hot_takes_items
  add column subject_type text not null default 'generic'
    check (subject_type in ('real_entity', 'generic'));

alter table public.hot_takes_items
  add column photo_query text;
```

- [ ] **Step 3: Update generated DB types**

In `lib/supabase/database.types.ts`, within `hot_takes_items`, add (keeping alphabetical order):
- `Row`: `photo_query: string | null` after `notes`, and `subject_type: string` after `status`.
- `Insert`: `photo_query?: string | null` after `notes`, and `subject_type?: string` after `status`.
- `Update`: `photo_query?: string | null` after `notes`, and `subject_type?: string` after `status`.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors). This confirms the type/DB-type plumbing is consistent.

- [ ] **Step 5: Commit**

Run: `git add lib/hot-takes/types.ts lib/supabase/database.types.ts supabase/migrations/202608260900_hot_takes_subject_type.sql && git commit -m "feat(hot-takes): add subject_type and photo_query columns"`

---

### Task 2: `seed-db.ts` mapping

**Files:**
- Modify: `lib/hot-takes/seed-db.ts:43-60` (`rowToItem`), `:174-214` (`replaceCategoryItems`), `:230-259` (`updateItem`)

- [ ] **Step 1: Map the new fields in `rowToItem`**

In `rowToItem`, add `subject_type: (row.subject_type as SubjectType) ?? "generic"` (fallback for any pre-migration row) and `photo_query: (row.photo_query as string | null) ?? null`. Import `SubjectType` from `./types`.

- [ ] **Step 2: Thread fields through `replaceCategoryItems`**

Extend the `items` parameter type to include `subject_type?: SubjectType` and `photo_query?: string | null`. In the `rows` map, add `subject_type: item.subject_type ?? "generic"` and `photo_query: item.photo_query ?? null`.

- [ ] **Step 3: Thread fields through `updateItem`**

Add `subject_type: SubjectType` and `photo_query: string | null` to the `patch` type. No other change — the existing spread `...patch` passes them through.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add lib/hot-takes/seed-db.ts && git commit -m "feat(hot-takes): map subject_type and photo_query in seed-db"`

---

### Task 3: Proposal LLM schema + prompt

**Files:**
- Modify: `lib/hot-takes/propose.ts`
- Test: `tests/lib/hot-takes-propose.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/lib/hot-takes-propose.test.ts`, import `ProposalSchema` (to be exported from `propose.ts`) and assert:
- a valid `real_entity` item (`subject_type: "real_entity"`, `photo_query: "pepperoni"`, `wiki_title: "Pepperoni"`) parses,
- a valid `generic` item (`subject_type: "generic"`, `photo_query: "meeting type"`, `wiki_title: null`) parses,
- an item with `subject_type: "person"` (not in enum) fails,
- an item missing `photo_query` fails.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/lib/hot-takes-propose.test.ts`
Expected: FAIL (import error — `ProposalSchema` not exported).

- [ ] **Step 3: Update `propose.ts`**

Export the existing `ProposalSchema` const. Extend it per-item with `subject_type: z.enum(["real_entity", "generic"])` and `photo_query: z.string().min(1)`. Relax `wiki_title` from `z.string().min(1)` to `z.string().nullable().optional()`. Update the `ProposedItem` interface with `subject_type: SubjectType` and `photo_query: string`, and make `wiki_title` nullable. Update the system prompt to (a) define both subject types and classification rules, (b) `wiki_title` = exact article title for `real_entity` / empty for `generic`, (c) `photo_query` = best Commons search string, (d) keep the "prefer titles with strong lead photos" nudge.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/lib/hot-takes-propose.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add lib/hot-takes/propose.ts tests/lib/hot-takes-propose.test.ts && git commit -m "feat(hot-takes): emit subject_type and photo_query from proposal LLM"`

---

### Task 4: Icon fallback prompt (`icon-generate.ts`)

**Files:**
- Modify: `lib/hot-takes/icon-generate.ts:10-17` (`iconPrompt`), `:19-64` (`generateItemIcon`)
- Test: `tests/lib/hot-takes-icon-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/lib/hot-takes-icon-prompt.test.ts`, import `iconPrompt` (to be exported) and assert:
- for `subjectType: "real_entity"`, the prompt contains the phrase `do not render a specific named individual's likeness`,
- for `subjectType: "generic"`, the prompt does NOT contain that phrase.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/lib/hot-takes-icon-prompt.test.ts`
Expected: FAIL (`iconPrompt` not exported / wrong signature).

- [ ] **Step 3: Update `icon-generate.ts`**

Export `iconPrompt`. Change its signature to `iconPrompt(categoryName, label, subjectType?: SubjectType)`. When `subjectType === "real_entity"`, append to the returned string: `" Generic symbolic representation; do not render a specific named individual's likeness."` Update `generateItemIcon` to accept `subjectType?: SubjectType` in its options and pass it through to `iconPrompt`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/lib/hot-takes-icon-prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add lib/hot-takes/icon-generate.ts tests/lib/hot-takes-icon-prompt.test.ts && git commit -m "feat(hot-takes): no-likeness fallback prompt for real_entity items"`

---

### Task 5: `photo_query` in the lookup (`image-sourcing.ts`)

**Files:**
- Modify: `lib/hot-takes/image-sourcing.ts:74-111` (`resolveItemImageCandidates`)

- [ ] **Step 1: Extend `resolveItemImageCandidates`**

Add an optional `photoQuery?: string | null` to the options object. When `photoQuery` is non-empty, include it as an additional term in the `searchCommonsFiles` call (e.g., `searchCommonsFiles(photoQuery, 5)` appended to the existing `collected` before dedupe). Keep existing behavior otherwise.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS. (This change is a thin param plumb-through; it is exercised by the Task 6 router test which mocks this module.)

- [ ] **Step 3: Commit**

Run: `git add lib/hot-takes/image-sourcing.ts && git commit -m "feat(hot-takes): use photo_query as an extra Commons search term"`

---

### Task 6: The router (`source-item.ts`)

**Files:**
- Create: `lib/hot-takes/source-item.ts`
- Test: `tests/lib/hot-takes-source-item.test.ts`

- [ ] **Step 1: Write the failing test**

In `tests/lib/hot-takes-source-item.test.ts`, use `vi.mock` for `@/lib/hot-takes/image-sourcing`, `@/lib/hot-takes/icon-generate`, and `@/lib/hot-takes/seed-db`. Mock `resolveItemImageCandidates`, `generateItemIcon`, and `updateItem` as `vi.fn()`. Assert:
- **photo path:** when `resolveItemImageCandidates` resolves `[candidate]`, `sourceItemImage` calls `updateItem` with `image_candidates: [candidate]`, `image_source: "wikimedia"`, `selected_candidate_index: 0`, `image_url: candidate.image_url`, `status: "needs_review"`; `generateItemIcon` is NOT called; returns `{ kind: "photo" }`.
- **generated path:** when `resolveItemImageCandidates` resolves `[]`, `sourceItemImage` calls `generateItemIcon` (passing `subjectType: item.subject_type`), then `updateItem` with `image_source: "generated"` and `image_url` = the returned `publicUrl`; returns `{ kind: "generated" }`.

Pass a `db` argument as `{} as never` since `updateItem` is mocked.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test tests/lib/hot-takes-source-item.test.ts`
Expected: FAIL (`source-item.ts` does not exist).

- [ ] **Step 3: Implement `sourceItemImage`**

Create `lib/hot-takes/source-item.ts` with `import "server-only";`. Export:

```ts
export async function sourceItemImage(
  db: SupabaseClient<Database>,
  item: ItemRow,
  categoryName: string,
  categorySlug: string,
): Promise<{ kind: "photo" | "generated" }>
```

Flow: call `resolveItemImageCandidates({ label: item.label, wikiTitle: item.wiki_title, categoryName, photoQuery: item.photo_query })`. If ≥1 candidate → `updateItem` (photo fields) → return `{ kind: "photo" }`. Else → `generateItemIcon({ categorySlug, itemSlug: item.slug, categoryName, label: item.label, subjectType: item.subject_type })` → `updateItem` (generated fields, prepending the new candidate to `item.image_candidates`) → return `{ kind: "generated" }`. Do not swallow errors — let them propagate (the route turns them into a 500).

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test tests/lib/hot-takes-source-item.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

Run: `git add lib/hot-takes/source-item.ts tests/lib/hot-takes-source-item.test.ts && git commit -m "feat(hot-takes): real-photo-first image routing"`

---

### Task 7: Admin route + UI

**Files:**
- Create: `app/api/admin/hot-takes/items/[id]/source/route.ts`
- Modify: `app/admin/hot-takes/page.tsx:187-217` (`fetchImages` → `sourceItem`), `:433` (button label)

- [ ] **Step 1: Create the `source` route**

Create `app/api/admin/hot-takes/items/[id]/source/route.ts`, mirroring the sibling `images/route.ts` (admin guard via `checkAdmin`, `createAdminClient`, Next.js 16 async `params`). `POST` handler: load `getItem`, then `getCategory`, call `sourceItemImage(db, item, category.name, category.slug)`, re-fetch the item via `getItem`, and return `{ item, kind, candidateCount: item.image_candidates.length }`. Return 500 with the error message on failure.

- [ ] **Step 2: Update the admin page**

In `app/admin/hot-takes/page.tsx`, add a `sourceItem(item: ItemRow)` handler that POSTs to `/api/admin/hot-takes/items/${item.id}/source`, shows a message based on `kind` (`"Found a real photo"` vs `"Generated an icon"`), and re-fetches the category. Rename the "Fetch" button label to "Source" and point its `onClick` at `sourceItem(item)`. Keep the "Generate" (`generateIcon`) and "Add URL" (`addManualImage`) buttons unchanged.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: PASS (all existing + new tests).

- [ ] **Step 5: Commit**

Run: `git add app/api/admin/hot-takes/items/\[id\]/source/route.ts app/admin/hot-takes/page.tsx && git commit -m "feat(hot-takes): admin Source action routes lookup-first"`

Note: the old `images/route.ts` (lookup-only "Fetch" endpoint) becomes unreferenced by the UI. Leave it in place for now — removing it is out of scope and not required for correctness.

---

## Final verification

- [ ] Run `pnpm verify` (lint + typecheck + test + build). Expected: PASS.
