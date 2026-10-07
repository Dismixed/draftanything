import { describe, expect, it } from "vitest";
import { summarizeChain } from "./result-summary";

const words = ["snow", "ball", "park", "bench"];

describe("summarizeChain", () => {
  it("marks the given first word as the start", () => {
    const { rows } = summarizeChain(words, ["solved", "active", "locked", "locked"], [[], [], [], []], []);

    expect(rows[0]).toEqual({ word: "snow", outcome: "start", label: "" });
  });

  it("labels a word typed correctly with no help as first try", () => {
    const { rows } = summarizeChain(words, ["solved", "solved", "active", "locked"], [[], ["ball"], [], []], []);

    expect(rows[1]).toEqual({ word: "ball", outcome: "solved", label: "first try" });
  });

  it("counts wrong guesses as misses and the remaining revealed letters as hints", () => {
    const summary = summarizeChain(
      words,
      ["solved", "solved", "solved", "solved"],
      [[], ["bowl", "ball"], ["park"], ["bench"]],
      [[], [false, true, false, false], [false, true, true, false], []],
    );

    expect(summary.rows[1].label).toBe("1 miss");
    expect(summary.rows[2].label).toBe("2 hints");
    expect(summary.misses).toBe(1);
    expect(summary.hints).toBe(2);
    expect(summary.solved).toBe(3);
    expect(summary.total).toBe(3);
  });

  it("joins misses and hints on the same word", () => {
    const { rows } = summarizeChain(
      words,
      ["solved", "solved", "active", "locked"],
      [[], ["bowl", "bill", "ball"], [], []],
      [[], [false, true, true, true], [], []],
    );

    expect(rows[1].label).toBe("2 misses, 1 hint");
  });

  it("separates the word the player ran out on from the ones never reached", () => {
    const summary = summarizeChain(
      words,
      ["solved", "solved", "active", "locked"],
      [[], ["ball"], ["pork", "pink"], []],
      [[], [], [false, true, true, false], []],
    );

    expect(summary.rows[2]).toEqual({ word: "park", outcome: "missed", label: "missed" });
    expect(summary.rows[3]).toEqual({ word: "bench", outcome: "unreached", label: "not reached" });
    expect(summary.solved).toBe(1);
    expect(summary.misses).toBe(2);
  });

  it("ignores case and spaces when deciding whether a guess was wrong", () => {
    const { rows } = summarizeChain(["ice", "cream"], ["solved", "solved"], [[], [" Cream "]], []);

    expect(rows[1].label).toBe("first try");
  });
});
