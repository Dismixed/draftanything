import { describe, expect, it } from "vitest";
import { decodeResult, encodeResult } from "@/lib/share/result-link";

describe("result links", () => {
  it("round-trips a result with emoji, joiners and accents", () => {
    const result = { label: "Oct 6", lines: ["🎬✅ 🎵❌ · 1,200 pts", "👩‍👩‍👧 café"] };
    const encoded = encodeResult(result);
    expect(encoded).toMatch(/^[\w-]+$/);
    expect(decodeResult(encoded!)).toEqual(result);
  });

  it("rejects anything that is not a result", () => {
    expect(decodeResult(undefined)).toBeNull();
    expect(decodeResult("")).toBeNull();
    expect(decodeResult("not base64!!")).toBeNull();
    expect(decodeResult(btoa("{}"))).toBeNull();
    expect(decodeResult(btoa(JSON.stringify(["Oct 6", 4])))).toBeNull();
    expect(decodeResult(btoa(JSON.stringify(["Oct 6"])))).toBeNull();
    expect(decodeResult("a".repeat(2000))).toBeNull();
  });

  it("trims what an edited link could smuggle in", () => {
    const tampered = Buffer.from(JSON.stringify(["Oct\u0000 6\u202e", "x".repeat(500), "two", "three", "four"])).toString("base64url");
    const result = decodeResult(tampered)!;
    expect(result.label).toBe("Oct 6");
    expect(result.lines).toHaveLength(3);
    expect(Array.from(result.lines[0])).toHaveLength(80);
    expect(result.lines[0].endsWith("…")).toBe(true);
  });
});
