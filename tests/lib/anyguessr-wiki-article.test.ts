import { describe, expect, it } from "vitest";
import { articleTitlesFor, extractArticleText, wikiArticleUrl } from "@/lib/anyguessr/wiki-article";

const html = `<div class="mw-parser-output">
  <div class="shortdescription">Pork and bean stew</div>
  <table class="infobox"><tr><td>Course: main, served with rice and orange slices</td></tr></table>
  <p>Feijoada is a stew of beans with beef and pork, a national dish of Brazil.<sup class="reference">[1]</sup></p>
  <p>Short.</p>
  <div class="mw-heading"><h2>History</h2></div>
  <ul><li>The dish is usually served with rice, collard greens and orange slices.</li></ul>
  <figure><figcaption>A bowl of feijoada served in a clay pot at a restaurant.</figcaption></figure>
  <div class="mw-heading"><h2>See also</h2></div>
  <p>Cassoulet is a French stew that this paragraph should never reach the reader.</p>
</div>`;

describe("extractArticleText", () => {
  const text = extractArticleText(html);

  it("keeps the article's prose, one paragraph or list item per line", () => {
    expect(text.split("\n")).toEqual([
      "Feijoada is a stew of beans with beef and pork, a national dish of Brazil.",
      "The dish is usually served with rice, collard greens and orange slices.",
    ]);
  });

  it("leaves out citation markers, infoboxes, captions and everything after See also", () => {
    expect(text).not.toMatch(/\[1\]|Course:|clay pot|Cassoulet/);
  });

  it("stops at the character limit on a whole line", () => {
    expect(extractArticleText(html, 90)).toBe("Feijoada is a stew of beans with beef and pork, a national dish of Brazil.");
  });
});

describe("articleTitlesFor", () => {
  const entry = { wiki_title: null, country_common: "Brazil", notes: null };

  it("uses the clue's own article for image clues", () => {
    expect(articleTitlesFor({ ...entry, clue_type: "food", wiki_title: "Feijoada" })).toEqual(["Feijoada"]);
  });

  it("uses the flag article for a flag, with and without 'the'", () => {
    expect(articleTitlesFor({ ...entry, clue_type: "flag" })).toEqual(["Flag of Brazil", "Flag of the Brazil"]);
  });

  it("finds the language in the notes of a language clue", () => {
    const notes = 'replaced नमस्ते: single greeting word, also used in Nepal | Hindi: "What is your name?"';
    expect(articleTitlesFor({ ...entry, clue_type: "written_language", notes })).toEqual(["Hindi language", "Hindi"]);
    expect(articleTitlesFor({ ...entry, clue_type: "written_language", notes: null })).toEqual([]);
  });
});

describe("wikiArticleUrl", () => {
  it("builds an article address from a title", () => {
    expect(wikiArticleUrl("Pastel de nata")).toBe("https://en.wikipedia.org/wiki/Pastel_de_nata");
    expect(wikiArticleUrl("Pelé (footballer)")).toBe("https://en.wikipedia.org/wiki/Pel%C3%A9_(footballer)");
  });
});
