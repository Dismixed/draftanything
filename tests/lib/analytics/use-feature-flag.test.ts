import { act, renderHook } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFeatureFlagVariant } from "@/lib/analytics/use-feature-flag";

vi.mock("posthog-js", () => ({ default: { onFeatureFlags: vi.fn(), getFeatureFlag: vi.fn() } }));

const onFeatureFlags = vi.mocked(posthog.onFeatureFlags);
const getFeatureFlag = vi.mocked(posthog.getFeatureFlag);

/** Flags arrive when PostHog calls back, as it does once they have loaded. */
function flagsLoaded() {
  const callback = onFeatureFlags.mock.calls.at(-1)![0];
  act(() => callback([], {}, {}));
}

describe("useFeatureFlagVariant", () => {
  beforeEach(() => {
    onFeatureFlags.mockReset().mockReturnValue(() => {});
    getFeatureFlag.mockReset();
  });

  it("is undefined until flags have loaded, then gives the variant", () => {
    getFeatureFlag.mockReturnValue("test");
    const { result } = renderHook(() => useFeatureFlagVariant("my-flag"));

    expect(result.current).toBeUndefined();
    flagsLoaded();
    expect(getFeatureFlag).toHaveBeenCalledWith("my-flag");
    expect(result.current).toBe("test");
  });

  it("treats a flag that is off as no variant", () => {
    getFeatureFlag.mockReturnValue(false);
    const { result } = renderHook(() => useFeatureFlagVariant("my-flag"));

    flagsLoaded();
    expect(result.current).toBeUndefined();
  });

  it("does not read the flag, so records no exposure, until enabled", () => {
    getFeatureFlag.mockReturnValue("test");
    const { result, rerender } = renderHook(({ enabled }) => useFeatureFlagVariant("my-flag", { enabled }), {
      initialProps: { enabled: false },
    });

    expect(onFeatureFlags).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();

    rerender({ enabled: true });
    flagsLoaded();
    expect(result.current).toBe("test");
  });

  it("keeps the current behaviour when PostHog is blocked", () => {
    onFeatureFlags.mockImplementation(() => {
      throw new Error("blocked by client");
    });
    const { result } = renderHook(() => useFeatureFlagVariant("my-flag"));

    expect(result.current).toBeUndefined();
  });

  it("stops listening on unmount", () => {
    const unsubscribe = vi.fn();
    onFeatureFlags.mockReturnValue(unsubscribe);
    const { unmount } = renderHook(() => useFeatureFlagVariant("my-flag"));

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
