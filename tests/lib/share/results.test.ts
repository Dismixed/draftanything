import { describe, expect, it } from "vitest";
import {
  anyGuessrShare,
  ballKnowledgeShare,
  brainDeadShare,
  chainLinkShare,
  freezeFramesShare,
  gettingWarmerShare,
  hotTakesShare,
} from "@/lib/share/results";

const DATE = "2026-10-06";
const lines = (text: string) => text.split("\n");

describe("per-game share text", () => {
  it("Chain Link draws one square per link and never the words", () => {
    const text = chainLinkShare(
      ["solved", "solved", "solved", "active", "locked"],
      [[], ["ball"], ["pork", "park"], ["x"], []],
      DATE,
    );
    expect(lines(text)).toEqual([
      "Chain Link · Oct 6",
      "🟩🟨🟥🟥",
      "https://stimgames.com/chainlink?ref=share",
    ]);
    expect(text.toLowerCase()).not.toContain("ball");
  });

  it("Brain Dead shows the count, the score and where the run ended", () => {
    expect(lines(brainDeadShare(3, 4250, DATE))).toEqual([
      "Brain Dead · Oct 6",
      "3 of 15 · 4,250 pts",
      "✅✅✅❌",
      "https://stimgames.com/brain-dead/daily?ref=share",
    ]);
  });

  it("Brain Dead has no miss mark on a perfect run", () => {
    expect(lines(brainDeadShare(15, 9000, DATE))[2]).toBe("✅".repeat(15));
  });

  it("AnyGuessr grades each round without naming a country", () => {
    const text = anyGuessrShare([{ roundScore: 100 }, { roundScore: 40 }, { roundScore: 0 }], 140, DATE);
    expect(lines(text).slice(0, 3)).toEqual(["AnyGuessr · Oct 6", "140 pts", "🟩🟨🟥"]);
  });

  it("FreezeFrames marks each of the four rounds", () => {
    const text = freezeFramesShare(
      [{ correct: true }, { correct: true }, { correct: false }, { correct: true }],
      2310,
      DATE,
    );
    expect(lines(text)[1]).toBe("🎬✅ 🎵✅ 📺❌ 💿✅ · 2,310 pts");
  });

  it("FreezeFrames falls back to the score when round detail is missing", () => {
    expect(lines(freezeFramesShare(null, 2310, DATE))[1]).toBe("2,310 pts");
  });

  it("Ball Knowledge uses the category as its label", () => {
    expect(lines(ballKnowledgeShare("Dog breeds", 23)).slice(0, 2)).toEqual([
      "Ball Knowledge · Dog breeds",
      "I named 23 in 60 seconds",
    ]);
  });

  it("Hot Takes shares the S tier and never a percentage", () => {
    const text = hotTakesShare("Pizza toppings", ["Pepperoni", "Bacon"]);
    expect(lines(text).slice(0, 2)).toEqual(["Hot Takes · Pizza toppings", "My S tier: Pepperoni, Bacon"]);
    expect(text).not.toContain("%");
  });

  it("Hot Takes handles an empty S tier", () => {
    expect(lines(hotTakesShare("Pizza toppings", []))[1]).toBe("Nothing made my S tier");
  });

  it("Getting Warmer reports the guess count on a win", () => {
    expect(lines(gettingWarmerShare(true, 3, "❄️❄️🔥", DATE))[1]).toBe("❄️❄️🔥 Got it in 3 guesses");
    expect(lines(gettingWarmerShare(true, 1, "🔥", DATE))[1]).toBe("🔥 Got it in 1 guess");
  });

  it("Getting Warmer does not claim a win after giving up", () => {
    expect(lines(gettingWarmerShare(false, 6, "❄️❄️❄️", DATE))[1]).toBe("❄️❄️❄️ Didn't get it");
  });
});
