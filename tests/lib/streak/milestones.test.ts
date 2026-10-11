import { describe, expect, it } from "vitest";
import { milestoneLabel, milestonePips, nextMilestone } from "@/lib/streak/milestones";

describe("nextMilestone", () => {
  it("aims at a week first", () => {
    expect(nextMilestone(0)).toEqual({ target: 7, previous: 0, remaining: 7 });
    expect(nextMilestone(1)).toEqual({ target: 7, previous: 0, remaining: 6 });
    expect(nextMilestone(6)).toEqual({ target: 7, previous: 0, remaining: 1 });
  });

  it("moves to the next milestone once one is reached", () => {
    expect(nextMilestone(7)).toEqual({ target: 14, previous: 7, remaining: 7 });
    expect(nextMilestone(29)).toEqual({ target: 30, previous: 14, remaining: 1 });
    expect(nextMilestone(99)).toEqual({ target: 100, previous: 50, remaining: 1 });
  });

  it("has nothing left to aim at from 100 days", () => {
    expect(nextMilestone(100)).toBeNull();
    expect(nextMilestone(250)).toBeNull();
  });

  it("treats a negative or fractional streak as whole days from zero", () => {
    expect(nextMilestone(-3)).toEqual({ target: 7, previous: 0, remaining: 7 });
    expect(nextMilestone(2.9)).toEqual({ target: 7, previous: 0, remaining: 5 });
  });
});

describe("milestoneLabel", () => {
  it("names the short milestones and counts the long ones", () => {
    expect(milestoneLabel(7)).toBe("a full week");
    expect(milestoneLabel(14)).toBe("two weeks");
    expect(milestoneLabel(30)).toBe("30 days");
  });
});

describe("milestonePips", () => {
  it("fills one pip a day during the first week", () => {
    expect(milestonePips(1)).toBe(1);
    expect(milestonePips(4)).toBe(4);
  });

  it("shows progress between milestones after the first week", () => {
    expect(milestonePips(7)).toBe(0);
    expect(milestonePips(22)).toBe(3);
  });

  it("is full once there is no milestone left", () => {
    expect(milestonePips(100)).toBe(7);
  });
});
