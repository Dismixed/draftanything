import { test, expect } from "@playwright/test";

test("sound toggle is visible on hub", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /mute sounds|unmute sounds/i });
  await expect(toggle).toBeVisible();
});

test("sound starts muted by default", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Unmute sounds" })).toBeVisible();
});

test("sound toggle persists label after click", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").click({ position: { x: 10, y: 10 } });
  const toggle = page.getByRole("button", { name: /mute sounds|unmute sounds/i });
  const before = await toggle.getAttribute("aria-label");
  await toggle.click();
  const after = await toggle.getAttribute("aria-label");
  expect(before).not.toBe(after);
});
