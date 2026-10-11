// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/ai/gemini", () => ({ generateJson: vi.fn() }));

import { generateJson } from "@/features/ai/gemini";
import { firstUsableCandidate, pickOffTheDome, type DomePickInput } from "./dome-pick";
import { BOT_ROSTER } from "./roster";

const mockGenerate = vi.mocked(generateJson);

const input: DomePickInput = {
  topic: "Best heist movies",
  bot: BOT_ROSTER[0],
  takenNames: ["Heat", "Ocean's Eleven"],
  ownLineup: ["Heat"],
  vetoedNames: ["Home Alone"],
};

beforeEach(() => {
  mockGenerate.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("firstUsableCandidate", () => {
  it("skips names that differ from a taken pick only by case or spacing", () => {
    expect(firstUsableCandidate(["Heat", "  heat ", "Alien"], ["HEAT"], [])).toBe("Alien");
  });

  it("skips vetoed names", () => {
    expect(firstUsableCandidate(["home alone", "Ronin"], [], ["Home Alone"])).toBe("Ronin");
  });

  it("skips blank and over-long candidates and trims the result", () => {
    expect(firstUsableCandidate(["", "   ", "x".repeat(201), "  Ronin  "], [], [])).toBe(
      "Ronin",
    );
  });

  it("returns null when nothing is usable", () => {
    expect(firstUsableCandidate(["Heat", "heat"], ["Heat"], [])).toBeNull();
    expect(firstUsableCandidate([], [], [])).toBeNull();
  });
});

describe("pickOffTheDome", () => {
  it("takes the first usable candidate", async () => {
    mockGenerate.mockResolvedValue({ candidates: ["heat", "Home Alone", "Inside Man"] });
    await expect(pickOffTheDome(input)).resolves.toEqual({ kind: "pick", name: "Inside Man" });
  });

  it("forfeits when every candidate is taken or vetoed", async () => {
    mockGenerate.mockResolvedValue({ candidates: ["Heat", "OCEAN'S ELEVEN", "home alone"] });
    await expect(pickOffTheDome(input)).resolves.toEqual({
      kind: "forfeit",
      reason: "all_taken",
    });
  });

  it("forfeits when the AI call fails or times out", async () => {
    mockGenerate.mockRejectedValue(new Error("deadline exceeded"));
    await expect(pickOffTheDome(input)).resolves.toEqual({
      kind: "forfeit",
      reason: "ai_error",
    });
  });

  it("sends the topic, taken picks and vetoed names, with a 10 second limit", async () => {
    mockGenerate.mockResolvedValue({ candidates: ["Ronin"] });
    await pickOffTheDome(input);

    const call = mockGenerate.mock.calls[0][0];
    expect(call.timeoutMs).toBe(10_000);
    expect(call.userPrompt).toContain("Best heist movies");
    expect(call.userPrompt).toContain("Ocean's Eleven");
    expect(call.userPrompt).toContain("Home Alone");
    expect(call.systemPrompt).toContain(BOT_ROSTER[0].domePersona);
  });
});
