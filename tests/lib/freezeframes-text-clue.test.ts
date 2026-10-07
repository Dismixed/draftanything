import { describe, expect, it } from "vitest";
import { calcAvailablePoints, MAX_PTS, TEXT_CLUE_MAX_PTS } from "@/lib/freezeframes/game-logic";
import { toClientRound } from "@/lib/freezeframes/puzzle-service";
import { seedEntryToRoundJson } from "@/lib/freezeframes/seed-db";
import { clueLeaksAnswer } from "@/lib/freezeframes/text-clue";

describe("clueLeaksAnswer", () => {
  it("passes a clue that describes the song without naming it", () => {
    expect(clueLeaksAnswer("1976 disco hit about a 17-year-old on the dance floor.", "Dancing Queen")).toBe(false);
  });

  it("catches a clue that uses a word from the title", () => {
    expect(clueLeaksAnswer("A 1976 disco hit about a teenage queen of the dance floor.", "Dancing Queen")).toBe(true);
  });

  it("ignores case and punctuation", () => {
    expect(clueLeaksAnswer("The narrator insists the kid is not his son. BILLIE!", "Billie Jean")).toBe(true);
  });

  it("does not trip on short connecting words shared with the title", () => {
    expect(clueLeaksAnswer("A plea, with a gospel choir behind it, not to be left alone.", "Stay With Me")).toBe(false);
    expect(clueLeaksAnswer("A plea to stay one more night.", "Stay With Me")).toBe(true);
  });

  it("catches a short title used whole", () => {
    expect(clueLeaksAnswer("He tells her to stay, then tells her to go.", "Stay")).toBe(true);
  });
});

describe("calcAvailablePoints with a written clue", () => {
  it("caps the round at the written-clue maximum", () => {
    const now = Date.now();
    expect(calcAvailablePoints([], now, now)).toBe(MAX_PTS);
    expect(calcAvailablePoints([], now, now, TEXT_CLUE_MAX_PTS)).toBe(TEXT_CLUE_MAX_PTS);
  });

  it("does not raise a score that has already fallen below the cap", () => {
    const start = Date.now() - 100_000; // 100 seconds in: 400 points gone
    expect(calcAvailablePoints([], start, start + 100_000, TEXT_CLUE_MAX_PTS)).toBe(600);
  });
});

describe("toClientRound", () => {
  it("removes the answer and the written clue, but says a clue exists", () => {
    const round = toClientRound({ answer: "Dancing Queen", artist: "ABBA", audio: "a.m4a", textClue: "1976 disco hit." });
    expect(round).toEqual({ artist: "ABBA", audio: "a.m4a", hasTextClue: true });
  });

  it("says no clue exists when the round has none", () => {
    expect(toClientRound({ answer: "Dancing Queen", audio: "a.m4a" })).toEqual({ audio: "a.m4a", hasTextClue: false });
  });
});

describe("seedEntryToRoundJson", () => {
  const entry = {
    id: "1",
    round_key: "song" as const,
    query_title: "Dancing Queen ABBA",
    answer: "Dancing Queen",
    hint: "ABBA",
    artist: "ABBA",
    album_name: null,
    img: null,
    audio: "a.m4a",
    external_id: null,
    external_source: null,
    status: "approved" as const,
    resolve_notes: null,
    notes: null,
    puzzle_id: null,
    metadata: { text_clue: "1976 disco hit." } as Record<string, unknown>,
    created_at: "",
    updated_at: "",
  };

  it("carries a song's written clue into the puzzle", () => {
    expect(seedEntryToRoundJson(entry).textClue).toBe("1976 disco hit.");
  });

  it("leaves the clue out when the entry has none", () => {
    expect("textClue" in seedEntryToRoundJson({ ...entry, metadata: {} })).toBe(false);
  });
});
