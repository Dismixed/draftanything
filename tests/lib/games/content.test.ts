import { describe, expect, it } from "vitest";
import { GAME_CONTENT, buildFaqJsonLd, gameMetadata, wordCount } from "@/lib/games/content";
import { getGame, type GameId } from "@/lib/games/registry";

const written = Object.keys(GAME_CONTENT) as GameId[];

describe("game content", () => {
  it("exists for Hot Takes", () => {
    expect(written).toContain("hot-takes");
  });

  it.each(written)("%s is between 400 and 800 words", (id) => {
    const count = wordCount(GAME_CONTENT[id]!);
    expect(count).toBeGreaterThanOrEqual(400);
    expect(count).toBeLessThanOrEqual(800);
  });

  it.each(written)("%s has the required structure", (id) => {
    const content = GAME_CONTENT[id]!;
    expect(content.angle).not.toBe("");
    expect(content.sections.length).toBeGreaterThanOrEqual(3);
    expect(content.sections.length).toBeLessThanOrEqual(5);
    expect(content.sections[0].heading).toBe("How to play");
    expect(content.faq.length).toBeGreaterThanOrEqual(4);
    expect(content.faq.length).toBeLessThanOrEqual(6);
    for (const item of content.faq) expect(item.question.trim().endsWith("?")).toBe(true);
  });

  it.each(written)("%s has a title and description sized for search results", (id) => {
    const content = GAME_CONTENT[id]!;
    expect(content.title).toContain(getGame(id).name.split(" ")[0]);
    expect(content.title.length).toBeLessThanOrEqual(60);
    expect(content.description.length).toBeGreaterThanOrEqual(70);
    expect(content.description.length).toBeLessThanOrEqual(160);
  });

  it("makes no claim about other players in Hot Takes", () => {
    const text = JSON.stringify(GAME_CONTENT["hot-takes"]).toLowerCase();
    for (const word of ["crowd", "aligned", "consensus", "other players", "community"]) {
      expect(text, word).not.toContain(word);
    }
  });
});

describe("gameMetadata", () => {
  it("uses the content title and the canonical path", () => {
    const meta = gameMetadata("hot-takes");
    expect(meta.title).toBe(GAME_CONTENT["hot-takes"]!.title);
    expect(meta.alternates?.canonical).toBe("/hot-takes");
  });
});

describe("buildFaqJsonLd", () => {
  it("builds a FAQPage with one entry per question", () => {
    const jsonLd = buildFaqJsonLd("hot-takes");
    expect(jsonLd?.["@type"]).toBe("FAQPage");
    expect(jsonLd?.mainEntity).toHaveLength(GAME_CONTENT["hot-takes"]!.faq.length);
  });
});
