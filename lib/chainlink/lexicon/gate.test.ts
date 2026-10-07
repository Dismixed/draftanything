import { describe, expect, it } from "vitest";
import { indexVerdicts, type LinkVerdict } from "./gate";

function verdict(phrase: string, valid = true): LinkVerdict {
  return { phrase, valid, familiarity: 3, category: "general" };
}

describe("indexVerdicts", () => {
  it("keys verdicts by the phrase that was asked about", () => {
    const index = indexVerdicts(["hot dog", "car pet"], [verdict("hot dog"), verdict("car pet", false)]);
    expect(index.get("hot dog")?.valid).toBe(true);
    expect(index.get("car pet")?.valid).toBe(false);
  });

  it("matches phrases the model returned with different case or spacing", () => {
    const index = indexVerdicts(["hot dog"], [verdict(" Hot  Dog ")]);
    expect(index.get("hot dog")?.phrase).toBe("hot dog");
  });

  it("matches a closed compound the model returned without the space", () => {
    const index = indexVerdicts(["foot ball"], [verdict("football")]);
    expect(index.has("foot ball")).toBe(true);
  });

  it("drops verdicts for phrases that were never asked about", () => {
    const index = indexVerdicts(["hot dog"], [verdict("hot dog"), verdict("ice cream")]);
    expect([...index.keys()]).toEqual(["hot dog"]);
  });

  it("leaves unanswered phrases out so the caller can retry them", () => {
    const index = indexVerdicts(["hot dog", "rain bow"], [verdict("hot dog")]);
    expect(index.has("rain bow")).toBe(false);
  });
});
