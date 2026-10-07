"use client";

import { useEffect, useRef } from "react";
import { lifeSignsTier, tracePath, traceSeconds } from "@/lib/brain-dead/life-signs";
import { triggerAnimation } from "@/lib/motion/trigger-class";

/**
 * The streak as a brain monitor running across the screen. Flat at zero, busier and hotter
 * with each correct answer, and flat again the moment the run ends.
 */
export function LifeSigns({ streak, dead }: { streak: number; dead: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const previous = useRef(streak);

  // Jolt the trace whenever the streak goes up.
  useEffect(() => {
    if (streak > previous.current) triggerAnimation(rootRef.current, "is-surging", 720);
    previous.current = streak;
  }, [streak]);

  const shown = dead ? 0 : streak;

  return (
    <div
      ref={rootRef}
      className={`bd-ls${dead ? " is-dead" : ""}`}
      data-tier={lifeSignsTier(shown)}
      aria-hidden="true"
    >
      <div className="bd-ls-wave">
        <svg
          viewBox="0 0 2000 96"
          preserveAspectRatio="none"
          style={{ animationDuration: `${traceSeconds(shown)}s` }}
        >
          <path d={tracePath(shown)} />
        </svg>
      </div>
    </div>
  );
}
