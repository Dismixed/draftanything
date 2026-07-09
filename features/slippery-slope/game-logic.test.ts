import { describe, expect, it } from "vitest";
import { pickQuestionFromPool } from "./game-logic";
import type { Question } from "@/components/slippery-slope/data";

const pool: Question[] = [
  { q: "Q1", a: ["A", "B", "C", "D"], c: 0, d: 2, cat: "Sports", topic: "NBA" },
  { q: "Q2", a: ["A", "B", "C", "D"], c: 0, d: 2, cat: "Sports", topic: "Soccer" },
  { q: "Q3", a: ["A", "B", "C", "D"], c: 0, d: 2, cat: "Sports", topic: "Tennis" },
];

describe("pickQuestionFromPool", () => {
  it("returns the same preview question for a fixed seed", () => {
    const first = pickQuestionFromPool(pool, 5, [], 3);
    const second = pickQuestionFromPool(pool, 5, [], 3);

    expect(first).toEqual(second);
    expect(first?.question.topic).toBe("NBA");
  });

  it("can return different preview questions for different seeds", () => {
    const a = pickQuestionFromPool(pool, 5, [], 1);
    const b = pickQuestionFromPool(pool, 5, [], 2);

    expect(a?.index).not.toBe(b?.index);
  });
});
