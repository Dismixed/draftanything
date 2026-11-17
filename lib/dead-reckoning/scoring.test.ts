import { describe, expect, it } from "vitest";
import { MAX_DAYS, PAR, closeness, dayStr, grade, quickerThan, totalDays } from "./scoring";

describe("grade", () => {
  it("scores by how close the guess is, either side", () => {
    expect(grade(100, 100).name).toBe("Dead Reckoning");
    expect(grade(110, 100).name).toBe("Dead Reckoning");
    expect(grade(91, 100).name).toBe("Dead Reckoning");
    expect(grade(120, 100).name).toBe("True North");
    expect(grade(80, 100).name).toBe("True North");
    expect(grade(150, 100).name).toBe("Land Ho");
    expect(grade(200, 100).name).toBe("Off Course");
    expect(grade(50, 100).name).toBe("Off Course");
    expect(grade(500, 100).name).toBe("Lost at Sea");
    expect(grade(501, 100).name).toBe("Adrift");
  });

  it("is becalmed for a blank", () => {
    expect(grade(null, 100)).toMatchObject({ name: "Becalmed", days: 5, index: 6 });
  });

  it("crosses in a day at best and four at worst", () => {
    expect(grade(100, 100).days).toBe(1);
    expect(grade(1e9, 100).days).toBe(4);
  });
});

describe("days at sea", () => {
  it("adds up the crossings", () => {
    expect(totalDays([100, 200, null], [100, 100, 100])).toBe(1 + 2.5 + 5);
    expect(PAR).toBe(7);
    expect(MAX_DAYS).toBe(35);
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

describe("closeness", () => {
  it("describes the miss", () => {
    expect(closeness(112, 100)).toBe("12% too high");
    expect(closeness(25, 100)).toBe("4× too low");
    expect(closeness(100, 100)).toBe("spot on");
    expect(closeness(null, 100)).toBe("you left it blank");
  });
});
