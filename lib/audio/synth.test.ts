import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAudioContext, playSynth } from "./synth";

describe("playSynth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not throw without audio context", () => {
    expect(() => playSynth("tap", 0.3)).not.toThrow();
  });

  it("creates audio context in browser", () => {
    const mockCtx = {
      currentTime: 0,
      state: "running",
      createGain: () => ({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      }),
      createOscillator: () => ({
        connect: vi.fn(),
        type: "sine",
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        start: vi.fn(),
        stop: vi.fn(),
      }),
      destination: {},
    };

    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          return mockCtx;
        }
      },
    );

    playSynth("tap", 0.3);
    expect(getAudioContext()).toBeTruthy();
  });
});
