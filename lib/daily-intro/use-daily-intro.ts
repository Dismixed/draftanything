"use client";

import { useCallback, useState } from "react";
import { track } from "@/lib/analytics/track";
import type { DailyGameId } from "@/lib/games/registry";
import { useReportIntroPhase } from "./intro-scope";

/**
 * - `checking`: the game has not read its saved state yet. The intro renders but stays hidden,
 *   so its text is in the server HTML and a returning player never sees it flash.
 * - `intro`: today's puzzle has not been started.
 * - `game`: the player pressed Play, or today's puzzle is already in progress or finished.
 */
export type IntroPhase = "checking" | "intro" | "game";

interface Options {
  /** True once the game knows whether today's puzzle was started. */
  ready: boolean;
  /** True when today's puzzle is in progress or finished, so the intro is skipped. */
  skip: boolean;
}

export function useDailyIntro(game: DailyGameId, { ready, skip }: Options) {
  const [played, setPlayed] = useState(false);
  const phase: IntroPhase = !ready ? "checking" : played || skip ? "game" : "intro";
  useReportIntroPhase(phase);

  const play = useCallback(() => {
    track("daily_intro_play_clicked", { game });
    setPlayed(true);
  }, [game]);

  return { phase, play };
}
