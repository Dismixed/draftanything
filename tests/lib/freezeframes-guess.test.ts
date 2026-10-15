import { describe, expect, it } from "vitest";
import { fuzzyMatch } from "@/lib/freezeframes/game-logic";

describe("fuzzyMatch", () => {
  it("accepts a song title without its featured artist", () => {
    const answer = "Hips Don't Lie (feat. Wyclef Jean)";
    expect(fuzzyMatch("hips dont lie", answer)).toBe(true);
    expect(fuzzyMatch("hip's dont lie", answer)).toBe(true);
    expect(fuzzyMatch("Hips Don’t Lie", answer)).toBe(true);
    expect(fuzzyMatch("hips dont lei", answer)).toBe(true);
    expect(fuzzyMatch("hips don't lie feat wyclef jean", answer)).toBe(true);
    expect(fuzzyMatch("hips dont lie", "Hips Don't Lie feat. Wyclef Jean")).toBe(true);
    expect(fuzzyMatch("hips dont lie", "Hips Don't Lie - Remastered")).toBe(true);
  });

  it("accepts the main title without its subtitle", () => {
    expect(fuzzyMatch("avatar", "Avatar: The Last Airbender")).toBe(true);
    expect(fuzzyMatch("avatr", "Avatar: The Last Airbender")).toBe(true);
    expect(fuzzyMatch("avatar the last airbender", "Avatar: The Last Airbender")).toBe(true);
    expect(fuzzyMatch("spiderman", "Spider-Man: No Way Home")).toBe(true);
  });

  it("ignores accents, ampersands and a leading article", () => {
    expect(fuzzyMatch("law and order", "Law & Order")).toBe(true);
    expect(fuzzyMatch("law & order", "Law and Order")).toBe(true);
    expect(fuzzyMatch("amelie", "Amélie")).toBe(true);
    expect(fuzzyMatch("beyonce", "Beyoncé")).toBe(true);
    expect(fuzzyMatch("office", "The Office")).toBe(true);
    expect(fuzzyMatch("the beatles", "Beatles")).toBe(true);
  });

  it("accepts a guess that adds to the answer", () => {
    expect(fuzzyMatch("hips dont lie shakira", "Hips Don't Lie")).toBe(true);
  });

  it("rejects a guess that is only part of the title", () => {
    expect(fuzzyMatch("hips", "Hips Don't Lie (feat. Wyclef Jean)")).toBe(false);
    expect(fuzzyMatch("lie", "Hips Don't Lie (feat. Wyclef Jean)")).toBe(false);
    expect(fuzzyMatch("jean", "Hips Don't Lie (feat. Wyclef Jean)")).toBe(false);
    expect(fuzzyMatch("airbender", "Avatar: The Last Airbender")).toBe(false);
    expect(fuzzyMatch("breaking", "Breaking Bad")).toBe(false);
    expect(fuzzyMatch("game", "Game of Thrones")).toBe(false);
    expect(fuzzyMatch("the dark", "The Dark Knight")).toBe(false);
    expect(fuzzyMatch("harry potter", "Harry Potter and the Goblet of Fire")).toBe(false);
    expect(fuzzyMatch("the", "The Office")).toBe(false);
  });
});
