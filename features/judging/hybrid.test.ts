import { describe, expect, it } from "vitest";

import {
  communityVoteShares,
  hybridScores,
  normalizeAiScore,
  resolveWinners,
  scaleToJudgingRange,
} from "./hybrid";

describe("normalizeAiScore", () => {
  it.each([0, 4.25, 10])("accepts %s on the 0..10 scale", (score) => {
    expect(normalizeAiScore(score)).toBe(score);
  });

  it.each([-1, 10.1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid score %s",
    (score) => {
      expect(() => normalizeAiScore(score)).toThrow();
    },
  );
});

describe("scaleToJudgingRange", () => {
  it("maps min and max scores to 0 and 10", () => {
    expect(scaleToJudgingRange({ p1: 12, p2: 24, p3: 18 })).toEqual({
      p1: 0,
      p2: 10,
      p3: 5,
    });
  });

  it("assigns 10 to every player when all scores tie", () => {
    expect(scaleToJudgingRange({ p1: 42, p2: 42 })).toEqual({
      p1: 10,
      p2: 10,
    });
  });

  it("leaves already-valid scores unchanged when in range", () => {
    expect(scaleToJudgingRange({ p1: 6, p2: 8 })).toEqual({ p1: 0, p2: 10 });
  });
});

describe("communityVoteShares", () => {
  const players = ["p1", "p2", "p3"];

  it("returns zero for every player when nobody votes", () => {
    expect(communityVoteShares(players, [])).toEqual({
      p1: 0,
      p2: 0,
      p3: 0,
    });
  });

  it("uses submitted votes as the denominator on a 0..10 scale", () => {
    expect(
      communityVoteShares(players, [
        { voterPlayerId: "p1", selectedPlayerId: "p2" },
        { voterPlayerId: "p2", selectedPlayerId: "p1" },
      ]),
    ).toEqual({ p1: 5, p2: 5, p3: 0 });
  });

  it("calculates unanimous voting", () => {
    expect(
      communityVoteShares(players, [
        { voterPlayerId: "p1", selectedPlayerId: "p2" },
        { voterPlayerId: "p3", selectedPlayerId: "p2" },
      ]),
    ).toEqual({ p1: 0, p2: 10, p3: 0 });
  });

  it("rejects duplicate voters", () => {
    expect(() =>
      communityVoteShares(players, [
        { voterPlayerId: "p1", selectedPlayerId: "p2" },
        { voterPlayerId: "p1", selectedPlayerId: "p3" },
      ]),
    ).toThrow(/duplicate/i);
  });

  it.each([
    [{ voterPlayerId: "outside", selectedPlayerId: "p1" }, /voter/i],
    [{ voterPlayerId: "p1", selectedPlayerId: "outside" }, /selected/i],
    [{ voterPlayerId: "p1", selectedPlayerId: "p1" }, /self/i],
  ])("rejects invalid vote %j", (vote, message) => {
    expect(() => communityVoteShares(players, [vote])).toThrow(message);
  });
});

describe("hybridScores", () => {
  it("combines 70% AI and 30% community without arbitrary rounding", () => {
    expect(hybridScores({ p1: 8 }, { p1: 5 })).toEqual({ p1: 7.1 });
  });

  it("rejects missing player keys in either input", () => {
    expect(() => hybridScores({ p1: 8, p2: 6 }, { p1: 5 })).toThrow(
      /player keys/i,
    );
  });
});

describe("resolveWinners", () => {
  it("treats fixed-point equivalent totals as tied", () => {
    expect(
      resolveWinners(
        { p1: 0.1 + 0.2, p2: 0.3 },
        { mode: "community" },
      ),
    ).toEqual(["p1", "p2"]);
  });

  it("keeps shared community winners", () => {
    expect(
      resolveWinners(
        { p1: 5, p2: 5, p3: 0 },
        { mode: "community" },
      ),
    ).toEqual(["p1", "p2"]);
  });

  it("prefers higher AI for equal hybrid totals", () => {
    expect(
      resolveWinners(
        { p1: 7, p2: 7 },
        {
          mode: "hybrid",
          aiScores: { p1: 8, p2: 7 },
          aggregateMetadata: { p1: 4, p2: 9 },
        },
      ),
    ).toEqual(["p1"]);
  });

  it("prefers higher aggregate metadata after equal hybrid AI", () => {
    expect(
      resolveWinners(
        { p1: 7, p2: 7 },
        {
          mode: "hybrid",
          aiScores: { p1: 8, p2: 8 },
          aggregateMetadata: { p1: 6, p2: 9 },
        },
      ),
    ).toEqual(["p2"]);
  });

  it("keeps shared hybrid winners after all tie breakers", () => {
    expect(
      resolveWinners(
        { p1: 7, p2: 7 },
        {
          mode: "hybrid",
          aiScores: { p1: 8, p2: 8 },
          aggregateMetadata: { p1: 9, p2: 9 },
        },
      ),
    ).toEqual(["p1", "p2"]);
  });

  it("uses fixed-point equality for hybrid AI and metadata tie breaks", () => {
    expect(
      resolveWinners(
        { p1: 7, p2: 7 },
        {
          mode: "hybrid",
          aiScores: { p1: 0.1 + 0.2, p2: 0.3 },
          aggregateMetadata: { p1: 0.1 + 0.2, p2: 0.3 },
        },
      ),
    ).toEqual(["p1", "p2"]);
  });

  it("validates hybrid tie-break maps before returning a sole winner", () => {
    expect(() =>
      resolveWinners(
        { p1: 9, p2: 8 },
        {
          mode: "hybrid",
          aiScores: { p1: 9 },
          aggregateMetadata: { p1: 9, p2: 8 },
        },
      ),
    ).toThrow(/player keys/i);

    expect(() =>
      resolveWinners(
        { p1: 9, p2: 8 },
        {
          mode: "hybrid",
          aiScores: { p1: 9, p2: 8 },
          aggregateMetadata: { p1: 9, p2: 11 },
        },
      ),
    ).toThrow(/metadata/i);
  });
});
