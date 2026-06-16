# Selective AI Commissioner Commentary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** Add AI-generated draft commentary that selectively triggers on notable picks (reaches, steals, runs, trends).

**Architecture:** Pure trigger functions determine if commentary should fire based on pick metadata; AI generates personality-flavored text via OpenAI; commentary is stored idempotently and rendered via a new AiDesk component. The pick route fire-and-forgets commentary after responding.

**Tech Stack:** Next.js, OpenAI Responses API, Zod, Zustand, Supabase

---

### Task 1: Commentary Trigger Logic + Tests

**Files:**
- Create: `features/ai/commentary-trigger.ts`
- Create: `features/ai/commentary-trigger.test.ts`

- [ ] **Step 1: Write failing tests for trigger rules**

Cover reach, steal, category run, roster trend, minimum pick interval, and no-comment ordinary pick.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- features/ai/commentary-trigger.test.ts`

- [ ] **Step 3: Implement trigger rules**

Pure function comparing item scores vs all items. Returns `{ tags: string[], priority: number }` or null.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- features/ai/commentary-trigger.test.ts`

- [ ] **Step 5: Commit**

### Task 2: Commentary Prompts + AI Module

**Files:**
- Create: `features/ai/prompts/commentary.ts`
- Create: `features/ai/commentary.ts`
- Create: `features/ai/commentary.test.ts`

- [ ] **Step 1: Write failing tests for prompts and commentary AI**

Test prompt structure, output schema validation, idempotency key generation, error handling.

- [ ] **Step 2: Run to verify failures**

- [ ] **Step 3: Implement prompts and commentary module**

Prompt builder for each personality. Commentary function using OpenAI Responses API with zodTextFormat.

- [ ] **Step 4: Run tests to verify passes**

- [ ] **Step 5: Commit**

### Task 3: API Route

**Files:**
- Create: `app/api/ai/commentary/route.ts`

- [ ] **Step 1: Write failing tests (integration contract)**

- [ ] **Step 2: Run to verify failures**

- [ ] **Step 3: Implement route handler**

Accept POST, run trigger, call AI if warranted, insert with idempotency key, return result.

- [ ] **Step 4: Typecheck**

- [ ] **Step 5: Commit**

### Task 4: AI Desk Component

**Files:**
- Create: `components/draft/ai-desk.tsx`

- [ ] **Step 1: Write failing component tests**

- [ ] **Step 2: Run to verify failures**

- [ ] **Step 3: Implement AiDesk component**

Show latest commentary at top, trigger labels, empty state, aria-live region, collapsible.

- [ ] **Step 4: Run tests to verify passes**

- [ ] **Step 5: Commit**

### Task 5: Integrate into DraftBoard + Pick Route

**Files:**
- Modify: `components/draft/draft-board.tsx`
- Modify: `app/api/drafts/[draftId]/pick/route.ts`

- [ ] **Step 1: Replace CurrentTurn with AiDesk in AI sections**

- [ ] **Step 2: Add fire-and-forget commentary trigger in pick route**

- [ ] **Step 3: Typecheck**

- [ ] **Step 4: Commit**

### Task 6: Verify

- [ ] **Step 1: Run `pnpm typecheck && pnpm test`**
- [ ] **Step 2: Self-review**
- [ ] **Step 3: Report**
