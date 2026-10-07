import { expect, test } from "@playwright/test";

test.describe("About section below a game", () => {
  test("is in the raw HTML of the Hot Takes page, collapsed, with its questions", async ({ request }) => {
    const html = await (await request.get("/hot-takes")).text();

    expect(html).toContain("About Hot Takes");
    expect(html).toContain("<details open");
    expect(html).toContain("Is there a daily tier list game?");
    expect(html).toContain("Locking in is final for that day");
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
