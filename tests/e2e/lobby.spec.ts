import { test, expect, BrowserContext, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bootstrapGuest(page: Page) {
  // Ensure a guest session cookie exists by calling the guest bootstrap endpoint
  await page.request.post("/api/guest");
}

async function createRoom(page: Page, options: {
  displayName: string;
  topic: string;
  maxPlayers?: number;
  rounds?: number;
}) {
  await page.goto("/");

  // The "Create room" tab should be active by default
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

  // Should navigate to the lobby page
  await page.waitForURL(/\/draft\/[A-Z2-9]{6}/);
}

async function extractRoomCode(page: Page): Promise<string> {
  // The room code is displayed in a <p> element inside the "Room code" section
  const codeEl = page.locator('[aria-labelledby="room-code-label"] p.font-mono');
  const text = await codeEl.innerText();
  return text.trim();
}

async function joinRoom(
  page: Page,
  roomCode: string,
  displayName: string,
) {
  await page.goto("/");
  await page.getByRole("tab", { name: "Join room" }).click();

  await page.getByLabel("Room code").fill(roomCode);
  await page.getByLabel("Your display name").fill(displayName);

  await page.getByRole("button", { name: "Join room" }).click();

  // Should navigate to the lobby page
  await page.waitForURL(/\/draft\/[A-Z2-9]{6}/);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Lobby flow", () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    // Two fully isolated browser contexts simulate two different users
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();

    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    // Bootstrap guest sessions
    await bootstrapGuest(hostPage);
    await bootstrapGuest(guestPage);
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test("host creates a room and sees the lobby", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Best Sci-Fi Movies",
      maxPlayers: 4,
      rounds: 3,
    });

    // Lobby heading should show the topic
    await expect(hostPage.getByRole("heading", { name: "Best Sci-Fi Movies" })).toBeVisible();

    // Room code should be displayed
    const code = await extractRoomCode(hostPage);
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    // Alice should appear in seat 1 with the host badge
    await expect(hostPage.getByText("Alice")).toBeVisible();
    await expect(hostPage.getByText("Host").first()).toBeVisible();
  });

  test("guest joins by code and both see two occupied seats", async () => {
    // Host creates room
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Best Board Games",
      maxPlayers: 4,
      rounds: 5,
    });

    const roomCode = await extractRoomCode(hostPage);

    // Guest joins
    await joinRoom(guestPage, roomCode, "Bob");

    // Guest sees both players
    await expect(guestPage.getByText("Alice")).toBeVisible();
    await expect(guestPage.getByText("Bob")).toBeVisible();

    // Host page should also show Bob after Realtime push or fallback poll
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 10000 });

    // Start button should now be enabled for the host (2 players)
    await expect(hostPage.getByRole("button", { name: "Start draft" })).toBeEnabled();
  });

  test("duplicate display name is rejected", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Pizza Toppings",
      maxPlayers: 4,
    });

    const roomCode = await extractRoomCode(hostPage);

    // Guest tries to join with the same name
    await guestPage.goto("/");
    await guestPage.getByRole("tab", { name: "Join room" }).click();
    await guestPage.getByLabel("Room code").fill(roomCode);
    await guestPage.getByLabel("Your display name").fill("Alice");
    await guestPage.getByRole("button", { name: "Join room" }).click();

    // Should show an error, not navigate
    await expect(
      guestPage.getByRole("alert"),
    ).toContainText("name is already taken", { ignoreCase: true });
  });

  test("seventh join is rejected when room is at six-seat capacity", async () => {
    // Create a 6-player room
    await createRoom(hostPage, {
      displayName: "Player1",
      topic: "Six Seats Full",
      maxPlayers: 6,
    });

    const roomCode = await extractRoomCode(hostPage);

    // Join with 5 more guests (players 2–6)
    for (let i = 2; i <= 6; i++) {
      const ctx = await hostContext.browser()!.newContext();
      const pg = await ctx.newPage();
      await bootstrapGuest(pg);
      await joinRoom(pg, roomCode, `Player${i}`);
      // We leave these contexts open; they'll be closed when hostContext.browser() does
      await ctx.close();
    }

    // Now the guestPage tries to join as the seventh player
    await guestPage.goto("/");
    await guestPage.getByRole("tab", { name: "Join room" }).click();
    await guestPage.getByLabel("Room code").fill(roomCode);
    await guestPage.getByLabel("Your display name").fill("LatePlayer");
    await guestPage.getByRole("button", { name: "Join room" }).click();

    // Should show a "room full" error
    await expect(
      guestPage.getByRole("alert"),
    ).toContainText("full", { ignoreCase: true });
  });

  test("start button is disabled until at least 2 players are in the room", async () => {
    await createRoom(hostPage, {
      displayName: "Alice",
      topic: "Solo Room Test",
      maxPlayers: 4,
    });

    // With only 1 player, the start button should be disabled / show "Need 1 more"
    const startBtn = hostPage.getByRole("button", { name: /start draft|need/i });
    await expect(startBtn).toBeDisabled();
  });
});
