import { describe, expect, it } from "vitest";
import { pickItunesHit } from "@/lib/freezeframes/match";

const hit = (artistName: string, collectionName: string, trackName?: string) => ({ artistName, collectionName, trackName });

describe("pickItunesHit", () => {
  const results = [
    hit("Rama", "Nevermind Nirvana Rama Here's Sub Par All Star"),
    hit("Nirvana", "Nevermind (Remastered)"),
    hit("Nirvana", "In Utero"),
  ];

  it("takes the first result when nothing is expected", () => {
    expect(pickItunesHit(results, "album")).toBe(results[0]);
  });

  it("prefers the result whose artist and album both match", () => {
    expect(pickItunesHit(results, "album", { title: "Nevermind", artist: "Nirvana" })).toBe(results[1]);
  });

  it("falls back to the right artist when the album title does not match exactly", () => {
    const loose = [hit("Tribute Band", "Nevermind"), hit("Nirvana", "Nevermind: 30th Anniversary Edition")];
    expect(pickItunesHit(loose, "album", { title: "Nevermind", artist: "Nirvana" })).toBe(loose[1]);
  });

  it("matches a song by its track name and artist", () => {
    const songs = [
      hit("Alicia Keys", "The Element of Freedom", "Empire State of Mind (Part II) Broken Down"),
      hit("JAY-Z", "The Blueprint 3", "Empire State of Mind (feat. Alicia Keys)"),
    ];
    expect(pickItunesHit(songs, "song", { title: "Empire State of Mind", artist: "JAY-Z" })).toBe(songs[1]);
  });

  it("falls back to the first result when no artist matches", () => {
    expect(pickItunesHit(results, "album", { title: "Nevermind", artist: "Somebody Else" })).toBe(results[0]);
  });
});
