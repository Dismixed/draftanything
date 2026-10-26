"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/track";
import type { DailyGameId } from "@/lib/games/registry";
import { clearDirectPlay, directPlaySource } from "./direct-play";
import { useReportIntroPhase } from "./intro-scope";

/**
 * - `checking`: the game has not read its saved state yet, or is starting without its intro
 *   because the player came from the home page. The intro renders but stays hidden, so its text
 *   is in the server HTML and a returning player never sees it flash.
 * - `intro`: today's puzzle has not been started.
 * - `game`: the player pressed Play, or today's puzzle is already in progress or finished.
 */
export type IntroPhase = "checking" | "intro" | "game";

/**
 * How a run began, sent with `daily_started`: Play on the intro, Play on the intro of a shared
 * result link (`?ref=share`), or started without the intro from the home page or a finish screen.
 */
export type DailyEntry = "intro" | "share" | "direct" | "finish";

interface Options {
  /** True once the game knows whether today's puzzle was started. */
  ready: boolean;
  /** True when today's puzzle is in progress or finished, so the intro is skipped. */
  skip: boolean;
  /**
   * True when today's run is already finished but the game still opens through its intro
   * (Brain Dead's hub). Going in then shows the result, so it does not count as a start.
   */
  done?: boolean;
  /**
   * Starts today's puzzle, both from Play and when the intro is skipped. Resolve `false` when
   * the puzzle could not start, to show the intro instead.
   */
  start?: () => void | Promise<boolean>;
}

/** Shared result links open the game with `?ref=share` (lib/share/share-text.ts). */
function introEntry(): DailyEntry {
  return new URLSearchParams(window.location.search).get("ref") === "share" ? "share" : "intro";
}

export function useDailyIntro(game: DailyGameId, { ready, skip, done = false, start }: Options) {
  const [played, setPlayed] = useState(false);
  const [direct, setDirect] = useState(() => directPlaySource(game));
  const startRef = useRef(start);
  const doneRef = useRef(done);
  const autoStarted = useRef(false);

  const starting = direct !== null && ready && !played && !skip;
  const phase: IntroPhase = !ready || starting ? "checking" : played || skip ? "game" : "intro";
  useReportIntroPhase(phase);

  useEffect(() => {
    startRef.current = start;
    doneRef.current = done;
  });

  useEffect(() => {
    clearDirectPlay(game);
  }, [game]);

  const begin = useCallback(
    (entry: DailyEntry) => {
      const finish = (started: boolean) => {
        if (!started) {
          setDirect(null);
          return;
        }
        setPlayed(true);
        if (!doneRef.current) track("daily_started", { game, entry });
      };
      const result = startRef.current?.();
      if (result instanceof Promise) void result.then(finish);
      else finish(true);
    },
    [game],
  );

  useEffect(() => {
    if (!starting || autoStarted.current) return;
    autoStarted.current = true;
    begin(direct === "finish" ? "finish" : "direct");
  }, [starting, direct, begin]);

  const play = useCallback(() => {
    track("daily_intro_play_clicked", { game });
    begin(introEntry());
  }, [game, begin]);

  return { phase, play };
}
