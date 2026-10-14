"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import type { DailyGameId } from "@/lib/games/registry";
import { clearDirectPlay, isDirectPlayRequested } from "./direct-play";
import { useReportIntroPhase } from "./intro-scope";

/**
 * - `checking`: the game has not read its saved state yet, or is starting without its intro
 *   because the player came from the home page. The intro renders but stays hidden, so its text
 *   is in the server HTML and a returning player never sees it flash.
 * - `intro`: today's puzzle has not been started.
 * - `game`: the player pressed Play, or today's puzzle is already in progress or finished.
 */
export type IntroPhase = "checking" | "intro" | "game";

interface Options {
  /** True once the game knows whether today's puzzle was started. */
  ready: boolean;
  /** True when today's puzzle is in progress or finished, so the intro is skipped. */
  skip: boolean;
  /**
   * Starts today's puzzle, both from Play and when the intro is skipped. Resolve `false` when
   * the puzzle could not start, to show the intro instead.
   */
  start?: () => void | Promise<boolean>;
}

export function useDailyIntro(game: DailyGameId, { ready, skip, start }: Options) {
  const [played, setPlayed] = useState(false);
  const [direct, setDirect] = useState(() => isDirectPlayRequested(game));
  const startRef = useRef(start);
  const autoStarted = useRef(false);

  const starting = direct && ready && !played && !skip;
  const phase: IntroPhase = !ready || starting ? "checking" : played || skip ? "game" : "intro";
  useReportIntroPhase(phase);

  useEffect(() => {
    startRef.current = start;
  });

  useEffect(() => {
    clearDirectPlay(game);
  }, [game]);

  const begin = useCallback(() => {
    const finish = (started: boolean) => (started ? setPlayed(true) : setDirect(false));
    const result = startRef.current?.();
    if (result instanceof Promise) void result.then(finish);
    else finish(true);
  }, []);

  useEffect(() => {
    if (!starting || autoStarted.current) return;
    autoStarted.current = true;
    begin();
  }, [starting, begin]);

  const play = useCallback(() => {
    track("daily_intro_play_clicked", { game });
    begin();
  }, [game, begin]);

  return { phase, play };
}
