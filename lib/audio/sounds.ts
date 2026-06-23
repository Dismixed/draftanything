import type { SoundDefinition, SoundId } from "./types";

export const SOUND_REGISTRY: Record<SoundId, SoundDefinition> = {
  "ui.tap": { type: "synth", synthKey: "tap", volume: 0.3, profile: "arcade" },
  "ui.tick": { type: "synth", synthKey: "tick", volume: 0.25, profile: "arcade" },
  "ui.whoosh": { type: "synth", synthKey: "whoosh", volume: 0.28, profile: "arcade" },
  "ui.error": { type: "synth", synthKey: "error", volume: 0.22, profile: "restrained" },
  "draft.on-clock": {
    type: "sample",
    src: "/sounds/nfl-draft-chime.mp3",
    volume: 0.85,
    profile: "restrained",
    draftOnly: true,
  },
  phase: { type: "synth", synthKey: "phase", volume: 0.28, profile: "restrained" },
  hint: { type: "synth", synthKey: "hint", volume: 0.35, profile: "arcade" },
  correct: {
    type: "sample",
    src: "/sounds/correct.wav",
    volume: 0.7,
    profile: "arcade",
    celebratory: true,
  },
  wrong: {
    type: "sample",
    src: "/sounds/wrong.wav",
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
    src: "/sounds/streak.wav",
    volume: 0.6,
    profile: "arcade",
    celebratory: true,
  },
  pick: {
    type: "sample",
    src: "/sounds/pick.wav",
    volume: 0.5,
    profile: "restrained",
  },
  veto: {
    type: "sample",
    src: "/sounds/veto.wav",
    volume: 0.4,
    profile: "restrained",
  },
  "veto-success": {
    type: "sample",
    src: "/sounds/veto-success.wav",
    volume: 0.4,
    profile: "restrained",
  },
};

function isSample(
  def: SoundDefinition,
): def is Extract<SoundDefinition, { type: "sample" }> {
  return def.type === "sample";
}

/** Preloaded globally (hub, Chainlink, Brain Dead, etc.). */
export const SAMPLE_SRCS = Object.values(SOUND_REGISTRY)
  .filter(isSample)
  .filter((def) => !def.draftOnly)
  .map((def) => def.src);

/** Preloaded when entering a Draft Anything room. */
export const DRAFT_SAMPLE_SRCS = Object.values(SOUND_REGISTRY)
  .filter(isSample)
  .filter((def) => def.draftOnly)
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
