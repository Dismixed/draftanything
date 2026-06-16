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
    ["Amélie", "ame\u0301lie"],
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

  it.each([
    "\u0000\u0007",
    "\u200b\u2060",
    "\u0301\u0327",
    "\u200b\u0301\u0000",
  ])("rejects invisible, control, or isolated-mark input %j", (input) => {
    expect(() => normalizeItemName(input)).toThrow(/letters or numbers/i);
  });

  it("strips controls, formats, and isolated marks around visible text", () => {
    expect(normalizeItemName("\u0301\u200bAlien\u0007\u0327")).toBe("alien");
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
