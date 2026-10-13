import { describe, expect, it } from "vitest";
import { clueDisplayUrl } from "@/lib/anyguessr/clue-image-url";

describe("clueDisplayUrl", () => {
  it("asks Wikimedia for a screen-sized copy of an original", () => {
    expect(clueDisplayUrl("https://upload.wikimedia.org/wikipedia/commons/e/e8/Souvlaki_in_Athens.JPG")).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Souvlaki_in_Athens.JPG/1280px-Souvlaki_in_Athens.JPG",
    );
  });

  it("keeps the file name encoded and drops tracking parameters", () => {
    expect(
      clueDisplayUrl(
        "https://upload.wikimedia.org/wikipedia/en/c/ce/Hassan_II_mosque%2C_Casablanca_2.jpg?utm_source=commons.wikimedia.org",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/en/thumb/c/ce/Hassan_II_mosque%2C_Casablanca_2.jpg/1280px-Hassan_II_mosque%2C_Casablanca_2.jpg",
    );
  });

  it("shrinks an oversized copy and leaves a small one alone", () => {
    expect(clueDisplayUrl("https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Gate.jpg/3840px-Gate.jpg?utm=1")).toBe(
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Gate.jpg/1280px-Gate.jpg",
    );
    const small = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Gate.jpg/330px-Gate.jpg";
    expect(clueDisplayUrl(small)).toBe(small);
  });

  it("asks for flags as vector files", () => {
    expect(clueDisplayUrl("https://flagcdn.com/w320/dz.png")).toBe("https://flagcdn.com/dz.svg");
  });

  it("returns anything else unchanged", () => {
    for (const url of [
      "https://upload.wikimedia.org/wikipedia/commons/a/ab/Crest.svg",
      "https://example.com/photo.jpg",
      "not a url",
    ]) {
      expect(clueDisplayUrl(url)).toBe(url);
    }
  });
});
