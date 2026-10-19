"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";
import { FinishBellCurve } from "@/components/daily/finish-bell-curve";
import { FinishBackToPuzzles } from "@/components/daily/finish-debate";
import { FinishRun } from "@/components/daily/finish-run";
import { FinishStreak } from "@/components/daily/finish-streak";
import { FinishUpNext } from "@/components/daily/finish-up-next";
import { ShareResult } from "@/components/daily/share-result";
import { DEBATE_GAME, PUZZLE_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";
import { formatCountdown, msUntilNextDailyDay } from "@/lib/games/today";
import { useStreak } from "@/lib/streak/context";
import { readStreakStore } from "@/lib/streak/storage";
import { sweepCount } from "@/lib/streak/sweep";

export interface FinishSecondary {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface FinishCurve {
  percentile: number;
  lowLabel: string;
  highLabel: string;
}

export interface FinishScreenProps {
  gameId: DailyGameId;
  open: boolean;
  onClose: () => void;
  /** The game's own result, in the game's own markup and classes. */
  result: ReactNode;
  shareText: string;
  secondary?: FinishSecondary;
  /** Competitive games only. Leave out, or pass null, and no curve is drawn. */
  curve?: FinishCurve | null;
  /** Extra CSS variables. `--fin-result-w` widens the result (default 440px). */
  theme?: CSSProperties;
  ariaLabel?: string;
}

function useCountdown(): string {
  const [text, setText] = useState(() => formatCountdown(msUntilNextDailyDay(Date.now())));

  useEffect(() => {
    const tick = () => setText(formatCountdown(msUntilNextDailyDay(Date.now())));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return text;
}

/**
 * The screen every daily ends on: the run, the game's result, where to go next and why to come
 * back. Hot Takes is an opinion, not a puzzle, so its screen leaves out the puzzle run.
 */
export function FinishScreen({
  gameId,
  open,
  onClose,
  result,
  shareText,
  secondary,
  curve,
  theme,
  ariaLabel = "Daily complete",
}: FinishScreenProps) {
  const { streaks } = useStreak();
  const countdown = useCountdown();
  const game = getGame(gameId);

  // The finish screen is only ever open for a game that was played today, so it counts
  // even before the streak store has caught up (or when it is empty).
  const played = useMemo(
    () => new Set<DailyGameId>([gameId, ...streaks.filter((s) => s.playedToday).map((s) => s.id)]),
    [gameId, streaks],
  );
  const streak = Math.max(1, streaks.find((s) => s.id === gameId)?.currentStreak ?? 0);
  const isDebate = gameId === DEBATE_GAME;
  const allDone = PUZZLE_GAMES.every((id) => played.has(id));

  // Only the Sweep panel shows the count, and the overlay only renders in the browser once open.
  const sweeps = open && allDone && !isDebate ? sweepCount(readStreakStore()) : 0;

  // The overlay is drawn outside the game page, so it needs the game's colours handed to it.
  const style = {
    "--bg": game.theme.page,
    "--text": game.theme.text,
    "--text-dim": game.theme.muted,
    "--fin-acc": game.theme.accent,
    ...theme,
  } as CSSProperties;

  return (
    <DailyCompleteOverlay
      open={open}
      onClose={onClose}
      ariaLabel={ariaLabel}
      style={style}
      headerExtra={
        <span className="fin-top-streak" title={`${streak} day streak`}>
          <span className="fin-flame" aria-hidden="true">
            🔥
          </span>{" "}
          {streak}
        </span>
      }
    >
      <div className="fin" data-game={gameId}>
        {isDebate ? null : <FinishRun gameId={gameId} played={played} />}

        <div className="fin-result">{result}</div>

        {curve ? <FinishBellCurve {...curve} /> : null}

        <div className="fin-actions">
          <ShareResult gameId={gameId} text={shareText} label={isDebate ? "Start an argument" : undefined} />
          {secondary?.href ? (
            <Link href={secondary.href} className="fin-ghost" onClick={secondary.onClick}>
              {secondary.label}
            </Link>
          ) : secondary ? (
            <button type="button" className="fin-ghost" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          ) : null}
        </div>

        {isDebate ? (
          <FinishBackToPuzzles played={played} />
        ) : (
          <FinishUpNext gameId={gameId} played={played} sweeps={sweeps} countdown={countdown} />
        )}

        <FinishStreak streak={streak} />

        {/* The Sweep panel carries its own countdown. */}
        {allDone && !isDebate ? null : (
          <p className="fin-countdown" data-testid="finish-countdown">
            New puzzles in {countdown}
          </p>
        )}
      </div>
    </DailyCompleteOverlay>
  );
}
