"use client";

import Link from "next/link";
import { useState } from "react";
import { IntroCount, IntroToday } from "@/components/daily-intro/intro-meta";
import { GameTitle } from "@/components/ui/game-title";
import { useDemoLoop } from "@/lib/daily-intro/use-demo-loop";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

const DEMO = ["snow", "ball", "park", "bench"];
const PHRASES = ["snowball", "ballpark", "park bench"];
const STEPS = ["Read the last word", "Type the next one", "Fewer misses wins"];

interface Demo {
  /** Rows up to this index are solved. Row 0 is the given start word. */
  solved: number;
  active: number | null;
  /** Letters typed into the active row, after its given first letter. */
  typed: number;
  step: number;
  caption: string;
}

const START: Demo = { solved: 0, active: null, typed: 0, step: -1, caption: "" };
const STILL: Demo = { solved: DEMO.length - 1, active: null, typed: 0, step: -1, caption: "" };

/** The demo chain: each row is read, typed in and linked, then the loop starts over. */
function useChainDemo(enabled: boolean): Demo {
  const [demo, setDemo] = useState<Demo>(START);

  useDemoLoop(async (wait) => {
    for (;;) {
      setDemo(START);
      await wait(700);
      for (let i = 1; i < DEMO.length; i++) {
        setDemo((d) => ({ ...d, active: i, typed: 0, step: 0, caption: `${DEMO[i - 1]!.toUpperCase()} + ?` }));
        await wait(900);
        setDemo((d) => ({ ...d, step: 1 }));
        for (let k = 1; k < DEMO[i]!.length; k++) {
          setDemo((d) => ({ ...d, typed: k }));
          await wait(200);
        }
        await wait(250);
        setDemo((d) => ({ ...d, solved: i, active: null, step: 2, caption: PHRASES[i - 1]! }));
        await wait(1160);
      }
      await wait(1600);
    }
  }, enabled);

  return enabled ? demo : STILL;
}

export interface ChainlinkTeaser {
  startWord: string;
  words: number;
}

export function ChainlinkIntro({
  pending,
  teaser,
  onPlay,
}: {
  pending: boolean;
  teaser: ChainlinkTeaser | null;
  onPlay: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const demo = useChainDemo(!pending && !reducedMotion);

  return (
    <section className="cli" aria-label="Chain Link" data-intro-pending={pending || undefined}>
      <div className="cli-top">
        <Link href="/" className="cl-back">
          &larr; Stim Games
        </Link>
      </div>

      <IntroToday game="chainlink" />
      <GameTitle game="chainlink" as="h1" className="cli-wordmark" />
      <p className="cli-pitch">Each word pairs with the one before it to make a common phrase.</p>

      <div className="cli-chain" aria-hidden="true">
        {DEMO.map((word, i) => {
          const solved = i <= demo.solved;
          const active = demo.active === i;
          return (
            <div key={word}>
              {i > 0 && <div className={`cli-link${solved ? " is-on" : ""}`} />}
              <div className={`cli-row${solved ? " is-solved" : ""}${active ? " is-active" : ""}`}>
                <span className="cli-cells">
                  {[...word].map((ch, pos) => {
                    const shown = pos === 0 || solved || (active && pos <= demo.typed);
                    return (
                      <span key={pos} className={`cli-cell${shown ? "" : " is-blank"}`}>
                        {shown ? ch : ""}
                      </span>
                    );
                  })}
                </span>
                <span className="cli-tag">{i === 0 ? "Start" : `${i + 1} / ${DEMO.length}`}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="cli-caption" aria-hidden="true">
        {demo.caption}
      </p>

      <ol className="cli-steps">
        {STEPS.map((step, i) => (
          <li key={step} className={demo.step === i ? "is-lit" : undefined}>
            {step}
          </li>
        ))}
      </ol>

      <p className="cli-teaser">
        {teaser ? (
          <>
            Today starts with <b>{teaser.startWord}</b> · {teaser.words} words
          </>
        ) : (
          <>One chain, one word at a time</>
        )}
      </p>

      <button type="button" className="cli-play" onClick={onPlay}>
        Play today&apos;s chain
      </button>
      <IntroCount game="chainlink" fallback="Today's chain is fresh. Be one of the first to finish it." />
    </section>
  );
}
