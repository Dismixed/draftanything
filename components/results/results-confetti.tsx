"use client";

import { useEffect } from "react";

const COLORS = ["#c9a84c", "#f0c860", "#7c3aff", "#00e5ff", "#ffffff"];

export function ResultsConfetti() {
  useEffect(() => {
    let cancelled = false;
    let sideBurst: number | undefined;

    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;

      confetti({
        particleCount: 90,
        spread: 72,
        origin: { y: 0.28, x: 0.5 },
        colors: COLORS,
        ticks: 220,
        gravity: 1.05,
        scalar: 1.15,
        disableForReducedMotion: true,
      });

      sideBurst = window.setTimeout(() => {
        if (cancelled) return;

        confetti({
          particleCount: 45,
          angle: 60,
          spread: 58,
          origin: { x: 0, y: 0.55 },
          colors: COLORS,
          disableForReducedMotion: true,
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 58,
          origin: { x: 1, y: 0.55 },
          colors: COLORS,
          disableForReducedMotion: true,
        });
      }, 280);
    });

    return () => {
      cancelled = true;
      if (sideBurst !== undefined) window.clearTimeout(sideBurst);
    };
  }, []);

  return null;
}
