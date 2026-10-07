import { describe, expect, it } from "vitest";
import { planSeedChanges, type ClueProposal, type ExistingClue } from "@/lib/anyguessr/seed-plan";

const proposal = (clue_type: string, wiki_title: string, extra: Partial<ClueProposal> = {}): ClueProposal => ({
  cca3: "JPN",
  country: "Japan",
  clue_type,
  difficulty: "easy",
  note: "",
  wiki_title,
  ...extra,
});

const existing = (clue_type: string, status: string, wiki_title: string | null, text_content: string | null = null): ExistingClue => ({
  id: `JPN-${clue_type}`,
  cca3: "JPN",
  clue_type,
  status,
  wiki_title,
  text_content,
});

describe("planSeedChanges", () => {
  it("creates a draft for a clue that does not exist yet", () => {
    const plan = planSeedChanges([], [proposal("food", "Sushi")]);
    expect(plan.create).toEqual([proposal("food", "Sushi")]);
  });

  it("only sets the difficulty when the proposal keeps an existing clue", () => {
    const plan = planSeedChanges([existing("food", "approved", "Sushi")], [proposal("food", "Sushi")]);
    expect(plan.setDifficulty).toEqual([{ id: "JPN-food", difficulty: "easy" }]);
    expect(plan.create).toEqual([]);
    expect(plan.replace).toEqual([]);
    expect(plan.staged).toEqual([]);
  });

  it("treats titles that differ only in case or underscores as the same clue", () => {
    const plan = planSeedChanges([existing("environment", "approved", "Gamla stan")], [proposal("environment", "Gamla Stan")]);
    expect(plan.setDifficulty).toHaveLength(1);
    expect(plan.staged).toEqual([]);
  });

  it("replaces a clue that is not live yet", () => {
    const plan = planSeedChanges([existing("person", "needs_review", "Hokusai")], [proposal("person", "Hayao Miyazaki")]);
    expect(plan.replace).toEqual([{ id: "JPN-person", proposal: proposal("person", "Hayao Miyazaki") }]);
  });

  it("stages, rather than overwrites, a change to a clue players can currently see", () => {
    const plan = planSeedChanges([existing("person", "approved", "Hokusai")], [proposal("person", "Hayao Miyazaki")]);
    expect(plan.replace).toEqual([]);
    expect(plan.staged).toEqual([
      { id: "JPN-person", cca3: "JPN", clue_type: "person", from: "Hokusai", to: proposal("person", "Hayao Miyazaki") },
    ]);
  });

  it("stages the removal of a live optional clue the proposals left out", () => {
    const plan = planSeedChanges(
      [existing("brand", "approved", "Japan Airlines"), existing("food", "approved", "Sushi")],
      [proposal("food", "Sushi")],
    );
    expect(plan.staged).toEqual([
      { id: "JPN-brand", cca3: "JPN", clue_type: "brand", from: "Japan Airlines", to: null },
    ]);
  });

  it("rejects a non-live optional clue the proposals left out", () => {
    const plan = planSeedChanges(
      [existing("wildlife", "needs_review", "Grey wolf"), existing("food", "approved", "Sushi")],
      [proposal("food", "Sushi")],
    );
    expect(plan.reject).toEqual(["JPN-wildlife"]);
  });

  it("compares language clues by their text", () => {
    const text = proposal("written_language", "", { wiki_title: undefined, text: "お元気ですか" });
    const plan = planSeedChanges([existing("written_language", "approved", null, "寿司")], [text]);
    expect(plan.staged).toEqual([
      { id: "JPN-written_language", cca3: "JPN", clue_type: "written_language", from: "寿司", to: text },
    ]);
  });

  it("leaves flag, currency and jersey clues and unreviewed countries alone", () => {
    const plan = planSeedChanges(
      [
        existing("flag", "approved", null),
        existing("currency", "approved", "Japanese yen"),
        { ...existing("brand", "approved", "Qantas"), id: "AUS-brand", cca3: "AUS" },
      ],
      [proposal("food", "Sushi")],
    );
    expect(plan.staged).toEqual([]);
    expect(plan.reject).toEqual([]);
  });
});
