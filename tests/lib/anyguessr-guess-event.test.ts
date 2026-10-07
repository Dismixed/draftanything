import { describe, expect, it } from "vitest";
import { guessEventProperties } from "@/lib/anyguessr/guess-event";

const result = { exact: true, distanceKm: 0, roundScore: 100 };

describe("guessEventProperties", () => {
  it("records whether the guess was the right country", () => {
    expect(guessEventProperties("p1", 3, result, "food").correct).toBe(true);
    expect(guessEventProperties("p1", 3, { ...result, exact: false }, "food").correct).toBe(false);
  });

  it("records the round's clue type, distance and score", () => {
    expect(guessEventProperties("p1", 3, { exact: false, distanceKm: 812.4, roundScore: 83 }, "food")).toEqual({
      puzzle_id: "p1",
      round_index: 3,
      clue_type: "food",
      correct: false,
      distance_km: 812,
      round_score: 83,
    });
  });

  it("ignores a clue type that is not a short plain word", () => {
    expect(guessEventProperties("p1", 0, result, "<script>").clue_type).toBeNull();
    expect(guessEventProperties("p1", 0, result, undefined).clue_type).toBeNull();
  });
});
