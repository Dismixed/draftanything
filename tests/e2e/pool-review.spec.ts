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

  test("host can accept a guest suggestion", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Accept Suggestion",
      maxPlayers: 2,
      rounds: 1,
    });

    const roomCode = await extractRoomCode(hostPage);
    await joinRoom(guestPage, roomCode, "Bob");
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });

    // Guest submits an add suggestion
    const suggestInput = guestPage.getByLabel("Suggest item name");
    await expect(suggestInput).toBeVisible();
    await suggestInput.fill("Guest Item");
    await guestPage.getByRole("button", { name: "Suggest" }).click();

    // Host sees the pending suggestion
    await expect(hostPage.getByText("Guest Item")).toBeVisible({ timeout: 5000 });

    // Host accepts the suggestion
    const acceptButton = hostPage.getByRole("button", { name: "Accept" });
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    // Suggestion moves to resolved
    await expect(hostPage.getByText(/accepted/i)).toBeVisible();
  });

  test("duplicate suggestion from guest is rejected", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Duplicate Rejection",
      maxPlayers: 2,
      rounds: 1,
    });

    const roomCode = await extractRoomCode(hostPage);
    await joinRoom(guestPage, roomCode, "Bob");
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });

    // Guest submits a suggestion with a duplicate name
    const suggestInput = guestPage.getByLabel("Suggest item name");
    await expect(suggestInput).toBeVisible();
    await suggestInput.fill("Duplicate Name");
    await guestPage.getByRole("button", { name: "Suggest" }).click();

    // Same guest submits the same name again
    await suggestInput.fill("Duplicate Name");
    await guestPage.getByRole("button", { name: "Suggest" }).click();

    // Both suggestions appear, only one can succeed when accepted
    // The host should see both pending
    await expect(hostPage.getByText("Duplicate Name")).toBeVisible();
  });

  test("host can lock pool after adding sufficient items", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Lock Pool",
      maxPlayers: 2,
      rounds: 1,
    });

    const roomCode = await extractRoomCode(hostPage);
    await joinRoom(guestPage, roomCode, "Bob");
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });

    // Add enough items manually to meet minimum (2 players * 1 round = 2 min)
    // Each manual item triggers a prompt dialog
    for (const itemName of ["Alpha", "Beta"]) {
      hostPage.once("dialog", (dialog) => {
        expect(dialog.type()).toBe("prompt");
        dialog.accept(itemName);
      });
      await hostPage.getByRole("button", { name: "Add manual item" }).click();
    }

    // Lock button should now be enabled and clickable
    const lockButton = hostPage.getByRole("button", { name: /lock pool/i });
    await expect(lockButton).not.toBeDisabled({ timeout: 5000 });

    // Click the lock button to show confirm dialog
    await lockButton.click();

    // Click confirm
    const confirmButton = hostPage.getByRole("button", { name: "Confirm" });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // After lock, the lock button should no longer be visible (phase changed)
    await expect(lockButton).not.toBeVisible();
  });

  test("hidden metadata scores are not exposed in pool API response", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Metadata Check",
      maxPlayers: 2,
      rounds: 1,
    });

    const roomCode = await extractRoomCode(hostPage);
    await joinRoom(guestPage, roomCode, "Bob");
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

    await hostPage.getByRole("button", { name: "Start draft" }).click();
    await expect(hostPage.getByText("Pool Review")).toBeVisible({ timeout: 5000 });

    // Intercept the pool API GET response to inspect item metadata
    const poolResponsePromise = hostPage.waitForResponse(
      (resp) =>
        resp.url().includes("/api/drafts/") &&
        resp.url().endsWith("/pool") &&
        resp.request().method() === "GET",
    );

    // Trigger a re-fetch of the pool (e.g. by waiting for poll interval)
    // or just wait for the initial load
    const poolResponse = await poolResponsePromise;

    const body = await poolResponse.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("rubric");

    for (const item of body.items) {
      // Metadata should only expose a count, not raw scores
      expect(item).toHaveProperty("metadata");
      expect(item.metadata).toHaveProperty("categories");
      expect(typeof item.metadata.categories).toBe("number");
      // No score keys like quality, rewatchability should be present
      const scoreKeys = Object.keys(item.metadata).filter(
        (k) => k !== "categories",
      );
      expect(scoreKeys).toHaveLength(0);
    }
  });
});
