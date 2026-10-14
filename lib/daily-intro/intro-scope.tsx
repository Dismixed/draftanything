"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { IntroPhase } from "./use-daily-intro";

const IntroScopeContext = createContext<{ phase: IntroPhase; setPhase: (phase: IntroPhase) => void } | null>(null);

/**
 * Lets a page show things alongside a game's intro (its About section) that sit outside the
 * game's own layout. The game reports its phase through `useDailyIntro`.
 */
export function DailyIntroScope({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<IntroPhase>("checking");
  return <IntroScopeContext.Provider value={{ phase, setPhase }}>{children}</IntroScopeContext.Provider>;
}

/** Renders `children` until the game takes over the page, including in the server HTML. */
export function IntroOnly({ children }: { children: ReactNode }) {
  const phase = useContext(IntroScopeContext)?.phase;
  return phase === "game" ? null : <div hidden={phase === "checking"}>{children}</div>;
}

export function useReportIntroPhase(phase: IntroPhase): void {
  const setPhase = useContext(IntroScopeContext)?.setPhase;
  useEffect(() => {
    setPhase?.(phase);
  }, [phase, setPhase]);
}
