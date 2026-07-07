import { afterEach, describe, expect, it } from "vitest";
import {
  loadSeenQuestionIds,
  recordSeenQuestionIds,
  saveSeenQuestionIds,
} from "@/lib/brain-dead/seen-questions";

describe("seen-questions", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("persists seen ids per category", () => {
    saveSeenQuestionIds("science", ["a", "b"]);
    expect(loadSeenQuestionIds("science")).toEqual(["a", "b"]);
    expect(loadSeenQuestionIds("history")).toEqual([]);
  });

  it("merges new ids without duplicates", () => {
    saveSeenQuestionIds("random", ["1", "2"]);
    const next = recordSeenQuestionIds("random", ["2", "3"]);
    expect(next).toEqual(["1", "2", "3"]);
  });
});
