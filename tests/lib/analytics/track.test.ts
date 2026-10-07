import { beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { track } from "@/lib/analytics/track";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

describe("track", () => {
  beforeEach(() => {
    vi.mocked(posthog.capture).mockReset();
  });

  it("sends the event and its properties to PostHog", () => {
    track("home_game_clicked", { game: "chainlink", slot: "featured" });
    expect(posthog.capture).toHaveBeenCalledWith("home_game_clicked", {
      game: "chainlink",
      slot: "featured",
    });
  });

  it("never throws when capture fails", () => {
    vi.mocked(posthog.capture).mockImplementation(() => {
      throw new Error("blocked by client");
    });
    expect(() => track("home_game_clicked", { game: "chainlink" })).not.toThrow();
  });
});
