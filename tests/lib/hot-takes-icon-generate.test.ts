import { describe, expect, it } from "vitest";
import { iconPrompt } from "@/lib/hot-takes/icon-generate";

describe("iconPrompt", () => {
  it("includes the no-likeness phrase for real_entity items", () => {
    const prompt = iconPrompt("Category", "Label", "real_entity");

    expect(prompt).toContain(
      "do not render a specific named individual's likeness",
    );
  });

  it("does not include the no-likeness phrase for generic items", () => {
    const prompt = iconPrompt("Category", "Label", "generic");

    expect(prompt).not.toContain(
      "do not render a specific named individual's likeness",
    );
  });
});
