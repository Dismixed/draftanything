import { describe, expect, it } from "vitest";
import { LINEUP_ROUNDS, pickLineup, type LineupClue, type LineupDay } from "@/lib/anyguessr/lineup";

const clue = (country: number, clueType: string, difficulty: LineupClue["difficulty"] = "medium"): LineupClue => ({
  puzzleId: `c${country}`,
  clueType,
  difficulty,
});

/**
 * `countries` countries, each with a flag and one clue of every other type.
 * Difficulty cycles by country so every level is well represented.
 */
function pool(countries: number, types = ["landmark", "environment", "food", "person", "brand", "wildlife", "written_language"]): LineupClue[] {
  const levels: LineupClue["difficulty"][] = ["easy", "medium", "hard"];
  const clues: LineupClue[] = [];
  for (let c = 1; c <= countries; c++) {
    clues.push(clue(c, "flag", "easy"));
    types.forEach((type, t) => clues.push(clue(c, type, levels[(c + t) % 3])));
  }
  return clues;
}

const day = (date: string, rounds: LineupClue[]): LineupDay => ({ date, rounds });

describe("pickLineup", () => {
  it("returns seven rounds starting with a flag", () => {
    const lineup = pickLineup(pool(30), "2026-10-20", [])!;
    expect(lineup).toHaveLength(LINEUP_ROUNDS);
    expect(lineup[0].clueType).toBe("flag");
    expect(lineup.slice(1).some((r) => r.clueType === "flag")).toBe(false);
  });

  it("uses a different country in every round", () => {
    const lineup = pickLineup(pool(30), "2026-10-20", [])!;
    expect(new Set(lineup.map((r) => r.puzzleId)).size).toBe(LINEUP_ROUNDS);
  });

  it("follows the difficulty curve, easiest first", () => {
    const lineup = pickLineup(pool(30), "2026-10-20", [])!;
    expect(lineup.map((r) => r.difficulty)).toEqual(["easy", "easy", "medium", "medium", "medium", "hard", "hard"]);
  });

  it("uses at most two rounds of one type, and at most three places", () => {
    for (const date of ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"]) {
      const lineup = pickLineup(pool(30), date, [])!;
      const count = (types: string[]) => lineup.filter((r) => types.includes(r.clueType)).length;
      expect(count(["landmark", "environment"]), date).toBeLessThanOrEqual(3);
      for (const type of ["food", "person", "brand", "wildlife", "written_language"]) {
        expect(count([type]), `${date} ${type}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("gives the same lineup for the same date and a different one for another date", () => {
    const a = pickLineup(pool(30), "2026-10-20", []);
    expect(pickLineup(pool(30), "2026-10-20", [])).toEqual(a);
    expect(pickLineup(pool(30), "2026-10-21", [])).not.toEqual(a);
  });

  it("avoids countries shown in recent days when others are available", () => {
    const yesterday = pickLineup(pool(30), "2026-10-19", [])!;
    const today = pickLineup(pool(30), "2026-10-20", [day("2026-10-19", yesterday)])!;
    const repeated = today.filter((r) => yesterday.some((y) => y.puzzleId === r.puzzleId));
    expect(repeated).toEqual([]);
  });

  it("goes a week without repeating a country when the pool is large enough", () => {
    const history: LineupDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = `2026-10-${String(10 + i).padStart(2, "0")}`;
      history.push(day(date, pickLineup(pool(60), date, history)!));
    }
    const shown = history.flatMap((d) => d.rounds.map((r) => r.puzzleId));
    expect(new Set(shown).size).toBe(shown.length);
  });

  it("still fills seven rounds when a difficulty level is missing", () => {
    const noHard = pool(30).map((c) => (c.difficulty === "hard" ? { ...c, difficulty: "medium" as const } : c));
    const lineup = pickLineup(noHard, "2026-10-20", [])!;
    expect(lineup).toHaveLength(LINEUP_ROUNDS);
    expect(lineup.some((r) => r.difficulty === "hard")).toBe(false);
  });

  it("still fills seven rounds when only places are available", () => {
    const lineup = pickLineup(pool(30, ["landmark", "environment"]), "2026-10-20", [])!;
    expect(lineup).toHaveLength(LINEUP_ROUNDS);
  });

  it("never uses the retired currency and jersey clues", () => {
    const withRetired = [...pool(30), ...Array.from({ length: 30 }, (_, i) => clue(i + 1, "currency", "easy")), ...Array.from({ length: 30 }, (_, i) => clue(i + 1, "jersey", "easy"))];
    for (const date of ["2026-10-20", "2026-10-21", "2026-10-22"]) {
      const lineup = pickLineup(withRetired, date, [])!;
      expect(lineup.some((r) => r.clueType === "currency" || r.clueType === "jersey")).toBe(false);
    }
  });

  it("returns nothing when there are too few countries for a game", () => {
    expect(pickLineup(pool(6), "2026-10-20", [])).toBeNull();
  });

  it("returns nothing when no flag is available", () => {
    expect(pickLineup(pool(30).filter((c) => c.clueType !== "flag"), "2026-10-20", [])).toBeNull();
  });
});
