import { describe, expect, it } from "vitest";
import { matchProblems } from "@/lib/freezeframes/match";

describe("matchProblems", () => {
  it("accepts a movie whose title and year match", () => {
    expect(matchProblems("movie", { title: "Jurassic Park", year: 1993 }, { answer: "Jurassic Park", year: 1993 })).toEqual([]);
  });

  it("ignores case, punctuation and a leading article in titles", () => {
    expect(matchProblems("movie", { title: "WALL·E", year: 2008 }, { answer: "WALL-E", year: 2008 })).toEqual([]);
    expect(matchProblems("show", { title: "The Simpsons", year: 1989 }, { answer: "Simpsons", year: 1989 })).toEqual([]);
  });

  it("allows the year to be one off, as release dates differ by country", () => {
    expect(matchProblems("movie", { title: "Amélie", year: 2001 }, { answer: "Amélie", year: 2002 })).toEqual([]);
  });

  it("reports a different film with the same title", () => {
    const problems = matchProblems("movie", { title: "Star Wars", year: 1977 }, { answer: "Star Wars", year: 2015 });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("2015");
  });

  it("reports a different title", () => {
    const problems = matchProblems("show", { title: "Doctor Who", year: 2005 }, { answer: "Doctor Who Confidential", year: 2005 });
    expect(problems[0]).toContain("Doctor Who Confidential");
  });

  it("checks a song's title and artist, allowing fuller artist credits", () => {
    const expected = { title: "Purple Rain", artist: "Prince" };
    expect(matchProblems("song", expected, { answer: "Purple Rain", artist: "Prince & The Revolution" })).toEqual([]);
    expect(matchProblems("song", expected, { answer: "Purple Rain", artist: "Tribute Band" })[0]).toContain("Tribute Band");
  });

  it("accepts a song title with a version note in brackets", () => {
    expect(matchProblems("song", { title: "Dancing Queen", artist: "ABBA" }, { answer: "Dancing Queen (Remastered)", artist: "ABBA" })).toEqual([]);
  });

  it("treats '&' and 'and' as the same, and ignores store suffixes like '- Single'", () => {
    const expected = { title: "Ram", artist: "Paul and Linda McCartney" };
    expect(matchProblems("album", expected, { answer: "Paul & Linda McCartney", albumName: "Ram" })).toEqual([]);
    expect(
      matchProblems("album", { title: "Mañana Será Bonito", artist: "Karol G" }, { answer: "KAROL G", albumName: "Mañana Será Bonito - EP" }),
    ).toEqual([]);
  });

  it("checks an album by its artist, which is the answer, and its title", () => {
    const expected = { title: "Nevermind", artist: "Nirvana" };
    expect(matchProblems("album", expected, { answer: "Nirvana", albumName: "Nevermind (Remastered)" })).toEqual([]);
    expect(matchProblems("album", expected, { answer: "Nirvana", albumName: "In Utero" })[0]).toContain("In Utero");
  });
});
