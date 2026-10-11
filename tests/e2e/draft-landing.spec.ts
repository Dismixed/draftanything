import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`landing page has no serious accessibility violations in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("stim-theme", t), theme);
    await page.goto("/draft-anything");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  });
}

test("start and join lead to the room screen on the right tab", async ({ page }) => {
  await page.goto("/draft-anything");
  await page.getByRole("link", { name: "Join a room" }).first().click();
  await expect(page).toHaveURL(/\/draft-anything\/play\?tab=join/);
  await expect(page.getByRole("tab", { name: /join room/i })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("link", { name: /draft anything/i }).click();
  await page.getByRole("link", { name: /Ultimate Comfort Foods/ }).first().click();
  await expect(page.locator("#create-topic")).toHaveValue("Ultimate Comfort Foods");
});

test("no horizontal scroll at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/draft-anything");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
