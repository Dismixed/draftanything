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
const ROUND_TYPES = ["landmark", "environment", "food", "person", "brand", "wildlife", "written_language", "traditional_dress", "satellite"];

function pool(countries: number, types = ROUND_TYPES): LineupClue[] {
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

  it("shows the rounds easiest first", () => {
    const order = { easy: 0, medium: 1, hard: 2 };
    for (const date of ["2026-10-20", "2026-10-21", "2026-10-22"]) {
      const levels = pickLineup(pool(30), date, [])!.map((r) => order[r.difficulty]);
      expect(levels, date).toEqual([...levels].sort((a, b) => a - b));
    }
  });

  it("uses every kind of clue the pool offers before repeating one", () => {
    for (const date of ["2026-10-20", "2026-10-21", "2026-10-22"]) {
      const kinds = new Set(pickLineup(pool(30), date, [])!.map((r) => r.clueType));
      // A flag and six of the nine other kinds: seven rounds, seven kinds.
      expect(kinds.size, date).toBe(7);
    }
  });

  it("uses at most two rounds of one type when the pool has enough kinds", () => {
    // Three kinds for six rounds: two of each, landmark and environment counted apart.
    const clues = pool(30, ["landmark", "environment", "food"]);
    for (const date of ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"]) {
      const lineup = pickLineup(clues, date, [])!;
      for (const type of ["landmark", "environment", "food"]) {
        expect(lineup.filter((r) => r.clueType === type).length, `${date} ${type}`).toBe(2);
      }
    }
  });

  it("brings in a kind of clue the last week has not shown", () => {
    // A week of games drawn without satellite clues, then the pool gains them.
    const before = pool(60, ROUND_TYPES.filter((t) => t !== "satellite"));
    const history: LineupDay[] = [];
    for (let d = 13; d < 20; d++) {
      const date = `2026-10-${d}`;
      history.push(day(date, pickLineup(before, date, history)!));
    }
    const today = pickLineup(pool(60), "2026-10-20", history)!;
    expect(today.some((r) => r.clueType === "satellite")).toBe(true);
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

  it("does not repeat a country daily because it holds the only clue that fits a round", () => {
    // Plenty of places and food, but a single clue of any other type.
    const clues = [...pool(60, ["landmark", "food"]), clue(1, "brand", "hard")];
    const history: LineupDay[] = [];
    for (let d = 20; d < 26; d++) {
      const date = `2026-10-${d}`;
      history.push(day(date, pickLineup(clues, date, history)!));
    }
    const daysWithIt = history.filter((h) => h.rounds.some((r) => r.puzzleId === "c1")).length;
    expect(daysWithIt).toBeLessThanOrEqual(1);
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
