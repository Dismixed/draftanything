"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./prefers-reduced-motion";

export function useCountUp(
  target: number,
  active: boolean,
  durationMs = 800,
  fromPrevious = false,
): number {
  const [value, setValue] = useState(active ? 0 : target);
  const shownRef = useRef(value);

  useEffect(() => {
    const show = (next: number) => {
      shownRef.current = next;
      setValue(next);
    };

    if (!active || prefersReducedMotion()) {
      show(target);
      return;
    }

    const from = fromPrevious ? shownRef.current : 0;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      show(Math.round(from + (target - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    if (!fromPrevious) show(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, durationMs, fromPrevious]);

  return value;
}
