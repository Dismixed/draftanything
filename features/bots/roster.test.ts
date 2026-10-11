import { describe, expect, it } from "vitest";
import { BOT_ROSTER, nextBot, profileForStyle } from "./roster";

describe("nextBot", () => {
  it("deals Chalk into an empty room", () => {
    expect(nextBot([])).toMatchObject({ name: "Chalk", style: "chalk" });
  });

  it("deals the roster in order, skipping styles already seated", () => {
    const seated = [{ displayName: "Chalk", botStyle: "chalk" }];
    expect(nextBot(seated).style).toBe("specialist");
    expect(
      nextBot([...seated, { displayName: "Wildcard", botStyle: "wildcard" }]).style,
    ).toBe("specialist");
  });

  it("ignores humans when choosing a style", () => {
    expect(nextBot([{ displayName: "Josh", botStyle: null }]).style).toBe("chalk");
  });

  it("wraps to the first style when all five are seated, with a new name", () => {
    const all = BOT_ROSTER.map((b) => ({ displayName: b.name, botStyle: b.style }));
    expect(nextBot(all)).toMatchObject({ name: "Chalk II", style: "chalk" });
  });

  it("appends a numeral when a human already uses the name", () => {
    expect(nextBot([{ displayName: " chalk ", botStyle: null }])).toMatchObject({
      name: "Chalk II",
      style: "chalk",
    });
  });
});

describe("profileForStyle", () => {
  it("finds a profile and falls back to the first", () => {
    expect(profileForStyle("hipster").name).toBe("Hipster");
    expect(profileForStyle("nope").name).toBe("Chalk");
    expect(profileForStyle(null).name).toBe("Chalk");
  });
});
