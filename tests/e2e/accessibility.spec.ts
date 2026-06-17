import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// Helpers
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
// axe scan helper
// ---------------------------------------------------------------------------

async function assertNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(seriousOrCritical).toEqual([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Accessibility", () => {
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

  test("home page has no serious/critical axe violations", async () => {
    await hostPage.goto("/");
    await assertNoSeriousViolations(hostPage);
  });

  test("lobby page has no serious/critical axe violations", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Accessibility Test",
      maxPlayers: 4,
      rounds: 3,
    });
    await assertNoSeriousViolations(hostPage);
  });

  test("pool review page has no serious/critical axe violations", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Pool A11Y",
      maxPlayers: 2,
      rounds: 1,
    });
    const roomCode = await extractRoomCode(hostPage);
    await joinRoom(guestPage, roomCode, "Bob");
    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });
    await assertNoSeriousViolations(hostPage);
  });

  test("draft board page has no serious/critical axe violations", async ({ request, playwright }) => {
    // Use API to set up a draft quickly
    const guestCtx = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    await guestCtx.post("/api/guest");

    const createRes = await request.post("/api/drafts", {
      data: {
        displayName: "Host",
        topic: "Draft A11Y",
        maxPlayers: 2,
        rounds: 1,
        draftType: "standard",
        judgingMode: "ai",
        aiPersonality: "analyst",
        timerSeconds: null,
      },
    });
    const room = await createRes.json();
    const { draftId, roomCode } = room;

    await guestCtx.post(`/api/drafts/by-code/${roomCode}/join`, {
      data: { displayName: "Guest" },
    });

    // Pool flow
    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "start-review" } });
    for (const name of ["Alpha", "Beta", "Gamma", "Delta"]) {
      await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "add-item", name } });
    }
    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "lock" } });

    // Start draft
    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];
    await request.post(`/api/drafts/${draftId}/start`, { data: { pickOrder } });

    // Navigate host to draft page
    await hostPage.goto(`/draft/${roomCode}`);
    await expect(hostPage.getByText("Available Pool")).toBeVisible({ timeout: 5000 });
    await assertNoSeriousViolations(hostPage);

    await guestCtx.dispose();
  });

  test("results page has no serious/critical axe violations", async ({ request, playwright }) => {
    // Create a complete draft
    const guestCtx = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    await guestCtx.post("/api/guest");

    const createRes = await request.post("/api/drafts", {
      data: {
        displayName: "Host",
        topic: "Results A11Y",
        maxPlayers: 2,
        rounds: 1,
        draftType: "standard",
        judgingMode: "ai",
        aiPersonality: "analyst",
        timerSeconds: null,
      },
    });
    const room = await createRes.json();
    const { draftId, roomCode } = room;

    await guestCtx.post(`/api/drafts/by-code/${roomCode}/join`, {
      data: { displayName: "Guest" },
    });

    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "start-review" } });
    for (const name of ["Alpha", "Beta", "Gamma", "Delta"]) {
      await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "add-item", name } });
    }
    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "lock" } });

    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];
    await request.post(`/api/drafts/${draftId}/start`, { data: { pickOrder } });

    // Complete picks
    const proj = await (await request.get(`/api/drafts/${draftId}/projection`)).json();
    const avail = proj.availableItems.filter((i: { isAvailable: boolean }) => i.isAvailable);
    await request.post(`/api/drafts/${draftId}/pick`, { data: { itemId: avail[0].id, expectedPick: 0 } });
    await guestCtx.post(`/api/drafts/${draftId}/pick`, { data: { itemId: avail[1].id, expectedPick: 1 } });

    await request.post(`/api/drafts/${draftId}/start-defense`);

    // Advance to COMPLETE
    await request.post(`/api/drafts/${draftId}/phase`, { data: { action: "advance" } });
    await request.post(`/api/drafts/${draftId}/phase`, { data: { action: "advance" } });
    await request.post("/api/ai/judge", { data: { draftId } });
    await request.post(`/api/drafts/${draftId}/phase`, { data: { action: "advance" } });

    await hostPage.goto(`/results/${draftId}`);
    await expect(hostPage.getByText("Draft Complete")).toBeVisible({ timeout: 5000 });
    await assertNoSeriousViolations(hostPage);

    await guestCtx.dispose();
  });

  test("keyboard flow: create room, lobby, pool with tab navigation", async () => {
    await hostPage.goto("/");
    await expect(hostPage.getByRole("tab", { name: "Create room" })).toBeVisible();

    // Tab through the create form fields
    await hostPage.keyboard.press("Tab");
    await hostPage.keyboard.press("Tab");

    const displayNameInput = hostPage.getByLabel("Your display name");
    await expect(displayNameInput).toBeFocused();
    await displayNameInput.fill("Alice");

    await hostPage.keyboard.press("Tab");
    const topicInput = hostPage.getByLabel("Draft topic");
    await expect(topicInput).toBeFocused();
    await topicInput.fill("Keyboard Test");

    // Tab to submit
    await hostPage.keyboard.press("Tab");
    await hostPage.keyboard.press("Tab");
    await hostPage.keyboard.press("Tab");
    await hostPage.keyboard.press("Tab");
    await hostPage.keyboard.press("Tab");

    const createBtn = hostPage.getByRole("button", { name: /create room/i });
    await expect(createBtn).toBeFocused();
    await hostPage.keyboard.press("Enter");
    await hostPage.waitForURL(/\/draft\/[A-Z2-9]{6}/);

    // Lobby should be keyboard navigable
    await expect(hostPage.getByText("Lobby")).toBeVisible();
  });

  test("timer has aria-live region", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    await guestCtx.post("/api/guest");

    const createRes = await request.post("/api/drafts", {
      data: {
        displayName: "Host",
        topic: "Timer Live",
        maxPlayers: 2,
        rounds: 1,
        draftType: "standard",
        judgingMode: "ai",
        aiPersonality: "analyst",
        timerSeconds: 60,
      },
    });
    const room = await createRes.json();
    const { draftId, roomCode } = room;

    await guestCtx.post(`/api/drafts/by-code/${roomCode}/join`, {
      data: { displayName: "Guest" },
    });

    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "start-review" } });
    for (const name of ["Alpha", "Beta", "Gamma", "Delta"]) {
      await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "add-item", name } });
    }
    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "lock" } });

    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];
    await request.post(`/api/drafts/${draftId}/start`, { data: { pickOrder } });

    await hostPage.goto(`/draft/${roomCode}`);
    await expect(hostPage.getByText("Available Pool")).toBeVisible({ timeout: 5000 });

    // Timer should have aria-live="polite"
    const timer = hostPage.locator('[aria-label^="Turn timer:"]');
    await expect(timer).toBeVisible();
    await expect(timer).toHaveAttribute("aria-live", "polite");

    await guestCtx.dispose();
  });

  test("commentary has aria-live region", async ({ request, playwright }) => {
    const guestCtx = await playwright.request.newContext({ baseURL: "http://127.0.0.1:3000" });
    await guestCtx.post("/api/guest");

    const createRes = await request.post("/api/drafts", {
      data: {
        displayName: "Host",
        topic: "Commentary Live",
        maxPlayers: 2,
        rounds: 1,
        draftType: "standard",
        judgingMode: "ai",
        aiPersonality: "analyst",
        timerSeconds: null,
      },
    });
    const room = await createRes.json();
    const { draftId, roomCode } = room;

    await guestCtx.post(`/api/drafts/by-code/${roomCode}/join`, {
      data: { displayName: "Guest" },
    });

    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "start-review" } });
    for (const name of ["Alpha", "Beta", "Gamma", "Delta"]) {
      await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "add-item", name } });
    }
    await request.post(`/api/drafts/${draftId}/pool`, { data: { action: "lock" } });

    const pickOrder = [
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
    ];
    await request.post(`/api/drafts/${draftId}/start`, { data: { pickOrder } });

    await hostPage.goto(`/draft/${roomCode}`);
    await expect(hostPage.getByText("AI Commentary")).toBeVisible({ timeout: 5000 });

    // Commentary section should have a visible aria-live region
    const commentarySection = hostPage.locator('[aria-label="AI Commissioner Commentary"]');
    await expect(commentarySection).toBeVisible();

    // There should be an aria-live region inside
    const liveRegion = commentarySection.locator('[aria-live="polite"]');
    await expect(liveRegion).toHaveAttribute("aria-live", "polite");

    await guestCtx.dispose();
  });
});
