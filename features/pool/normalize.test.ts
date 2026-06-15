import { describe, expect, it } from "vitest";

import {
  assertUniqueItems,
  normalizeItemName,
  poolTargetSize,
} from "./normalize";

describe("normalizeItemName", () => {
  it.each([
    ["  The   Matrix  ", "the matrix"],
    ["STAR WARS", "star wars"],
    ["Spider-Man: Homecoming!", "spider man homecoming"],
    ["Amélie", "amélie"],
    ["ＡＢＣ", "abc"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeItemName(input)).toBe(expected);
  });

  it("makes canonically equivalent Unicode collide", () => {
    expect(normalizeItemName("Am\u00e9lie")).toBe(
      normalizeItemName("Ame\u0301lie"),
    );
  });

  it("rejects names that become empty", () => {
    expect(() => normalizeItemName("... -- !!!")).toThrow();
  });
});

describe("assertUniqueItems", () => {
  it("rejects normalized duplicates rather than silently deduping", () => {
    expect(() =>
      assertUniqueItems(["Spider-Man", " spider man! ", "Batman"]),
    ).toThrow(/duplicate/i);
  });

  it("returns normally for unique items", () => {
    expect(() => assertUniqueItems(["Alien", "Aliens"])).not.toThrow();
  });
});

describe("poolTargetSize", () => {
  it("returns twice the number of draft picks", () => {
    expect(poolTargetSize(4, 5)).toBe(40);
  });

  it.each([
    [1, 1],
    [7, 1],
    [2.5, 1],
    [2, 0],
    [2, 11],
    [2, 1.5],
  ])("rejects invalid players=%s rounds=%s", (players, rounds) => {
    expect(() => poolTargetSize(players, rounds)).toThrow();
  });
});
