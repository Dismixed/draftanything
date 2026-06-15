import { test, expect, BrowserContext, Page } from "@playwright/test";

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
// Tests
// ---------------------------------------------------------------------------

test.describe("Draft flow", () => {
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

    // Generate AI items or add items manually
    const addRes = await request.post(`/api/drafts/${draftId}/pool`, {
      data: {
        action: "generate",
        topic: "API Draft Test",
        targetCount: 4,
        existingItems: [],
      },
    });
    expect(addRes.ok()).toBeTruthy();
    const pool = await addRes.json();
    expect(pool.items.length).toBeGreaterThanOrEqual(2);

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
});
