"use client";

import Link from "next/link";
import { useState } from "react";
import { IntroCount, IntroToday } from "@/components/daily-intro/intro-meta";
import { GameTitle } from "@/components/ui/game-title";
import { track } from "@/lib/analytics/track";
import { useDemoLoop } from "@/lib/daily-intro/use-demo-loop";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

const DEMO = [
  { category: "Science", question: "Which planet has the most moons?", answer: "Saturn ✓" },
  { category: "History", question: "What year did the Berlin Wall fall?", answer: "1989 ✓" },
  { category: "Science", question: "Which element has the symbol W?", answer: "Tin ✗ · it was Tungsten. Run over." },
];

interface Monitor {
  index: number;
  ticker: string;
  dead: boolean;
  /** Bumped per question so the timer bar restarts its drain. */
  round: number;
}

const START: Monitor = { index: 0, ticker: "", dead: false, round: 0 };
const STILL: Monitor = { index: 2, ticker: DEMO[2]!.answer, dead: true, round: 0 };

/** Two right answers, then a miss that flatlines the monitor, on a loop. */
function useMonitorDemo(enabled: boolean): Monitor {
  const [monitor, setMonitor] = useState<Monitor>(START);

  useDemoLoop(async (wait) => {
    let round = 0;
    for (;;) {
      for (let i = 0; i < DEMO.length; i++) {
        round++;
        setMonitor({ index: i, ticker: "", dead: false, round });
        const { question, answer } = DEMO[i]!;
        for (let k = 1; k <= question.length; k++) {
          setMonitor((m) => ({ ...m, ticker: question.slice(0, k) }));
          await wait(28);
        }
        await wait(800);
        const last = i === DEMO.length - 1;
        setMonitor((m) => ({ ...m, ticker: answer, dead: last }));
        await wait(last ? 2600 : 700);
      }
    }
  }, enabled);

  return enabled ? monitor : STILL;
}

const TRACE = (() => {
  let d = "M0 50";
  for (let x = 0; x < 400; x += 50) {
    d += ` L${x + 18} 50 L${x + 22} 38 L${x + 26} 70 L${x + 30} 6 L${x + 34} 80 L${x + 38} 50 L${x + 50} 50`;
  }
  return d;
})();

export function BrainDeadIntro({
  pending,
  done,
  onPlay,
}: {
  pending: boolean;
  /** Today's run is finished, so the main button opens the result instead. */
  done: boolean;
  onPlay: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const monitor = useMonitorDemo(!pending && !reducedMotion);
  const { category } = DEMO[monitor.index]!;

  return (
    <section className="bdi" aria-label="Brain Dead" data-intro-pending={pending || undefined}>
      <div className="bdi-top">
        <Link href="/" className="bd-back">
          &larr; Stim Games
        </Link>
      </div>

      <IntroToday game="brain-dead" />
      <GameTitle game="brain-dead" as="h1" className="bdi-wordmark" />
      <p className="bdi-pitch">
        Fifteen questions, getting harder. <b>One wrong answer ends the run.</b>
      </p>

      <div className={`bdi-monitor${monitor.dead ? " is-dead" : ""}`} aria-hidden="true">
        <div className="bdi-mon-top">
          <span>{category}</span>
          <span className="bdi-live">● Live</span>
        </div>
        <div className="bdi-mon-mid">
          <div className={`bdi-trace${monitor.dead ? " is-flat" : ""}${reducedMotion ? " is-still" : ""}`}>
            <svg viewBox="0 0 400 100" preserveAspectRatio="none">
              <path d={TRACE} />
            </svg>
            <i />
          </div>
          <div className="bdi-readout">
            <small>Question</small>
            <b>{monitor.index + 1}</b>
            <span>/15</span>
          </div>
        </div>
        <div className="bdi-timer">
          <i key={monitor.round} className={monitor.dead || reducedMotion ? "is-stopped" : undefined} />
        </div>
        <p className="bdi-ticker">{monitor.ticker}</p>
      </div>

      <p className="bdi-teaser">
        <b>15 questions</b> · 5 easy, 5 medium, 5 hard · 30s each
      </p>

      <div className="bdi-actions">
        <button type="button" className="bdi-play" onClick={onPlay}>
          {done ? "See today's result" : "Start today's run"}
        </button>
        <Link
          href="/brain-dead/freeplay"
          className="bdi-free"
          onClick={() => track("daily_intro_freeplay_clicked", { game: "brain-dead" })}
        >
          Free play
        </Link>
      </div>
      <IntroCount game="brain-dead" fallback="Today's run is fresh. Set the bar." />
    </section>
  );
}
