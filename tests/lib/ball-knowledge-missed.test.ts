import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAnswerBank } from "@/lib/ball-knowledge/answer-banks";
import { getMissedAnswers } from "@/lib/ball-knowledge/missed";

vi.mock("@/lib/streak/storage", () => ({ recordDailyCompletion: vi.fn() }));

describe("Ball Knowledge missed answers", () => {
  it("lists every bank answer when nothing was accepted", () => {
    const bank = getAnswerBank("NBA Teams")!;
    expect(getMissedAnswers("NBA Teams", [])).toEqual(bank.map((e) => e.canonical));
  });

  it("leaves out the answers the player got", () => {
    const missed = getMissedAnswers("NBA Teams", ["Boston Celtics", "Utah Jazz"])!;
    expect(missed).not.toContain("Boston Celtics");
    expect(missed).not.toContain("Utah Jazz");
    expect(missed).toContain("Miami Heat");
    expect(missed).toHaveLength(getAnswerBank("NBA Teams")!.length - 2);
  });

  it("counts an answer the judge worded differently", () => {
    // The judge returns its own display form, which may be an alias rather than our canonical.
    expect(getMissedAnswers("NBA Teams", ["the Sixers"])).not.toContain("Philadelphia 76ers");
  });

  it("ignores accepted answers that are not on the list", () => {
    const bank = getAnswerBank("NBA Teams")!;
    expect(getMissedAnswers("NBA Teams", ["Seattle SuperSonics"])).toHaveLength(bank.length);
  });

  it("returns null for a category with no list", () => {
    expect(getMissedAnswers("Not A Category", [])).toBeNull();
  });
});

describe("Ball Knowledge saved result", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remembers the accepted answers", async () => {
    const { getDailyPlayed, saveDailyPlayed } = await import("@/lib/ball-knowledge/storage");
    saveDailyPlayed(2, "NBA Teams", ["Boston Celtics", "Utah Jazz"]);
    expect(getDailyPlayed()).toMatchObject({
      score: 2,
      category: "NBA Teams",
      accepted: ["Boston Celtics", "Utah Jazz"],
    });
  });
});
