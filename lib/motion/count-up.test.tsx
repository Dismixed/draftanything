import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "./count-up";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function settle() {
  act(() => {
    vi.advanceTimersByTime(600);
  });
}

describe("useCountUp", () => {
  it("counts up from 0 to the target", () => {
    const { result } = renderHook(() => useCountUp(100, true, 400));
    expect(result.current).toBe(0);
    settle();
    expect(result.current).toBe(100);
  });

  it("restarts from 0 on a new target by default", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 400), {
      initialProps: { t: 100 },
    });
    settle();
    rerender({ t: 250 });
    expect(result.current).toBe(0);
    settle();
    expect(result.current).toBe(250);
  });

  it("continues from the previous value with fromPrevious", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 400, true), {
      initialProps: { t: 100 },
    });
    settle();
    rerender({ t: 250 });
    expect(result.current).toBe(100);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBeGreaterThan(100);
    expect(result.current).toBeLessThan(250);
    settle();
    expect(result.current).toBe(250);
  });

  it("counts down to a lower target with fromPrevious", () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, true, 400, true), {
      initialProps: { t: 300 },
    });
    settle();
    rerender({ t: 0 });
    settle();
    expect(result.current).toBe(0);
  });

  it("jumps straight to the target under reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { result } = renderHook(() => useCountUp(100, true, 400));
    expect(result.current).toBe(100);
  });
});
