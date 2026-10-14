"use client";

import Link from "next/link";
import { useState } from "react";
import { IntroCount, IntroToday } from "@/components/daily-intro/intro-meta";
import { TOTAL_TIME } from "@/lib/ball-knowledge/game-logic";
import { useDemoLoop } from "@/lib/daily-intro/use-demo-loop";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * The list under today's real category fills with blurred stand-ins, never real answers, so the
 * intro shows the pace of a round without giving any of today's answers away. Widths are in
 * characters; `miss` rows are wrong guesses, which cost nothing.
 */
const ROWS = [
  { w: 8 }, { w: 6 }, { w: 7 }, { w: 9 }, { w: 5 }, { w: 7, miss: true },
  { w: 6 }, { w: 4 }, { w: 8 }, { w: 9 }, { w: 6 }, { w: 7 },
] as const;

/** Each row's list number; misses get none. */
const NUMBERS = ROWS.reduce<(number | null)[]>((acc, row) => {
  const last = acc.findLast((x) => x !== null) ?? 0;
  return [...acc, "miss" in row && row.miss ? null : last + 1];
}, []);

/** Seconds left and how many rows are in, while the clock runs down faster than real time. */
function useListDemo(enabled: boolean): { left: number; shown: number } {
  const [state, setState] = useState({ left: TOTAL_TIME, shown: 0 });

  useDemoLoop(async (wait) => {
    for (;;) {
      setState({ left: TOTAL_TIME, shown: 0 });
      await wait(900);
      for (let t = TOTAL_TIME; t >= 0; t--) {
        const shown = Math.min(ROWS.length, Math.floor(((TOTAL_TIME - t) / TOTAL_TIME) * (ROWS.length + 1)));
        setState({ left: t, shown });
        await wait(110);
      }
      await wait(1900);
    }
  }, enabled);

  return enabled ? state : { left: TOTAL_TIME, shown: ROWS.length };
}

export function BallKnowledgeIntro({
  pending,
  category,
  onPlay,
}: {
  pending: boolean;
  category: string;
  onPlay: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const demo = useListDemo(!pending && !reducedMotion);

  return (
    <section className="bki" aria-label="Ball Knowledge" data-intro-pending={pending || undefined}>
      <div className="bki-top">
        <Link href="/" className="bki-back">
          &larr; Stim Games
        </Link>
      </div>

      <IntroToday game="ball-knowledge" />
      <h1 className="bki-wordmark">
        Ball <span>Knowledge</span>
      </h1>
      <p className="bki-pitch">One category, 60 seconds. Name as many as you can before the buzzer.</p>

      <div className="bki-panel">
        <div className="bki-eyebrow">
          <span>Today&apos;s category</span>
          <b aria-hidden="true">0:{String(demo.left).padStart(2, "0")}</b>
        </div>
        <h2 className="bki-category">{category}</h2>
        <div className="bki-bar" aria-hidden="true">
          <i style={{ width: `${(demo.left / TOTAL_TIME) * 100}%` }} />
        </div>
        <ol className="bki-list" aria-hidden="true">
          {ROWS.slice(0, demo.shown).map((row, i) => {
            const number = NUMBERS[i];
            return (
              <li key={i} className={number === null ? "is-miss" : undefined}>
                <span className="bki-n">{number === null ? "–" : `${number}.`}</span>
                <span className="bki-blur" style={{ width: `${row.w * 0.62}em` }} />
              </li>
            );
          })}
        </ol>
      </div>

      <p className="bki-rules">
        <span>
          <b>{TOTAL_TIME}s</b>on the clock
        </span>
        <span>
          <b>no</b>penalty for misses
        </span>
        <span>
          <b>close</b>spelling counts
        </span>
      </p>
      <button type="button" className="bki-play" onClick={onPlay}>
        Start the clock
      </button>
      <IntroCount game="ball-knowledge" fallback="Today's category is fresh. Set the number to beat." />
    </section>
  );
}
