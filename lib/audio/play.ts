import { playSample } from "./samples";
import { resolveVolume, SOUND_REGISTRY } from "./sounds";
import { playSynth } from "./synth";
import type { PlayOptions, PlayState, SoundId } from "./types";

export function playSound(
  id: SoundId,
  state: PlayState,
  options?: PlayOptions,
): void {
  if (!state.unlocked || state.muted) return;

  const def = SOUND_REGISTRY[id];
  if (!def) return;

  if (state.reducedMotion && def.celebratory) return;

  const volume = resolveVolume(def, options);

  if (def.type === "synth") {
    playSynth(def.synthKey, volume);
    return;
  }

  playSample(def.src, volume);
}
