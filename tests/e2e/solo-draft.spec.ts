import { expect, test, type Page } from "@playwright/test";

/**
 * These create rooms, so they only run against a local database:
 *   E2E_LOCAL_DB=1 with the app started on local Supabase keys.
 * They also make real AI calls (pool generation, off-the-dome picks, judging).
 */
test.skip(process.env.E2E_LOCAL_DB !== "1", "needs a local database (E2E_LOCAL_DB=1)");
test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

const AI = 120_000;

async function startSolo(
  page: Page,
  options: { topic: string; opponents: number; rounds: number; offTheDome?: boolean },
) {
  await page.goto("/draft-anything/play?tab=solo");
  const panel = page.locator("#panel-solo");
  await panel.locator("#solo-topic").fill(options.topic);
  await panel.locator("#solo-display-name").fill("Josh");
  await panel.locator("#solo-opponents").fill(String(options.opponents));
  await panel.locator("#solo-rounds").fill(String(options.rounds));
  if (options.offTheDome) {
    await panel.getByRole("button", { name: "Off the Dome" }).click();
  }
  await panel.getByRole("button", { name: "Start solo draft" }).click();
  await page.waitForURL(/\/draft\/[A-Z0-9]{6}$/);
}

async function finishFromDraftComplete(page: Page, players: number) {
  await page.getByRole("button", { name: /Begin Defense/ }).click({ timeout: AI });
  await page.getByRole("button", { name: "Skip Defense" }).click();

  // AI drafters never hold up defense, and one human means the AI judge: no
  // voting step. Judging runs on its own and the results open.
  await expect(page.getByText("Final Rankings", { exact: true })).toBeVisible({ timeout: AI });
  await expect(page.getByText("Winner", { exact: true })).toBeVisible();
  await expect(page.getByLabel("AI drafter")).not.toHaveCount(0);
  expect(await page.getByLabel("AI drafter").count()).toBeGreaterThanOrEqual(players - 1);
}

test("solo, from a pool: AI drafters pick and the draft reaches results @local-db", async ({ page }) => {
  await startSolo(page, { topic: "Best pizza toppings", opponents: 2, rounds: 2 });

  // No waiting lobby: straight to the pool, with nobody to invite or chat with.
  await page.getByRole("button", { name: "Generate with AI" }).click();
  await page.getByRole("button", { name: /^Lock pool/ }).click({ timeout: AI });
  await page.getByRole("button", { name: "Confirm" }).click();

  // Seat 1 is the human; AI drafters take every turn in between.
  for (let round = 0; round < 2; round += 1) {
    await expect(page.getByText("Your turn").first()).toBeVisible({ timeout: AI });
    await page
      .getByRole("button", { name: /click to draft\.$/ })
      .first()
      .click();
    await expect(page.getByText("Your turn").first()).toBeHidden({ timeout: AI });
  }

  await finishFromDraftComplete(page, 3);
});

test("solo, off the dome: AI drafters invent their picks @local-db", async ({ page }) => {
  await startSolo(page, {
    topic: "Best heist movies",
    opponents: 2,
    rounds: 1,
    offTheDome: true,
  });

  // Straight into the draft: no lobby and no pool.
  const input = page.getByLabel("Pick item name");
  await expect(input).toBeEnabled({ timeout: AI });
  await input.fill("Heat");
  await input.press("Enter");

  await finishFromDraftComplete(page, 3);
});

test("friend room: the host fills a seat with an AI drafter and removes it @local-db", async ({ page }) => {
  await page.goto("/draft-anything/play");
  const panel = page.locator("#panel-create");
  await panel.locator("#create-topic").fill("Best road trip snacks");
  await panel.locator("#create-display-name").fill("Josh");
  await panel.locator("#create-max-players").fill("3");
  await panel.getByRole("button", { name: "Create room" }).click();
  await page.waitForURL(/\/draft\/[A-Z0-9]{6}$/);

  const start = page.getByRole("button", { name: /Commence Draft|Need \d more player/ });
  await expect(start).toBeDisabled();

  await page.getByRole("button", { name: "+ Add AI drafter" }).first().click();
  await expect(page.getByLabel("Seat 2 — Chalk")).toBeVisible();
  await expect(start).toBeEnabled();
  // One seat is still open, so the code is still worth sharing.
  await expect(page.getByText("Room code")).toBeVisible();

  await page.getByRole("button", { name: "Remove Chalk" }).click();
  await expect(page.getByLabel("Seat 2 — empty")).toBeVisible();
  await expect(start).toBeDisabled();
});
