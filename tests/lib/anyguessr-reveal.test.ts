import { describe, expect, it } from "vitest";
import { COUNTRY_BORDERS, sharesBorder } from "@/lib/anyguessr/country-borders";
import { revealInk, revealText, revealTier, roundStreak, type RevealInput } from "@/lib/anyguessr/reveal";

const round = (extra: Partial<RevealInput> = {}): RevealInput => ({
  exact: false,
  roundScore: 10,
  distanceKm: 6000,
  answerCca3: "ESP",
  guessCca3: "JPN",
  ...extra,
});

describe("sharesBorder", () => {
  it("knows land neighbours, in both directions", () => {
    expect(sharesBorder("ESP", "PRT")).toBe(true);
    expect(sharesBorder("PRT", "ESP")).toBe(true);
    expect(sharesBorder("USA", "CAN")).toBe(true);
  });

  it("does not count sea crossings or distant countries", () => {
    expect(sharesBorder("PRT", "FRA")).toBe(false);
    expect(sharesBorder("JPN", "KOR")).toBe(false);
    expect(sharesBorder("ESP", null)).toBe(false);
  });

  it("is symmetric across the whole table", () => {
    for (const [a, list] of Object.entries(COUNTRY_BORDERS)) for (const b of list) expect(COUNTRY_BORDERS[b]).toContain(a);
  });
});

describe("revealTier", () => {
  it("sorts a round by how close it was", () => {
    expect(revealTier(round({ exact: true, guessCca3: "ESP", roundScore: 100 }))).toBe("exact");
    expect(revealTier(round({ guessCca3: "PRT", roundScore: 91 }))).toBe("neighbour");
    expect(revealTier(round({ guessCca3: "ITA", roundScore: 62 }))).toBe("close");
    expect(revealTier(round({ guessCca3: "GRC", roundScore: 35 }))).toBe("warm");
    expect(revealTier(round({ roundScore: 4 }))).toBe("far");
  });

  it("calls a neighbour a neighbour even when the score is low", () => {
    expect(revealTier(round({ answerCca3: "RUS", guessCca3: "CHN", roundScore: 20 }))).toBe("neighbour");
  });

  it("calls a given-up round skipped, ahead of everything else", () => {
    expect(revealTier(round({ surrendered: true, exact: true, roundScore: 100 }))).toBe("skipped");
  });
});

describe("revealText and revealInk", () => {
  it("words each tier", () => {
    expect(revealText("exact", 0)).toEqual({ banner: "Spot on", quip: "Straight to the pin." });
    expect(revealText("neighbour", 400).banner).toBe("Next door!");
  });

  it("only says the other side of the world when it was", () => {
    expect(revealText("far", 12000).quip).toBe("The other side of the world.");
    expect(revealText("far", 5000).quip).toBe("Not even close.");
  });

  it("inks a bullseye green, a miss red and the rest gold", () => {
    expect(revealInk("exact")).toBe("ok");
    expect(revealInk("neighbour")).toBe("accent");
    expect(revealInk("warm")).toBe("accent");
    expect(revealInk("far")).toBe("bad");
    expect(revealInk("skipped")).toBe("bad");
  });
});

describe("roundStreak", () => {
  const hit = { exact: false, roundScore: 80 };
  const miss = { exact: false, roundScore: 10 };

  it("counts the run of close rounds ending at the latest", () => {
    expect(roundStreak([miss, hit, hit, hit])).toEqual({ current: 3, broken: 0 });
    expect(roundStreak([{ exact: true, roundScore: 100 }])).toEqual({ current: 1, broken: 0 });
  });

  it("reports the run a miss just ended", () => {
    expect(roundStreak([hit, hit, hit, miss])).toEqual({ current: 0, broken: 3 });
    expect(roundStreak([miss, miss])).toEqual({ current: 0, broken: 0 });
  });

  it("does not let a skipped round keep a streak", () => {
    expect(roundStreak([hit, hit, { exact: false, surrendered: true, roundScore: 0 }])).toEqual({ current: 0, broken: 2 });
  });

  it("starts from nothing", () => {
    expect(roundStreak([])).toEqual({ current: 0, broken: 0 });
  });
});
