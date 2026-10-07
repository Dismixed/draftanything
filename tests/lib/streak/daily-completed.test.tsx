import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { StreakProvider } from "@/lib/streak/context";
import { recordDailyCompletion } from "@/lib/streak/storage";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

describe("daily_completed event", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(posthog.capture).mockReset();
  });

  // Vitest globals are off here, so Testing Library does not unmount between tests on its own.
  afterEach(cleanup);

  it("fires when a daily is completed", () => {
    render(
      <StreakProvider>
        <div />
      </StreakProvider>,
    );

    act(() => {
      recordDailyCompletion("chainlink");
    });

    expect(posthog.capture).toHaveBeenCalledWith("daily_completed", {
      game: "chainlink",
      streak: 1,
    });
  });

  it("fires once when the same daily is completed twice", () => {
    render(
      <StreakProvider>
        <div />
      </StreakProvider>,
    );

    act(() => {
      recordDailyCompletion("hot-takes");
      recordDailyCompletion("hot-takes");
    });

    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });
});
