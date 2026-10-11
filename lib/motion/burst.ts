import { PRESETS, type ConfettiPreset } from "./confetti";
import type { JuiceLevel } from "./juice-level";
import { prefersReducedMotion } from "./prefers-reduced-motion";

export async function burstFrom(
  el: HTMLElement | null,
  level: JuiceLevel = 0,
  preset: ConfettiPreset = "gold",
  options: { zIndex?: number; particles?: number } = {},
): Promise<void> {
  if (typeof window === "undefined" || !el || prefersReducedMotion()) return;

  const rect = el.getBoundingClientRect();
  const { default: confetti } = await import("canvas-confetti");

  confetti({
    particleCount: options.particles ?? 14 + 12 * level,
    spread: 60 + 12 * level,
    startVelocity: 20 + 4 * level,
    ticks: 70,
    gravity: 1.3,
    scalar: 0.7,
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    colors: [...PRESETS[preset]],
    zIndex: options.zIndex,
    disableForReducedMotion: true,
  });
}
