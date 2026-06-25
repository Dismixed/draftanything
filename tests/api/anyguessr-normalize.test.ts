import { describe, expect, it } from "vitest";
import { normalizeAnswer } from "@/lib/anyguessr/normalize";

describe("AnyGuessr normalizeAnswer", () => {
  it("lowercases and trims surrounding whitespace", () => {
    expect(normalizeAnswer("  Japan ")).toBe("japan");
  });

  it("strips diacritics", () => {
    expect(normalizeAnswer("Curaçao")).toBe("curacao");
    expect(normalizeAnswer("São Tomé and Príncipe")).toBe(
      "sao tome and principe",
    );
  });

  it("collapses non-alphanumeric runs to single spaces", () => {
    expect(normalizeAnswer("French  Guiana--overseas")).toBe(
      "french guiana overseas",
    );
  });

  it("preserves CJK characters as letters via Unicode property escapes", () => {
    expect(normalizeAnswer("日本")).toBe("日本");
  });

  it("handles empty / nullish input without throwing", () => {
    expect(normalizeAnswer("")).toBe("");
    expect(normalizeAnswer(null as unknown as string)).toBe("");
  });
});