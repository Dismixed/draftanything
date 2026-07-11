import { describe, expect, it } from "vitest";
import { SITE_URL, buildGameJsonLd, buildHomeJsonLd, sitemapEntries } from "@/lib/seo";

describe("SEO metadata", () => {
  it("uses a stable production base URL", () => {
    expect(SITE_URL).toBe("https://stimgames.com");
  });

  it("includes the public game routes in the sitemap", () => {
    const urls = sitemapEntries.map((entry) => entry.url);

    expect(urls).toContain("https://stimgames.com/");
    expect(urls).toContain("https://stimgames.com/draft-anything");
    expect(urls).toContain("https://stimgames.com/chainlink");
    expect(urls).toContain("https://stimgames.com/anyguessr");
    expect(urls).toContain("https://stimgames.com/brain-dead");
  });

  it("builds homepage structured data with website, organization, FAQ, and game catalog", () => {
    const graph = buildHomeJsonLd()["@graph"];
    const types = graph.map((node) => node["@type"]);

    expect(types).toContain("WebSite");
    expect(types).toContain("Organization");
    expect(types).toContain("FAQPage");
    expect(types).toContain("ItemList");
  });

  it("builds game structured data for crawler-visible game facts", () => {
    const jsonLd = buildGameJsonLd("draft-anything");

    expect(jsonLd["@type"]).toBe("VideoGame");
    expect(jsonLd.name).toBe("Draft Anything");
    expect(jsonLd.url).toBe("https://stimgames.com/draft-anything");
    expect(jsonLd.playMode).toContain("MultiPlayer");
  });
});
