import { describe, expect, it } from "vitest";
import { funFactForClue, type FunFactSource } from "@/lib/anyguessr/fun-fact";
import type { Clue } from "@/lib/anyguessr/types";

const entry = (extra: Partial<FunFactSource> = {}): FunFactSource => ({
  clue_type: "food",
  wiki_title: "Feijoada",
  text_content: null,
  fun_fact: "Feijoada is a black bean stew traditionally served with rice and orange slices.",
  fun_fact_source_url: "https://en.wikipedia.org/wiki/Feijoada",
  fun_fact_reviewed: true,
  ...extra,
});
const clue = (extra: Partial<Clue> = {}): Clue => ({ type: "food", content: "Feijoada", ...extra });

describe("funFactForClue", () => {
  it("returns the reviewed fact for the clue the player saw", () => {
    expect(funFactForClue(entry(), clue())?.text).toMatch(/black bean stew/);
  });

  it("carries the article the fact comes from", () => {
    expect(funFactForClue(entry(), clue())?.sourceUrl).toBe("https://en.wikipedia.org/wiki/Feijoada");
  });

  it("drops a source that is not a Wikipedia article", () => {
    for (const fun_fact_source_url of ["javascript:alert(1)", "https://example.com/feijoada", "http://en.wikipedia.org/wiki/Feijoada", null]) {
      const fact = funFactForClue(entry({ fun_fact_source_url }), clue());
      expect(fact?.text).toMatch(/black bean stew/);
      expect(fact?.sourceUrl).toBeNull();
    }
  });

  it("holds back a fact no person has reviewed", () => {
    expect(funFactForClue(entry({ fun_fact_reviewed: false }), clue())).toBeNull();
  });

  it("returns nothing when there is no fact, or only blank text", () => {
    expect(funFactForClue(entry({ fun_fact: null }), clue())).toBeNull();
    expect(funFactForClue(entry({ fun_fact: "   " }), clue())).toBeNull();
    expect(funFactForClue(null, clue())).toBeNull();
  });

  it("does not pair a fact with a different clue type", () => {
    expect(funFactForClue(entry(), clue({ type: "landmark" }))).toBeNull();
    expect(funFactForClue(entry(), undefined)).toBeNull();
  });

  it("does not pair a fact with a clue that has since been replaced", () => {
    expect(funFactForClue(entry({ wiki_title: "Moqueca" }), clue())).toBeNull();
  });

  it("matches titles however the underscores and case are written", () => {
    expect(funFactForClue(entry({ wiki_title: "Gallo_pinto" }), clue({ content: "gallo pinto" }))).not.toBeNull();
  });

  it("compares a language clue by its text, not its article title", () => {
    const language = entry({ clue_type: "written_language", wiki_title: null, text_content: "Bonjour" });
    expect(funFactForClue(language, clue({ type: "written_language", content: "Bonjour" }))).not.toBeNull();
    expect(funFactForClue(language, clue({ type: "written_language", content: "Salut" }))).toBeNull();
  });

  it("shows a flag's fact without a subject to compare", () => {
    const flag = entry({ clue_type: "flag", wiki_title: null });
    expect(funFactForClue(flag, clue({ type: "flag", content: "national flag" }))).not.toBeNull();
  });
});
