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

async function assertNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasOverflow).toBe(false);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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

      test("lobby page fits without horizontal overflow", async () => {
        await createRoom(hostPage, {
          displayName: "Alice",
          topic: "Responsive Lobby",
          maxPlayers: 4,
          rounds: 3,
        });
        await assertNoHorizontalOverflow(hostPage);
      });

      test("pool review page fits without horizontal overflow", async () => {
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

    test("draft board has no overflow and turn controls are visible on mobile", async ({ request }) => {
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

      // Current turn / pick controls should be visible
      const currentTurn = hostPage.locator('[aria-label="Current turn"]');
      await expect(currentTurn).toBeVisible();
    });
  });
});
