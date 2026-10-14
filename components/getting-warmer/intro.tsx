"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties } from "react";
import { IntroCount, IntroToday } from "@/components/daily-intro/intro-meta";
import { useDemoLoop } from "@/lib/daily-intro/use-demo-loop";
import { INITIAL_CLUES } from "@/lib/getting-warmer/game-logic";
import { HEAT_LABELS } from "@/lib/getting-warmer/heat";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/** A made-up puzzle, never today's: the answer is LIGHTHOUSE. */
const CLUES = ["It stands by the sea.", "It has a keeper.", "It shines at night.", "Ships steer by it."];
const GUESSES = ["boat", "beacon", "lighthouse"];

/** Per heat level: how far the orange fills the wordmark, how strong the haze and embers are. */
const FILL = ["100%", "78%", "58%", "36%", "0%"];
const SHIMMER = [0.8, 1.3, 2, 2.7, 3.4];
const GLOW = [0.15, 0.3, 0.5, 0.75, 1];

const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: -((i * 613) % 4200),
  drift: ((i * 29) % 80) - 40,
  duration: 2600 + ((i * 271) % 1900),
}));

interface Demo {
  clues: number;
  guesses: number;
  heat: number;
}

const SOLVED: Demo = { clues: CLUES.length, guesses: GUESSES.length, heat: HEAT_LABELS.length - 1 };

/** Plays once: two clues, two misses that each add a clue, then the solve, which holds. */
function useWarmDemo(enabled: boolean): Demo {
  const [demo, setDemo] = useState<Demo>({ clues: 0, guesses: 0, heat: 0 });

  useDemoLoop(async (wait) => {
    setDemo({ clues: 0, guesses: 0, heat: 0 });
    await wait(500);
    setDemo({ clues: 1, guesses: 0, heat: 0 });
    await wait(250);
    setDemo({ clues: INITIAL_CLUES, guesses: 0, heat: 1 });
    await wait(1500);
    for (let miss = 1; miss <= 2; miss++) {
      setDemo((d) => ({ ...d, guesses: miss }));
      await wait(450);
      setDemo((d) => ({ ...d, clues: INITIAL_CLUES + miss, heat: 1 + miss }));
      await wait(1300);
    }
    setDemo(SOLVED);
  }, enabled);

  return enabled ? demo : SOLVED;
}

export function GettingWarmerIntro({ pending, onPlay }: { pending: boolean; onPlay: () => void }) {
  const reducedMotion = useReducedMotion();
  const demo = useWarmDemo(!pending && !reducedMotion);
  const hazeId = `gw-haze-${useId().replace(/:/g, "")}`;
  const solved = demo.heat === HEAT_LABELS.length - 1;

  return (
    <section
      className={`gwi${solved ? " is-solved" : ""}`}
      aria-label="Getting Warmer"
      data-intro-pending={pending || undefined}
      style={{ "--gwi-heat": GLOW[demo.heat] } as CSSProperties}
    >
      <svg width="0" height="0" className="gwi-defs" aria-hidden="true">
        <filter id={hazeId} x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.07" numOctaves={2} seed={3}>
            {!reducedMotion && (
              <animate
                attributeName="baseFrequency"
                dur="2.4s"
                values="0.008 0.07;0.011 0.1;0.008 0.07"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale={reducedMotion ? 0 : SHIMMER[demo.heat]} />
        </filter>
      </svg>
      <div className="gwi-warmth" aria-hidden="true" />
      <div className="gwi-embers" aria-hidden="true">
        {EMBERS.map((e, i) => (
          <i
            key={i}
            style={
              {
                left: `${e.left}%`,
                "--dx": `${e.drift}px`,
                animationDelay: `${e.delay}ms`,
                animationDuration: `${e.duration}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="gwi-top">
        <Link href="/" className="gw-bar-back">
          &larr; Stim Games
        </Link>
      </div>

      <IntroToday game="getting-warmer" />
      <h1
        className="gwi-wordmark"
        style={{ "--gwi-fill": FILL[demo.heat], filter: `url(#${hazeId})` } as CSSProperties}
      >
        Getting Warmer
      </h1>
      <span className={`gwi-chip gwi-lv${demo.heat}`}>
        <i aria-hidden="true" />
        {HEAT_LABELS[demo.heat]}
      </span>

      <ol className="gwi-clues" aria-hidden="true">
        {CLUES.slice(0, demo.clues).map((clue) => (
          <li key={clue}>{clue}</li>
        ))}
      </ol>
      <p className="gwi-tries" aria-hidden="true">
        {GUESSES.slice(0, demo.guesses).map((guess, i) => (
          <span key={guess} className={i === GUESSES.length - 1 ? "is-ok" : undefined}>
            {guess}
            {i === GUESSES.length - 1 && " ✓"}
          </span>
        ))}
      </p>

      <p className="gwi-rules">
        <span>
          <b>{INITIAL_CLUES}</b>clues to start
        </span>
        <span>
          <b>every miss</b>adds one
        </span>
        <span>
          <b>fewest</b>guesses wins
        </span>
      </p>
      <button type="button" className="gwi-play" onClick={onPlay}>
        Start guessing
      </button>
      <IntroCount game="getting-warmer" fallback="Today's word is still cold. Be one of the first to crack it." />
    </section>
  );
}
