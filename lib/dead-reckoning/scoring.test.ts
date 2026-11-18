import { describe, expect, it } from "vitest";
import { MAX_DAYS, MIN_DAYS, PAR, closeness, dayStr, earnsTreasure, grade, quickerThan, totalDays, treasureDays, voyage } from "./scoring";

describe("grade", () => {
  it("needs a guess within 1% for a Dead Reckoning", () => {
    expect(grade(100, 100).name).toBe("Dead Reckoning");
    expect(grade(101, 100).name).toBe("Dead Reckoning");
    expect(grade(99.1, 100).name).toBe("Dead Reckoning");
    expect(grade(150_000_000, 149_600_000).name).toBe("Dead Reckoning");
    expect(grade(102, 100).name).toBe("True North");
    expect(grade(31, 32).name).toBe("True North");
  });

  it("scores the rest by how close the guess is, either side", () => {
    expect(grade(110, 100).name).toBe("True North");
    expect(grade(91, 100).name).toBe("True North");
    expect(grade(120, 100).name).toBe("Land Ho");
    expect(grade(80, 100).name).toBe("Land Ho");
    expect(grade(150, 100).name).toBe("Off Course");
    expect(grade(200, 100).name).toBe("Lost at Sea");
    expect(grade(50, 100).name).toBe("Lost at Sea");
    expect(grade(500, 100).name).toBe("Adrift");
    expect(grade(501, 100).name).toBe("Shipwrecked");
  });

  it("is becalmed for a blank", () => {
    expect(grade(null, 100)).toMatchObject({ name: "Becalmed", days: 5, index: 7 });
  });

  it("crosses in a day at best and four and a half at worst", () => {
    expect(grade(100, 100).days).toBe(1);
    expect(grade(105, 100).days).toBe(2);
    expect(grade(1e9, 100).days).toBe(4.5);
  });
});

describe("days at sea", () => {
  it("adds up the crossings", () => {
    expect(totalDays([100, 200, null], [100, 100, 100])).toBe(1 + 3.5 + 5);
    expect(PAR).toBe(14);
    expect(MAX_DAYS).toBe(35);
    expect(MIN_DAYS).toBe(5);
  });

  it("writes days with halves", () => {
    expect(dayStr(1)).toBe("1 day");
    expect(dayStr(0.5)).toBe("½ days");
    expect(dayStr(2.5)).toBe("2½ days");
    expect(dayStr(13)).toBe("13 days");
  });

  it("works out how many took longer, with ties counting half", () => {
    expect(quickerThan(10, [8, 10, 12, 10])).toBe(50);
    expect(quickerThan(7, [9, 12])).toBe(100);
    expect(quickerThan(7, [])).toBeNull();
  });
});

describe("the treasure island", () => {
  const answers = [100, 100, 100, 100, 100, 100, 100];
  // Five Dead Reckonings and two True Norths: 5 + 4 = 9 days, under par.
  const under = [100, 100, 100, 100, 100, 105, 105];
  // All True North: 14 days, right on par, which is not under it.
  const onPar = [105, 105, 105, 105, 105, 105, 105];

  it("opens only for a voyage under par", () => {
    expect(earnsTreasure(13.5)).toBe(true);
    expect(earnsTreasure(14)).toBe(false);
    expect(voyage(onPar, answers, undefined, 50).treasure).toBe(false);
    expect(voyage(under, answers, undefined, 50).treasure).toBe(true);
  });

  it("takes two days off within 1%, one within 10%, and nothing for a miss", () => {
    expect(treasureDays(50, 50)).toBe(2);
    expect(treasureDays(54, 50)).toBe(1);
    expect(treasureDays(70, 50)).toBe(0);
    expect(treasureDays(null, 50)).toBe(0);
    expect(voyage(under, answers, 50, 50)).toEqual({ crossings: 9, treasure: true, saved: 2, days: 7 });
    expect(voyage(under, answers, 70, 50)).toEqual({ crossings: 9, treasure: true, saved: 0, days: 9 });
  });

  it("ignores a treasure guess the voyage did not earn", () => {
    expect(voyage(onPar, answers, 50, 50)).toEqual({ crossings: 14, treasure: false, saved: 0, days: 14 });
  });
});

describe("closeness", () => {
  it("describes the miss", () => {
    expect(closeness(112, 100)).toBe("12% too high");
    expect(closeness(25, 100)).toBe("4× too low");
    expect(closeness(100, 100)).toBe("spot on");
    expect(closeness(null, 100)).toBe("you left it blank");
  });
});
