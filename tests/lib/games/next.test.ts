import { describe, expect, it } from "vitest";
import { DAILY_GAMES, PUZZLE_GAMES, type DailyGameId } from "@/lib/games/registry";
import { nextDaily, remainingDailies } from "@/lib/games/next";

const played = (...ids: DailyGameId[]) => new Set<DailyGameId>(ids);

describe("nextDaily", () => {
  it("starts with the first game in the lineup when nothing is played", () => {
    expect(nextDaily(played())).toBe("chainlink");
  });

  it("skips played games in lineup order", () => {
    expect(nextDaily(played("chainlink", "brain-dead"))).toBe("anyguessr");
    expect(nextDaily(played("chainlink", "anyguessr"))).toBe("brain-dead");
  });

  it("goes back to the top when the last game in the lineup is the one just played", () => {
    expect(nextDaily(played("getting-warmer"))).toBe("chainlink");
  });

  it("returns null when everything is played", () => {
    expect(nextDaily(played(...DAILY_GAMES))).toBeNull();
  });

  it("never offers Hot Takes, and is done once the six puzzles are", () => {
    expect(nextDaily(played(...PUZZLE_GAMES))).toBeNull();
    expect(nextDaily(played("chainlink", "brain-dead", "anyguessr", "freezeframes", "ball-knowledge"))).toBe(
      "getting-warmer",
    );
  });
});

describe("remainingDailies", () => {
  it("lists the unplayed games after the next one, in lineup order", () => {
    expect(remainingDailies(played("chainlink", "brain-dead"))).toEqual([
      "freezeframes",
      "ball-knowledge",
      "getting-warmer",
    ]);
  });

  it("is empty when one game is left, and when none are", () => {
    expect(remainingDailies(played(...PUZZLE_GAMES.filter((id) => id !== "getting-warmer")))).toEqual([]);
    expect(remainingDailies(played(...DAILY_GAMES))).toEqual([]);
  });
});
