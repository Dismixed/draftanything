import type { SoundDefinition, SoundId } from "./types";

export const SOUND_REGISTRY: Record<SoundId, SoundDefinition> = {
  "ui.tap": { type: "synth", synthKey: "tap", volume: 0.3, profile: "arcade" },
  "ui.tick": { type: "synth", synthKey: "tick", volume: 0.25, profile: "arcade" },
  "ui.whoosh": { type: "synth", synthKey: "whoosh", volume: 0.28, profile: "arcade" },
  "ui.error": { type: "synth", synthKey: "error", volume: 0.22, profile: "restrained" },
  turn: { type: "synth", synthKey: "turn", volume: 0.32, profile: "restrained" },
  phase: { type: "synth", synthKey: "phase", volume: 0.28, profile: "restrained" },
  hint: { type: "synth", synthKey: "hint", volume: 0.35, profile: "arcade" },
  correct: {
    type: "sample",
    src: "/sounds/correct.mp3",
    volume: 0.7,
    profile: "arcade",
    celebratory: true,
  },
  wrong: {
    type: "sample",
    src: "/sounds/wrong.mp3",
    volume: 0.65,
    profile: "arcade",
    celebratory: true,
  },
  win: {
    type: "sample",
    src: "/sounds/win.mp3",
    volume: 0.7,
    profile: "arcade",
    celebratory: true,
  },
  streak: {
    type: "sample",
    src: "/sounds/streak.mp3",
    volume: 0.6,
    profile: "arcade",
    celebratory: true,
  },
  pick: {
    type: "sample",
    src: "/sounds/pick.mp3",
    volume: 0.5,
    profile: "restrained",
  },
  veto: {
    type: "sample",
    src: "/sounds/veto.mp3",
    volume: 0.4,
    profile: "restrained",
  },
  "veto-success": {
    type: "sample",
    src: "/sounds/veto-success.mp3",
    volume: 0.4,
    profile: "restrained",
  },
};

export const SAMPLE_SRCS = Object.values(SOUND_REGISTRY)
  .filter((def): def is Extract<SoundDefinition, { type: "sample" }> => def.type === "sample")
  .map((def) => def.src);

const PROFILE_SCALE: Record<SoundDefinition["profile"], number> = {
  arcade: 1,
  restrained: 0.55,
};

export function resolveVolume(
  def: SoundDefinition,
  options?: { profile?: SoundDefinition["profile"]; volumeScale?: number },
): number {
  const profile = options?.profile ?? def.profile;
  const scale = PROFILE_SCALE[profile];
  const extra = options?.volumeScale ?? 1;
  return def.volume * scale * extra;
}
