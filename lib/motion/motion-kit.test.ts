import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import confetti from "canvas-confetti";
import { burstFrom } from "./burst";
import { impactRing } from "./impact-ring";
import { juiceLevel } from "./juice-level";
import { prefersReducedMotion } from "./prefers-reduced-motion";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

function setReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches }));
}

function makeEl(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  el.getBoundingClientRect = () =>
    ({ left: 100, top: 200, width: 200, height: 100 }) as DOMRect;
  return el;
}

beforeEach(() => {
  vi.mocked(confetti).mockClear();
  setReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("prefersReducedMotion", () => {
  it("reflects the media query", () => {
    setReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    setReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns false when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("juiceLevel", () => {
  it.each([
    [0, 0], [2, 0], [3, 1], [4, 1], [5, 2], [7, 2], [8, 3], [20, 3],
  ])("streak %i is level %i", (streak, level) => {
    expect(juiceLevel(streak)).toBe(level);
  });
});

describe("burstFrom", () => {
  it("fires from the centre of the element", async () => {
    await burstFrom(makeEl(), 0, "correct");
    expect(confetti).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(confetti).mock.calls[0][0]!;
    expect(opts.origin!.x).toBeCloseTo(200 / window.innerWidth);
    expect(opts.origin!.y).toBeCloseTo(250 / window.innerHeight);
    expect(opts.particleCount).toBe(14);
  });

  it("scales particle count with level", async () => {
    await burstFrom(makeEl(), 3);
    expect(vi.mocked(confetti).mock.calls[0][0]!.particleCount).toBe(50);
  });

  it("does nothing for a null element", async () => {
    await burstFrom(null, 2);
    expect(confetti).not.toHaveBeenCalled();
  });

  it("does nothing under reduced motion", async () => {
    setReducedMotion(true);
    await burstFrom(makeEl(), 2);
    expect(confetti).not.toHaveBeenCalled();
  });

  it("still fires when matchMedia is unavailable", async () => {
    vi.stubGlobal("matchMedia", undefined);
    await burstFrom(makeEl());
    expect(confetti).toHaveBeenCalledTimes(1);
  });
});

describe("impactRing", () => {
  it("appends a ring and removes it after the animation", () => {
    vi.useFakeTimers();
    const el = makeEl();
    impactRing(el, "red");
    const ring = el.querySelector<HTMLElement>(".anim-impact-ring");
    expect(ring).not.toBeNull();
    expect(ring!.style.getPropertyValue("--ring")).toBe("red");
    vi.advanceTimersByTime(460);
    expect(el.querySelector(".anim-impact-ring")).toBeNull();
  });

  it("cleans up every ring when triggered twice in quick succession", () => {
    vi.useFakeTimers();
    const el = makeEl();
    impactRing(el, "red");
    vi.advanceTimersByTime(100);
    impactRing(el, "red");
    expect(el.querySelectorAll(".anim-impact-ring")).toHaveLength(2);
    vi.advanceTimersByTime(460);
    expect(el.querySelectorAll(".anim-impact-ring")).toHaveLength(0);
  });

  it("does nothing for a null element or under reduced motion", () => {
    expect(() => impactRing(null, "red")).not.toThrow();
    setReducedMotion(true);
    const el = makeEl();
    impactRing(el, "red");
    expect(el.querySelector(".anim-impact-ring")).toBeNull();
  });
});
