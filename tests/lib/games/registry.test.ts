import { describe, expect, it } from "vitest";
import { DAILY_GAMES, GAME_IDS, GAMES, getGame, isDailyGame } from "@/lib/games/registry";
import { GAME_BRANDS } from "@/lib/game-branding";
import { games as seoGames } from "@/lib/seo";
import { GAME_META } from "@/lib/streak/types";

describe("game registry", () => {
  it("has nine games, seven of them daily", () => {
    expect(GAME_IDS).toHaveLength(9);
    expect(DAILY_GAMES).toHaveLength(7);
    expect(GAMES.filter((game) => game.kind === "party").map((game) => game.id)).toEqual([
      "draft-anything",
      "slippery-slope",
    ]);
  });

  it("fills every field for every game", () => {
    for (const game of GAMES) {
      expect(game.name, game.id).not.toBe("");
      expect(game.brand.first + game.brand.second, game.id).toBe(game.name);
      expect(game.playHref, game.id).toMatch(/^\//);
      expect(game.canonicalPath, game.id).toMatch(/^\//);
      expect(game.category, game.id).not.toBe("");
      expect(game.blurb.length, game.id).toBeGreaterThan(10);
      expect(game.pitch.length, game.id).toBeGreaterThan(game.blurb.length);
      for (const value of Object.values(game.theme)) expect(value, game.id).not.toBe("");
      expect(game.seo.description.length, game.id).toBeGreaterThan(20);
    }
  });

  it("marks daily games consistently", () => {
    for (const id of GAME_IDS) {
      expect(isDailyGame(id)).toBe(getGame(id).kind === "daily");
    }
  });

  it("keeps the addresses games are played at today", () => {
    expect(getGame("chainlink").playHref).toBe("/chainlink");
    expect(getGame("brain-dead").playHref).toBe("/brain-dead/daily");
    expect(getGame("anyguessr").playHref).toBe("/anyguessr/daily");
    expect(getGame("hot-takes").playHref).toBe("/hot-takes");
    expect(getGame("freezeframes").playHref).toBe("/freezeframes/daily");
    expect(getGame("ball-knowledge").playHref).toBe("/ball-knowledge/daily");
    expect(getGame("getting-warmer").playHref).toBe("/getting-warmer/daily");
    expect(getGame("draft-anything").playHref).toBe("/draft-anything");
    expect(getGame("slippery-slope").playHref).toBe("/slippery-slope");
  });

  it("does not claim Hot Takes compares players", () => {
    const game = getGame("hot-takes");
    const text = `${game.blurb} ${game.pitch} ${game.seo.description}`.toLowerCase();
    expect(text).not.toContain("crowd");
    expect(text).not.toContain("everyone");
  });
});

describe("modules derived from the registry", () => {
  it("derives SEO entries in registry order with canonical paths", () => {
    expect(seoGames.map((game) => game.id)).toEqual([...GAME_IDS]);
    expect(seoGames.find((game) => game.id === "anyguessr")?.path).toBe("/anyguessr");
    expect(seoGames.find((game) => game.id === "brain-dead")?.path).toBe("/brain-dead");
  });

  it("derives streak metadata for every daily", () => {
    expect(Object.keys(GAME_META).sort()).toEqual([...DAILY_GAMES].sort());
    expect(GAME_META.chainlink.label).toBe("Chain Link");
    expect(GAME_META.chainlink.href).toBe("/chainlink");
    expect(GAME_META["hot-takes"].theme.accent).toBe("var(--ht-accent)");
  });

  it("derives brands for every game, including Draft Anything", () => {
    expect(GAME_BRANDS.chainlink).toEqual({ first: "Chain ", second: "Link", color: "#c9b458" });
    expect(GAME_BRANDS["draft-anything"].second).toBe("Anything");
  });
});
