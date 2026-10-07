import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/ai/gemini", () => ({ generateJson: vi.fn() }));

import { sourceFunFact, type DraftInput, type FactEntry, type JudgeInput, type SourcingDeps } from "@/lib/anyguessr/fun-fact-sourcing";

const ARTICLE = `Feijoada is a stew of beans with beef and pork, a national dish of Brazil and Portugal.\n${"The dish is usually served with rice and orange slices. ".repeat(6)}`;
const EVIDENCE = "Feijoada is a stew of beans with beef and pork, a national dish of Brazil and Portugal.";

const entry: FactEntry = { id: "e1", cca3: "BRA", country_common: "Brazil", clue_type: "food", wiki_title: "Feijoada", text_content: null, notes: null };

const deps = (over: Partial<SourcingDeps> = {}): SourcingDeps => ({
  getArticle: async () => ARTICLE,
  draft: async () => ({ fun_fact: "Feijoada is a bean stew with beef and pork.", evidence: EVIDENCE }),
  judge: async () => "supported",
  ...over,
});

describe("sourceFunFact", () => {
  it("verifies a fact whose sentence is in the article and which an independent check supports", async () => {
    const record = await sourceFunFact(entry, deps());
    expect(record.verdict).toBe("verified");
    expect(record.source_url).toBe("https://en.wikipedia.org/wiki/Feijoada");
    expect(record.evidence).toBe(EVIDENCE);
    expect(record.checks).toEqual({ article: true, quote: true, numbers: true, timeless: true, shape: true, judge: "supported" });
  });

  it("reports a clue with no article as having no source", async () => {
    const record = await sourceFunFact(entry, deps({ getArticle: async () => null }));
    expect(record.verdict).toBe("no_source");
    expect(record.fun_fact).toBeNull();
  });

  it("rejects evidence the article does not contain, after a second try", async () => {
    const draft = vi.fn<(input: DraftInput) => Promise<{ fun_fact: string; evidence: string }>>(async () => ({ fun_fact: "Feijoada was invented in 1500.", evidence: "Feijoada was invented by sailors in the year 1500 off the coast." }));
    const record = await sourceFunFact(entry, deps({ draft }));
    expect(record.verdict).toBe("rejected");
    expect(record.checks.quote).toBe(false);
    expect(draft).toHaveBeenCalledTimes(2);
    expect(draft.mock.calls[1][0].feedback).toMatch(/copied exactly/);
  });

  it("recovers when the second attempt is sound", async () => {
    const draft = vi
      .fn<(input: DraftInput) => Promise<{ fun_fact: string; evidence: string }>>()
      .mockResolvedValueOnce({ fun_fact: "Made up.", evidence: "A sentence that is not in the article at all, really." })
      .mockResolvedValueOnce({ fun_fact: "Feijoada is a bean stew.", evidence: EVIDENCE });
    expect((await sourceFunFact(entry, deps({ draft }))).verdict).toBe("verified");
  });

  it("rejects a fact that states a number its evidence does not", async () => {
    const record = await sourceFunFact(entry, deps({ draft: async () => ({ fun_fact: "Feijoada has 3 kinds of meat.", evidence: EVIDENCE }) }));
    expect(record.verdict).toBe("rejected");
    expect(record.checks.numbers).toBe(false);
  });

  it("rejects a fact the independent check does not fully support", async () => {
    const record = await sourceFunFact(entry, deps({ judge: async () => "partly_supported" }));
    expect(record.verdict).toBe("rejected");
    expect(record.reason).toMatch(/partly supported/);
  });

  it("rejects a fact that is not about the clue's subject", async () => {
    const judge = vi.fn<(input: JudgeInput) => Promise<"off_topic">>(async () => "off_topic");
    const record = await sourceFunFact({ ...entry, clue_type: "flag", wiki_title: null }, deps({ judge }));
    expect(record.verdict).toBe("rejected");
    expect(record.reason).toMatch(/not about/);
    expect(judge.mock.calls[0][0].subject).toBe("the current national flag of Brazil");
  });

  it("passes facts already used so a shared article does not repeat them", async () => {
    const draft = vi.fn<(input: DraftInput) => Promise<{ fun_fact: string; evidence: string }>>(async () => ({ fun_fact: "Feijoada is a bean stew.", evidence: EVIDENCE }));
    await sourceFunFact(entry, deps({ draft }), ["Another fact."]);
    expect(draft.mock.calls[0][0].avoid).toEqual(["Another fact."]);
  });
});
