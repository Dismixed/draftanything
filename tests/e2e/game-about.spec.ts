import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("About section below a game", () => {
  test("is in the raw HTML of the Hot Takes page, collapsed, with its questions", async ({ request }) => {
    const html = await (await request.get("/hot-takes")).text();

    expect(html).toContain("About Hot Takes");
    expect(html).toContain("<details open");
    expect(html).toContain("Is there a daily tier list game?");
    expect(html).toContain("Locking in ends the sorting");
    expect(html).toContain('"FAQPage"');
    expect(html).toContain("<title>Hot Takes: Tier List Daily Game | Stim Games</title>");
  });

  test("sits below the game and links to other dailies", async ({ page }) => {
    await page.goto("/hot-takes");

    const about = page.getByRole("region", { name: "About Hot Takes" });
    await expect(about).toBeVisible();
    await expect(about.getByTestId("game-about-more").getByRole("link")).toHaveCount(3);

    const box = await about.boundingBox();
    expect(box!.y).toBeGreaterThan(300);
  });
});

const ABOUT_PAGES = [
  "/chainlink",
  "/brain-dead",
  "/anyguessr",
  "/hot-takes",
  "/freezeframes/daily",
  "/ball-knowledge/daily",
  "/getting-warmer/daily",
  "/draft-anything",
  "/slippery-slope",
];

for (const theme of ["light", "dark"] as const) {
  test(`about sections have no serious accessibility violations in the ${theme} theme`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript((t) => localStorage.setItem("stim-theme", t), theme);
    const failures: string[] = [];

    for (const url of ABOUT_PAGES) {
      await page.goto(url);
      await page.locator(".game-about details").evaluateAll((all) => all.forEach((d) => d.setAttribute("open", "")));
      const results = await new AxeBuilder({ page }).include(".game-about").analyze();
      for (const violation of results.violations) {
        if (violation.impact === "serious" || violation.impact === "critical") {
          failures.push(`${url} ${violation.id} x${violation.nodes.length} (${violation.nodes[0].target.join(" ")})`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
}

