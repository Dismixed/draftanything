import { describe, expect, it } from "vitest";
import { frameSeed } from "@/lib/freezeframes/sourcing";

describe("frameSeed", () => {
  it("is the query itself by default, so existing entries keep their frame", () => {
    expect(frameSeed("Jurassic Park")).toBe("Jurassic Park");
    expect(frameSeed("Jurassic Park", 0)).toBe("Jurassic Park");
  });

  it("changes with the variant, so a rejected frame can be swapped for another", () => {
    expect(frameSeed("Jurassic Park", 1)).not.toBe(frameSeed("Jurassic Park"));
    expect(frameSeed("Jurassic Park", 1)).not.toBe(frameSeed("Jurassic Park", 2));
  });
});
