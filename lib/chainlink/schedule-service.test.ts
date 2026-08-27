import { describe, expect, it } from "vitest";
import {
  pickNextCandidate,
  type ScheduleCandidate,
} from "./schedule-service";

function candidate(
  id: string,
  startLetter: string,
  difficulty: string,
  score: number,
): ScheduleCandidate {
  return { id, startLetter, difficulty, score };
}

describe("pickNextCandidate", () => {
  it("deprioritizes start letters seen in the recent window", () => {
    const a = candidate("a", "a", "easy", 100);
    const b = candidate("b", "b", "easy", 90);

    // "a" was just scheduled, so "b" wins despite the lower score.
    expect(pickNextCandidate([a, b], ["a"], null).id).toBe("b");
  });

  it("prefers a difficulty that differs from the previous day", () => {
    const easy = candidate("easy", "x", "easy", 100);
    const hard = candidate("hard", "y", "hard", 90);

    // Previous day was "easy", so "hard" balances better.
    expect(pickNextCandidate([easy, hard], [], "easy").id).toBe("hard");
  });

  it("tie-breaks by input order (score desc from the caller)", () => {
    const first = candidate("first", "x", "easy", 100);
    const second = candidate("second", "y", "easy", 90);

    // Equal fit (both novel letters, both novel difficulty) → first wins.
    expect(pickNextCandidate([first, second], [], null).id).toBe("first");
  });
});
