import type { SynthKey } from "./types";

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
  }
  return audioContext;
}

export async function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    await ctx.resume();
  }
}

export function playSynth(key: SynthKey, volume = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, now);

  const osc = ctx.createOscillator();
  osc.connect(gain);
  osc.type = key === "error" ? "sawtooth" : "sine";

  const presets: Record<
    SynthKey,
    { freq: number; duration: number; attack: number; release: number; type?: OscillatorType }
  > = {
    tap: { freq: 600, duration: 0.05, attack: 0.005, release: 0.04 },
    tick: { freq: 800, duration: 0.06, attack: 0.002, release: 0.05 },
    whoosh: { freq: 320, duration: 0.12, attack: 0.01, release: 0.1 },
    error: { freq: 140, duration: 0.15, attack: 0.005, release: 0.12, type: "sawtooth" },
    turn: { freq: 520, duration: 0.18, attack: 0.01, release: 0.14 },
    phase: { freq: 440, duration: 0.2, attack: 0.01, release: 0.16 },
    hint: { freq: 740, duration: 0.14, attack: 0.005, release: 0.12 },
  };

  const preset = presets[key];
  osc.type = preset.type ?? "sine";
  osc.frequency.setValueAtTime(preset.freq, now);
  if (key === "whoosh") {
    osc.frequency.exponentialRampToValueAtTime(preset.freq * 2.2, now + preset.duration);
  }
  if (key === "hint") {
    osc.frequency.exponentialRampToValueAtTime(preset.freq * 1.4, now + preset.duration * 0.6);
  }

  const peak = Math.max(0.0001, volume);
  gain.gain.exponentialRampToValueAtTime(peak, now + preset.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);

  osc.start(now);
  osc.stop(now + preset.duration + 0.02);
}
