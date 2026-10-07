import { describe, expect, it } from "vitest";
import { buildVisionPrompt, visionAccepts } from "@/lib/anyguessr/vision-filter";

describe("buildVisionPrompt", () => {
  const prompt = buildVisionPrompt({ clueType: "brand", country: "Egypt", wikiTitle: "EgyptAir" });

  it("tells the reviewer which country and clue it is judging", () => {
    expect(prompt).toContain("Country: Egypt");
    expect(prompt).toContain("Clue type: brand");
    expect(prompt).toContain("EgyptAir");
  });

  it("asks whether the image gives the country away in writing", () => {
    expect(prompt).toContain("shows_country_name");
    expect(prompt).toMatch(/name of the country/i);
  });

  it("does not ask about the country's name on a flag clue", () => {
    const flag = buildVisionPrompt({ clueType: "flag", country: "Egypt" });
    expect(flag).toContain("shows_country_name");
    expect(flag).toMatch(/flag clue/i);
  });
});

describe("visionAccepts", () => {
  const good = { pass: true, score: 0.9, reason: "", shows_country_name: false };

  it("accepts an image that passes with a high enough score", () => {
    expect(visionAccepts(good, 0.55)).toBe(true);
  });

  it("rejects an image that shows the country's name, however well it scores", () => {
    expect(visionAccepts({ ...good, shows_country_name: true }, 0.55)).toBe(false);
  });

  it("rejects a failed or low-scoring image", () => {
    expect(visionAccepts({ ...good, pass: false }, 0.55)).toBe(false);
    expect(visionAccepts({ ...good, score: 0.4 }, 0.55)).toBe(false);
  });
});
