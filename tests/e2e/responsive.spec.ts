import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Viewport sizes
// ---------------------------------------------------------------------------

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bootstrapGuest(page: Page) {
  await page.request.post("/api/guest");
}

async function canCreateDraftRoom(page: Page): Promise<boolean> {
  await bootstrapGuest(page);
  const res = await page.request.post("/api/drafts", {
    data: {
      displayName: "Probe",
      topic: "Mobile probe",
      maxPlayers: 2,
      rounds: 1,
    },
  });
  return res.ok();
}

async function createRoom(page: Page, options: {
  displayName: string;
  topic: string;
  maxPlayers?: number;
  rounds?: number;
}) {
  const createPanel = page.locator("#panel-create");
  await page.goto("/draft-anything");
  await page.getByRole("tab", { name: "Create room" }).click();
  await createPanel.locator("#create-display-name").fill(options.displayName);
  await createPanel.locator("#create-topic").fill(options.topic);
  if (options.maxPlayers !== undefined) {
    await createPanel.locator("#create-max-players").fill(String(options.maxPlayers));
  }
  if (options.rounds !== undefined) {
    await createPanel.locator("#create-rounds").fill(String(options.rounds));
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
  const joinPanel = page.locator("#panel-join");
  await page.goto("/draft-anything");
  await page.getByRole("tab", { name: "Join room" }).click();
  await joinPanel.locator("#join-room-code").fill(roomCode);
  await joinPanel.locator("#join-display-name").fill(displayName);
  await page.getByRole("button", { name: "Join room" }).click();
  await page.waitForURL(/\/draft\/[A-Z2-9]{6}/);
}

async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasOverflow).toBe(false);
}

async function prepareChainlink(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("chainlink-tutorial-seen", "true");
    localStorage.removeItem("chainlink-v2");
  });
}

async function prepareBrainDeadDaily(page: Page) {
  await page.addInitScript(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.removeItem(`bd_daily_${today}`);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const MOBILE = VIEWPORTS.mobile;

const STATIC_PAGES = [
  { label: "Stim Games hub", path: "/" },
  { label: "Draft Anything lobby", path: "/draft-anything" },
  { label: "Chainlink hub", path: "/chainlink" },
  { label: "Chainlink daily", path: "/chainlink/daily", prepare: prepareChainlink },
  { label: "Chainlink unlimited", path: "/chainlink/unlimited", prepare: prepareChainlink },
  { label: "Brain Dead hub", path: "/brain-dead" },
  { label: "Brain Dead daily", path: "/brain-dead/daily", prepare: prepareBrainDeadDaily },
  { label: "Brain Dead freeplay picker", path: "/brain-dead/freeplay" },
  { label: "Brain Dead leaderboard", path: "/brain-dead/leaderboard" },
  { label: "Brain Dead freeplay game", path: "/brain-dead/freeplay/play?cat=random" },
] as const;

test.describe("All games — no horizontal overflow", () => {
  for (const [size, viewport] of Object.entries(VIEWPORTS)) {
    for (const pageDef of STATIC_PAGES) {
      test(`${pageDef.label} on ${size}`, async ({ browser }) => {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        if ("prepare" in pageDef && pageDef.prepare) {
          await pageDef.prepare(page);
        }
        await page.goto(pageDef.path);
        await page.waitForLoadState("domcontentloaded");
        await assertNoHorizontalOverflow(page);
        await context.close();
      });
    }
  }
});

test.describe("Mobile gameplay controls", () => {
  test("Chainlink daily shows guess input", async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    await prepareChainlink(page);
    await page.goto("/chainlink/daily");
    await expect(page.getByText("Starting word")).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await context.close();
  });

  test("Brain Dead freeplay shows answer buttons", async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    await page.goto("/brain-dead/freeplay/play?cat=random");
    const answers = page.locator(".bd-answers button");
    await expect(answers.first()).toBeVisible({ timeout: 15000 });
    await expect(answers).toHaveCount(4);
    await assertNoHorizontalOverflow(page);
    await context.close();
  });

  test("Draft Anything lobby form is usable on mobile", async ({ browser }) => {
    const context = await browser.newContext({ viewport: MOBILE });
    const page = await context.newPage();
    await bootstrapGuest(page);
    const createPanel = page.locator("#panel-create");
    await page.goto("/draft-anything");
    await expect(createPanel.locator("#create-display-name")).toBeVisible();
    await expect(createPanel.locator("#create-topic")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create room" })).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await context.close();
  });
});

test.describe("Responsive layout", () => {
  for (const [size, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${size} (${viewport.width}×${viewport.height})`, () => {
      let hostContext: BrowserContext;
      let hostPage: Page;

      test.beforeEach(async ({ browser }) => {
        hostContext = await browser.newContext({ viewport });
        hostPage = await hostContext.newPage();
        await bootstrapGuest(hostPage);
      });

      test.afterEach(async () => {
        await hostContext.close();
      });

      test("home page fits without horizontal overflow", async () => {
        await hostPage.goto("/");
        await assertNoHorizontalOverflow(hostPage);
      });

      test("draft-anything lobby fits without horizontal overflow", async () => {
        await hostPage.goto("/draft-anything");
        await assertNoHorizontalOverflow(hostPage);
      });

      test("lobby page fits without horizontal overflow", async () => {
        test.skip(!(await canCreateDraftRoom(hostPage)), "Draft API unavailable — start Supabase/Docker");
        await createRoom(hostPage, {
          displayName: "Alice",
          topic: "Responsive Lobby",
          maxPlayers: 4,
          rounds: 3,
        });
        await assertNoHorizontalOverflow(hostPage);
      });

      test("pool review page fits without horizontal overflow", async () => {
        test.skip(!(await canCreateDraftRoom(hostPage)), "Draft API unavailable — start Supabase/Docker");
        await createRoom(hostPage, {
          displayName: "Alice",
          topic: "Responsive Pool",
          maxPlayers: 2,
          rounds: 1,
        });
        const roomCode = await extractRoomCode(hostPage);
        const guestContext = await hostContext.browser()!.newContext({ viewport });
        const guestPage = await guestContext.newPage();
        await bootstrapGuest(guestPage);
        await joinRoom(guestPage, roomCode, "Bob");
        await hostPage.getByRole("button", { name: "Start draft" }).click();
        await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });
        await assertNoHorizontalOverflow(hostPage);
        await guestContext.close();
      });
    });
  }

  test.describe("Draft page horizontal overflow", () => {
    let hostContext: BrowserContext;
    let guestContext: BrowserContext;
    let hostPage: Page;
    let guestPage: Page;

    test.beforeEach(async ({ browser }) => {
      hostContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      hostPage = await hostContext.newPage();
      guestPage = await guestContext.newPage();
      await bootstrapGuest(hostPage);
      await bootstrapGuest(guestPage);
    });

    test.afterEach(async () => {
      await hostContext.close();
      await guestContext.close();
    });

    test("draft board has no overflow, mobile tabs, and turn controls visible on mobile", async () => {
      test.skip(!(await canCreateDraftRoom(hostPage)), "Draft API unavailable — start Supabase/Docker");
      await createRoom(hostPage, {
        displayName: "Alice",
        topic: "Draft Overflow",
        maxPlayers: 2,
        rounds: 1,
      });
      const roomCode = await extractRoomCode(hostPage);
      await joinRoom(guestPage, roomCode, "Bob");
      await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

      await hostPage.getByRole("button", { name: "Start draft" }).click();
      await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });

      // Add items and lock via UI
      for (const name of ["Alpha", "Beta"]) {
        hostPage.once("dialog", (dialog) => dialog.accept(name));
        await hostPage.getByRole("button", { name: "Add manual item" }).click();
      }

      const lockButton = hostPage.getByRole("button", { name: /lock pool/i });
      await expect(lockButton).not.toBeDisabled({ timeout: 5000 });
      await lockButton.click();
      await hostPage.getByRole("button", { name: "Confirm" }).click();

      // Reload to see drafting phase (pool lock auto-starts the draft)
      await hostPage.goto(`/draft/${roomCode}`);
      await expect(hostPage.getByText("Available Pool")).toBeVisible({ timeout: 5000 });

      await assertNoHorizontalOverflow(hostPage);

      await expect(hostPage.getByRole("navigation", { name: "Draft view tabs" })).toBeVisible();
      await expect(hostPage.locator('[aria-label="Current turn"]')).toBeVisible();
    });
  });
});
