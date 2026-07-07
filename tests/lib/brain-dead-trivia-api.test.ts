import { describe, expect, it } from "vitest";
import {
  appendUniqueQuestions,
  formatCategory,
  orderQuestionsByDifficulty,
  transformQuestion,
  type TriviaApiTextChoiceQuestion,
  type TransformedQuestion,
} from "@/lib/brain-dead/trivia-api";

const sampleQuestion: TriviaApiTextChoiceQuestion = {
  id: "abc123",
  category: "geography",
  difficulty: "easy",
  type: "text_choice",
  question: { text: "What is the capital of France?" },
  correctAnswer: "Paris",
  incorrectAnswers: ["London", "Berlin", "Brussels"],
};

describe("trivia-api", () => {
  it("formats API categories into readable labels", () => {
    expect(formatCategory("film_and_tv")).toBe("Film & TV");
    expect(formatCategory("general_knowledge")).toBe("General Knowledge");
  });

  it("transforms a text choice question with shuffled answers", () => {
    const result = transformQuestion(sampleQuestion);

    expect(result.q).toBe("What is the capital of France?");
    expect(result.id).toBe("abc123");
    expect(result.a).toHaveLength(4);
    expect(result.a).toContain("Paris");
    expect(result.a[result.c]).toBe("Paris");
    expect(result.d).toBe(1);
    expect(result.cat).toBe("Geography");
  });

  it("orders by difficulty but shuffles within each tier", () => {
    const qs: TransformedQuestion[] = [
      { id: "1", q: "easy-a", a: [], c: 0, d: 1, cat: "A" },
      { id: "2", q: "easy-b", a: [], c: 0, d: 1, cat: "B" },
      { id: "3", q: "medium", a: [], c: 0, d: 2, cat: "C" },
      { id: "4", q: "hard", a: [], c: 0, d: 3, cat: "D" },
    ];

    const ordered = orderQuestionsByDifficulty(qs);
    expect(ordered.map((q) => q.d)).toEqual([1, 1, 2, 3]);
    expect(ordered.map((q) => q.q).sort()).toEqual([
      "easy-a",
      "easy-b",
      "hard",
      "medium",
    ]);

    const easyOrders = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const [first, second] = orderQuestionsByDifficulty(qs);
      easyOrders.add(`${first.q},${second.q}`);
    }
    expect(easyOrders.size).toBeGreaterThan(1);
  });

  it("appends only questions that are not already in the pool", () => {
    const existing: TransformedQuestion[] = [
      { id: "1", q: "Q1", a: [], c: 0, d: 1, cat: "A" },
    ];
    const incoming: TransformedQuestion[] = [
      { id: "1", q: "Q1", a: [], c: 0, d: 1, cat: "A" },
      { id: "2", q: "Q2", a: [], c: 0, d: 2, cat: "B" },
    ];

    expect(appendUniqueQuestions(existing, incoming)).toHaveLength(2);
    expect(appendUniqueQuestions(existing, incoming)[1].q).toBe("Q2");
  });
});
