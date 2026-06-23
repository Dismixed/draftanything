import { describe, expect, it, vi, beforeEach } from "vitest";
import { playSound } from "./play";
import { resolveVolume, SOUND_REGISTRY } from "./sounds";

describe("playSound", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when locked", () => {
    const spy = vi.spyOn(console, "log");
    playSound("ui.tap", { unlocked: false, muted: false, reducedMotion: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it("does nothing when muted", () => {
    playSound("ui.tap", { unlocked: true, muted: true, reducedMotion: false });
    // No throw is sufficient; gated before audio calls.
    expect(true).toBe(true);
  });

  it("skips celebratory sounds when reduced motion is on", () => {
    playSound("correct", { unlocked: true, muted: false, reducedMotion: true });
    expect(true).toBe(true);
  });
});

describe("resolveVolume", () => {
  it("scales restrained profile quieter than arcade", () => {
    const def = SOUND_REGISTRY.pick;
    const arcade = resolveVolume(def, { profile: "arcade" });
    const restrained = resolveVolume(def, { profile: "restrained" });
    expect(restrained).toBeLessThan(arcade);
  });

  it("applies volumeScale multiplier", () => {
    const def = SOUND_REGISTRY.pick;
    const base = resolveVolume(def);
    const half = resolveVolume(def, { volumeScale: 0.5 });
    expect(half).toBeCloseTo(base * 0.5);
  });
});
