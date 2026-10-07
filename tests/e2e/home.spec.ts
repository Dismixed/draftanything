import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const DAILY_HREFS = [
  "/chainlink",
  "/brain-dead/daily",
  "/anyguessr/daily",
  "/hot-takes",
  "/freezeframes/daily",
  "/ball-knowledge/daily",
  "/getting-warmer/daily",
];

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

test.describe("Home page", () => {
  test("leads with the site name, a featured game and six lineup games", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Stim Games" })).toBeVisible();
    await expect(page.getByText("Seven free daily games. New puzzles every day.")).toBeVisible();
    await expect(page.getByTestId("home-featured")).toBeVisible();
    await expect(page.getByTestId("home-lineup").getByRole("link")).toHaveCount(6);
    await expect(page.getByTestId("home-progress")).toHaveText("7 new puzzles today");
    await expect(page.getByRole("heading", { name: "Play with friends" })).toBeVisible();
    await expect(page.getByText("Coming Soon")).toHaveCount(0);
  });

  test("the featured button opens a daily game", async ({ page }) => {
    await page.goto("/");
    const link = page.getByTestId("home-featured").getByRole("link");
    const href = await link.getAttribute("href");
    expect(DAILY_HREFS).toContain(href);

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test("the raw HTML links to every daily and both party games without JavaScript", async ({ request }) => {
    const html = await (await request.get("/")).text();

    for (const href of [...DAILY_HREFS, "/draft-anything", "/slippery-slope"]) {
      expect(html, href).toContain(`href="${href}"`);
    }
    expect(html).toContain("<title>Stim Games");
  });

  test("shows finished games as done and counts them", async ({ page }) => {
    await page.addInitScript(() => {
      const today = new Date().toISOString().slice(0, 10);
      const ids = ["chainlink", "brain-dead", "anyguessr", "freezeframes", "ball-knowledge", "hot-takes", "getting-warmer"];
      const games = Object.fromEntries(ids.map((id) => [id, { playDates: id === "chainlink" || id === "anyguessr" ? [today] : [] }]));
      localStorage.setItem("stim_daily_streaks", JSON.stringify({ version: 1, games }));
    });
    await page.goto("/");

    await expect(page.getByTestId("home-progress")).toHaveText("2 of 7 done today");
    await expect(page.getByText("✓ Done today")).toHaveCount(2);
  });

  test("has no serious or critical accessibility violations in the light theme", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("has no serious or critical accessibility violations in the dark theme", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("stim-theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await seriousViolations(page)).toEqual([]);
  });
});
