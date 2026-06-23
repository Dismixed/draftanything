const PRESETS = {
  gold: ["#c9a84c", "#f0c860", "#7c3aff", "#00e5ff", "#ffffff"],
  "brain-dead": ["#ff3c3c", "#f0c860", "#ffffff", "#ef4444", "#c9a84c"],
} as const;

export type ConfettiPreset = keyof typeof PRESETS;

export async function fireConfetti(preset: ConfettiPreset = "gold"): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const { default: confetti } = await import("canvas-confetti");
  const colors = PRESETS[preset];

  confetti({
    particleCount: 90,
    spread: 72,
    origin: { y: 0.28, x: 0.5 },
    colors: [...colors],
    ticks: 220,
    gravity: 1.05,
    scalar: 1.15,
    disableForReducedMotion: true,
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 45,
      angle: 60,
      spread: 58,
      origin: { x: 0, y: 0.55 },
      colors: [...colors],
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 45,
      angle: 120,
      spread: 58,
      origin: { x: 1, y: 0.55 },
      colors: [...colors],
      disableForReducedMotion: true,
    });
  }, 280);
}
