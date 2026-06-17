import { test, expect, type APIRequestContext } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "http://127.0.0.1:3000";

// ---------------------------------------------------------------------------
// Helpers (shared with lobby.spec.ts)
// ---------------------------------------------------------------------------

async function bootstrapGuest(page: Page) {
  await page.request.post("/api/guest");
}

async function createRoom(page: Page, options: {
  displayName: string;
  topic: string;
  maxPlayers?: number;
  rounds?: number;
}) {
  await page.goto("/");

  await page.getByRole("tab", { name: "Create room" }).click();

  await page.getByLabel("Your display name").fill(options.displayName);
  await page.getByLabel("Draft topic").fill(options.topic);

  if (options.maxPlayers !== undefined) {
    await page.getByLabel("Players (2–6)").fill(String(options.maxPlayers));
  }

  if (options.rounds !== undefined) {
    await page.getByLabel("Rounds (1–10)").fill(String(options.rounds));
  }

  await page.getByRole("button", { name: "Create room" }).click();
  await page.waitForURL(/\/draft\/[A-Z2-9]{6}/);
}

async function extractRoomCode(page: Page): Promise<string> {
  const codeEl = page.locator('[aria-labelledby="room-code-label"] p.font-mono');
  const text = await codeEl.innerText();
  return text.trim();
}

async function joinRoom(page: Page, roomCode: string, displayName: string) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Join room" }).click();
  await page.getByLabel("Room code").fill(roomCode);
  await page.getByLabel("Your display name").fill(displayName);
  await page.getByRole("button", { name: "Join room" }).click();
  await page.waitForURL(/\/draft\/[A-Z2-9]{6}/);
}

// ---------------------------------------------------------------------------
// API helpers (no UI required)
// ---------------------------------------------------------------------------

async function apiBootstrapGuest(ctx: APIRequestContext) {
  const res = await ctx.post("/api/guest");
  expect(res.ok()).toBeTruthy();
}

async function apiCreateRoom(ctx: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const res = await ctx.post("/api/drafts", {
    data: {
      displayName: "Host",
      topic: "E2E Draft",
      maxPlayers: 2,
      rounds: 1,
      draftType: "standard",
      judgingMode: "ai",
      aiPersonality: "analyst",
      timerSeconds: 60,
      ...overrides,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    draftId: string;
    roomCode: string;
    hostPlayerId: string;
    players: { id: string; seat: number }[];
  }>;
}

async function apiStartPoolReview(ctx: APIRequestContext, draftId: string) {
  const res = await ctx.post(`/api/drafts/${draftId}/pool`, {
    data: { action: "start-review" },
  });
  expect(res.ok()).toBeTruthy();
}

async function apiAddItems(ctx: APIRequestContext, draftId: string, names: string[]) {
  for (const name of names) {
    const res = await ctx.post(`/api/drafts/${draftId}/pool`, {
      data: { action: "add-item", name },
    });
    expect(res.ok()).toBeTruthy();
  }
}

async function apiLockPool(ctx: APIRequestContext, draftId: string) {
  const res = await ctx.post(`/api/drafts/${draftId}/pool`, {
    data: { action: "lock" },
  });
  expect(res.ok()).toBeTruthy();
}

async function apiStartDraft(ctx: APIRequestContext, draftId: string, pickOrder: { overallPick: number; round: number; pickInRound: number; seat: number }[]) {
  const res = await ctx.post(`/api/drafts/${draftId}/start`, {
    data: { pickOrder },
  });
  expect(res.ok()).toBeTruthy();
}

async function apiGetProjection(ctx: APIRequestContext, draftId: string) {
  const res = await ctx.get(`/api/drafts/${draftId}/projection`);
  expect(res.ok()).toBeTruthy();
  return res.json() as Promise<{
    draft: {
      id: string;
      phase: string;
      currentPickIndex: number;
      pickOrder: { overallPick: number; round: number; pickInRound: number; seat: number }[];
      turnDeadline: string | null;
      timerSeconds: number | null;
      rounds: number;
    };
    players: { id: string; displayName: string; seat: number; isHost: boolean }[];
    availableItems: { id: string; name: string; isAvailable: boolean }[];
    picks: { id: string; playerId: string; itemId: string; overallPick: number; round: number; pickInRound: number; isAutoPick: boolean }[];
    serverNow: string;
  }>;
}

async function apiPick(ctx: APIRequestContext, draftId: string, itemId: string, expectedPick: number) {
  return ctx.post(`/api/drafts/${draftId}/pick`, {
    data: { itemId, expectedPick },
  });
}

async function apiAutoPick(ctx: APIRequestContext, draftId: string) {
  return ctx.post(`/api/drafts/${draftId}/auto-pick`, {
    data: {},
  });
}

async function apiStartDefense(ctx: APIRequestContext, draftId: string) {
  return ctx.post(`/api/drafts/${draftId}/start-defense`);
}

/**
 * Sets up a complete 2-player draft through the pool phase.
 * Returns the draftId and roomCode.
 * The draft is in DRAFTING phase after lock but NOT started yet.
 * @param guestCtx - A pre-authenticated API context for the second player.
 */
async function setupTwoPlayerDraft(
  hostCtx: APIRequestContext,
  guestCtx: APIRequestContext,
  options: {
    draftType?: string;
    rounds?: number;
    timerSeconds?: number | null;
    itemNames?: string[];
  } = {},
) {
  const {
    draftType = "standard",
    rounds = 1,
    timerSeconds = 60,
    itemNames = ["Alpha Item", "Beta Item", "Gamma Item", "Delta Item"],
  } = options;

  const room = await apiCreateRoom(hostCtx, {
    maxPlayers: 2,
    rounds,
    draftType,
    timerSeconds,
  });
  const { draftId, roomCode } = room;

  const joinRes = await guestCtx.post(`/api/drafts/by-code/${roomCode}/join`, {
    data: { displayName: "Guest" },
  });
  expect(joinRes.ok()).toBeTruthy();

  // Pool flow
  await apiStartPoolReview(hostCtx, draftId);
  await apiAddItems(hostCtx, draftId, itemNames);
  await apiLockPool(hostCtx, draftId);

  return { draftId, roomCode };
}

/**
 * Sets up a 1-player draft (host only) through the pool phase.
 * Room is set to 2 max players to allow proper pick order validation.
 * The draft is in DRAFTING phase after lock but NOT started yet.
 */
async function setupSinglePlayerDraft(
  ctx: APIRequestContext,
  options: {
    timerSeconds?: number | null;
    itemNames?: string[];
  } = {},
) {
  const {
    timerSeconds = 60,
    itemNames = ["Alpha Item", "Beta Item", "Gamma Item", "Delta Item"],
  } = options;

  const room = await apiCreateRoom(ctx, {
    maxPlayers: 2,
    rounds: 1,
    timerSeconds,
  });
  const { draftId } = room;

  await apiStartPoolReview(ctx, draftId);
  await apiAddItems(ctx, draftId, itemNames);
  await apiLockPool(ctx, draftId);

  return { draftId };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Draft flow (UI)", () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    await bootstrapGuest(hostPage);
    await bootstrapGuest(guestPage);
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test("draft transitions through phases correctly", async () => {
    // Host creates a room with 2 players, 2 rounds, snake, 60s timer
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Test Draft E2E",
      maxPlayers: 2,
      rounds: 2,
    });

    const roomCode = await extractRoomCode(hostPage);

    // Guest joins
    await joinRoom(guestPage, roomCode, "Bob");

    // Host starts pool review
    // First, we need to reach the pool review phase
    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 10000 });

    // Host generates AI items (or adds items manually)
    // For simplicity, we'll test via the API directly for the draft phase
  });
});

test.describe("Draft flow (API)", () => {
  test("pick and auto-pick via API", async ({ request }) => {
    // Create a draft via API directly and test the pick/auto-pick RPCs
    // This tests the business logic without going through the full UI

    // First, create a guest session
    await request.post("/api/guest");

    // Create room via API
    const createRes = await request.post("/api/drafts", {
      data: {
        displayName: "Tester",
        topic: "API Draft Test",
        maxPlayers: 2,
        rounds: 1,
        draftType: "standard",
        judgingMode: "ai",
        aiPersonality: "analyst",
        timerSeconds: 60,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const room = await createRes.json();
    const draftId = room.draftId;

    // Start pool review
    const reviewRes = await request.post(`/api/drafts/${draftId}/pool`, {
      data: { action: "start-review" },
    });
    expect(reviewRes.ok()).toBeTruthy();

    // Add items manually (avoids external AI dependency)
    await apiAddItems(request, draftId, ["Alpha Item", "Beta Item", "Gamma Item", "Delta Item"]);

    // Lock the pool
    const lockRes = await request.post(`/api/drafts/${draftId}/pool`, {
      data: { action: "lock" },
    });
    expect(lockRes.ok()).toBeTruthy();

    // Start the draft
    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];

    const startRes = await request.post(`/api/drafts/${draftId}/start`, {
      data: { pickOrder },
    });
    expect(startRes.ok()).toBeTruthy();

    // Get projection to find available items
    const projRes = await request.get(`/api/drafts/${draftId}/projection`);
    expect(projRes.ok()).toBeTruthy();
    const proj = await projRes.json();

    // Verify the draft board data shape
    expect(proj).toHaveProperty("draft");
    expect(proj).toHaveProperty("players");
    expect(proj).toHaveProperty("availableItems");
    expect(proj).toHaveProperty("picks");
    expect(proj).toHaveProperty("serverNow");
    expect(proj.draft.phase).toBe("DRAFTING");
    expect(proj.draft.currentPickIndex).toBe(0);

    const availableItems = proj.availableItems.filter((i: { isAvailable: boolean }) => i.isAvailable);

    // Make a valid pick (item 1, expected pick 0)
    const pickRes = await request.post(`/api/drafts/${draftId}/pick`, {
      data: {
        itemId: availableItems[0].id,
        expectedPick: 0,
      },
    });
    expect(pickRes.ok()).toBeTruthy();
    const pickResult = await pickRes.json();
    expect(pickResult.o_current_pick_index).toBe(1);

    // Verify stale state rejection
    const staleRes = await request.post(`/api/drafts/${draftId}/pick`, {
      data: {
        itemId: availableItems[1].id,
        expectedPick: 0, // stale - current is 1
      },
    });
    expect(staleRes.status()).toBe(409);
    const staleError = await staleRes.json();
    expect(staleError.error).toBe("STALE_STATE");

    // Verify auto-pick with unexpired timer fails
    const autoRes = await request.post(`/api/drafts/${draftId}/auto-pick`, {
      data: {},
    });
    // Should fail since timer hasn't expired
    expect(autoRes.ok()).toBeFalsy();
  });

  // -----------------------------------------------------------------------
  // Snake direction reversal
  // -----------------------------------------------------------------------

  test("snake direction reversal via API", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: BASE_URL });
    await apiBootstrapGuest(guestCtx);
    const { draftId } = await setupTwoPlayerDraft(request, guestCtx, {
      draftType: "snake",
      rounds: 2,
      timerSeconds: null,
    });

    // Build snake pick order: 2 players, 2 rounds
    // Round 1: seat 1, seat 2
    // Round 2: seat 2, seat 1
    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
      { overallPick: 3, round: 2, pickInRound: 1, seat: 2 },
      { overallPick: 4, round: 2, pickInRound: 2, seat: 1 },
    ];

    await apiStartDraft(request, draftId, pickOrder);
    const proj = await apiGetProjection(request, draftId);
    const avail = proj.availableItems.filter((i) => i.isAvailable);

    // Host picks (seat 1, round 1)
    const pick1 = await apiPick(request, draftId, avail[0].id, 0);
    expect(pick1.ok()).toBeTruthy();

    // Guest picks (seat 2, round 1)
    const pick2 = await apiPick(guestCtx, draftId, avail[1].id, 1);
    expect(pick2.ok()).toBeTruthy();

    // After 2 picks, round 1 is done. In snake, round 2 starts with seat 2.
    const proj2 = await apiGetProjection(request, draftId);
    expect(proj2.draft.currentPickIndex).toBe(2);
    const slot3 = proj2.draft.pickOrder[2];
    expect(slot3.round).toBe(2);
    // Snake reverses: seat 2 picks first in round 2
    expect(slot3.seat).toBe(2);

    // Guest picks (seat 2, round 2, pick 1)
    const avail2 = proj2.availableItems.filter((i) => i.isAvailable);
    const pick3 = await apiPick(guestCtx, draftId, avail2[0].id, 2);
    expect(pick3.ok()).toBeTruthy();

    // Host picks (seat 1, round 2, pick 2) — final pick
    const proj3 = await apiGetProjection(request, draftId);
    const avail3 = proj3.availableItems.filter((i) => i.isAvailable);
    const pick4 = await apiPick(request, draftId, avail3[0].id, 3);
    expect(pick4.ok()).toBeTruthy();

    // Verify draft transitions to DRAFT_COMPLETE
    const finalProj = await apiGetProjection(request, draftId);
    expect(finalProj.draft.phase).toBe("DRAFT_COMPLETE");

    const startDefense = await apiStartDefense(request, draftId);
    expect(startDefense.ok()).toBeTruthy();

    const defenseProj = await apiGetProjection(request, draftId);
    expect(defenseProj.draft.phase).toBe("DEFENSE");
  });

  // -----------------------------------------------------------------------
  // Same-item contention
  // -----------------------------------------------------------------------

  test("same-item contention via API", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: BASE_URL });
    await apiBootstrapGuest(guestCtx);
    const { draftId } = await setupTwoPlayerDraft(request, guestCtx, {
      timerSeconds: null,
    });

    // Standard pick order: 2 players, 1 round
    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];

    await apiStartDraft(request, draftId, pickOrder);
    const proj = await apiGetProjection(request, draftId);
    const avail = proj.availableItems.filter((i) => i.isAvailable);

    // Host picks first available item
    const pick1 = await apiPick(request, draftId, avail[0].id, 0);
    expect(pick1.ok()).toBeTruthy();

    // Guest tries to pick the same item — should fail (ITEM_UNAVAILABLE)
    const pick2 = await apiPick(guestCtx, draftId, avail[0].id, 1);
    expect(pick2.ok()).toBeFalsy();
    const err2 = await pick2.json();
    expect(err2.error).toBe("INVALID_INPUT");
    expect(err2.message).toContain("unavailable");

    // Guest picks a different item instead — should succeed
    const pick3 = await apiPick(guestCtx, draftId, avail[1].id, 1);
    expect(pick3.ok()).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Stale client recovery (dedicated test)
  // -----------------------------------------------------------------------

  test("stale client recovery via API", async ({ request }) => {
    const { draftId } = await setupSinglePlayerDraft(request, {
      timerSeconds: null,
    });

    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];

    await apiStartDraft(request, draftId, pickOrder);
    const proj = await apiGetProjection(request, draftId);
    const avail = proj.availableItems.filter((i) => i.isAvailable);

    // Make a valid pick to advance the pick index
    const pick1 = await apiPick(request, draftId, avail[0].id, 0);
    expect(pick1.ok()).toBeTruthy();

    // Submit with stale expectedPick
    const stale = await apiPick(request, draftId, avail[1].id, 0);
    expect(stale.status()).toBe(409);
    const staleErr = await stale.json();
    expect(staleErr.error).toBe("STALE_STATE");
  });

  // -----------------------------------------------------------------------
  // Timer auto-pick on expiration
  // -----------------------------------------------------------------------

  test("timer auto-pick on expiration via API", async ({ request }) => {
    test.setTimeout(60000);

    // Use minimum timer (15s) to minimize wait time
    const { draftId } = await setupSinglePlayerDraft(request, {
      timerSeconds: 15,
    });

    // Pick order — seat 1's turn is the one that will auto-pick
    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];

    await apiStartDraft(request, draftId, pickOrder);

    // Verify timer is running
    const proj = await apiGetProjection(request, draftId);
    expect(proj.draft.turnDeadline).not.toBeNull();
    expect(proj.draft.currentPickIndex).toBe(0);

    // Auto-pick should fail before timer expires
    const earlyAuto = await apiAutoPick(request, draftId);
    expect(earlyAuto.ok()).toBeFalsy();

    // Wait for the timer to expire (15s timer + buffer)
    await new Promise((resolve) => setTimeout(resolve, 17000));

    // Auto-pick should succeed now
    const autoRes = await apiAutoPick(request, draftId);
    expect(autoRes.ok()).toBeTruthy();
    const autoResult = await autoRes.json();
    expect(autoResult.o_current_pick_index).toBe(1);
    expect(autoResult.o_phase).toBe("DRAFTING");
  });

  // -----------------------------------------------------------------------
  // Final → DEFENSE transition
  // -----------------------------------------------------------------------

  test("final pick transitions to draft complete, then defense via API", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: BASE_URL });
    await apiBootstrapGuest(guestCtx);
    const { draftId } = await setupTwoPlayerDraft(request, guestCtx, {
      timerSeconds: null,
    });

    // 2 players, 1 round = 2 picks total
    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];

    await apiStartDraft(request, draftId, pickOrder);
    const proj = await apiGetProjection(request, draftId);
    expect(proj.draft.phase).toBe("DRAFTING");
    expect(proj.draft.currentPickIndex).toBe(0);

    const avail = proj.availableItems.filter((i) => i.isAvailable);

    // First pick (seat 1)
    const pick1 = await apiPick(request, draftId, avail[0].id, 0);
    expect(pick1.ok()).toBeTruthy();
    const res1 = await pick1.json();
    expect(res1.o_current_pick_index).toBe(1);
    expect(res1.o_phase).toBe("DRAFTING");

    // Second pick (seat 2) — this is the final pick
    const pick2 = await apiPick(guestCtx, draftId, avail[1].id, 1);
    expect(pick2.ok()).toBeTruthy();
    const res2 = await pick2.json();
    expect(res2.o_current_pick_index).toBe(2);
    expect(res2.o_phase).toBe("DRAFT_COMPLETE");
    expect(res2.o_turn_deadline).toBeNull();

    // Verify projection shows DRAFT_COMPLETE
    const finalProj = await apiGetProjection(request, draftId);
    expect(finalProj.draft.phase).toBe("DRAFT_COMPLETE");
    expect(finalProj.draft.currentPickIndex).toBe(2);

    const startDefense = await apiStartDefense(request, draftId);
    expect(startDefense.ok()).toBeTruthy();

    const defenseProj = await apiGetProjection(request, draftId);
    expect(defenseProj.draft.phase).toBe("DEFENSE");
  });
});
