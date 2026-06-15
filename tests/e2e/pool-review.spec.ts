import { test, expect, BrowserContext, Page } from "@playwright/test";

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

test.describe("Pool review flow", () => {
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

  test("host starts pool review and sees pool page", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Best Sci-Fi Movies",
      maxPlayers: 2,
      rounds: 2,
    });

    const roomCode = await extractRoomCode(hostPage);

    await joinRoom(guestPage, roomCode, "Bob");
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText("Generate with AI")).toBeVisible();
  });

  test("host can add manual items", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Test Pool",
      maxPlayers: 2,
      rounds: 1,
    });

    const roomCode = await extractRoomCode(hostPage);
    await joinRoom(guestPage, roomCode, "Bob");

    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });

    await hostPage.getByRole("button", { name: "Add manual item" }).click();
  });

  test("guest can submit suggestions", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Suggestion Test",
      maxPlayers: 2,
      rounds: 1,
    });

    const roomCode = await extractRoomCode(hostPage);
    await joinRoom(guestPage, roomCode, "Bob");
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(guestPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });

    const suggestInput = guestPage.getByLabel("Suggest item name");
    await expect(suggestInput).toBeVisible();
    await suggestInput.fill("My Cool Item");
    await guestPage.getByRole("button", { name: "Suggest" }).click();
  });
});
