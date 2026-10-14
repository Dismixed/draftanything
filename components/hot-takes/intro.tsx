"use client";

import Link from "next/link";
import { useState } from "react";
import { IntroCount, IntroToday } from "@/components/daily-intro/intro-meta";
import { GameTitle } from "@/components/ui/game-title";
import { useDemoLoop } from "@/lib/daily-intro/use-demo-loop";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

const TIERS = ["S", "A", "B", "C", "D"] as const;
type Tier = (typeof TIERS)[number];

/** Where the demo drops each slip. These are made-up placements, not anyone's ranking. */
const DEMO_TIERS: Tier[] = ["S", "A", "C", "S", "B", "D", "A"];

/** Slips land one by one, then the stamp marks the end of the ranking. */
function useSlipDemo(count: number, enabled: boolean): { placed: number; holding: number | null; stamped: boolean } {
  const [state, setState] = useState<{ placed: number; holding: number | null; stamped: boolean }>({
    placed: 0,
    holding: null,
    stamped: false,
  });

  useDemoLoop(async (wait) => {
    for (;;) {
      setState({ placed: 0, holding: null, stamped: false });
      await wait(400);
      for (let i = 0; i < count; i++) {
        setState({ placed: i, holding: i, stamped: false });
        await wait(600);
        setState({ placed: i + 1, holding: null, stamped: false });
        await wait(400);
      }
      setState({ placed: count, holding: null, stamped: true });
      await wait(2000);
    }
  }, enabled && count > 0);

  return enabled ? state : { placed: count, holding: null, stamped: true };
}

export function HotTakesIntro({
  pending,
  category,
  labels,
  onPlay,
}: {
  pending: boolean;
  category: string;
  /** Today's item labels. They are the board itself, so showing them gives nothing away. */
  labels: string[];
  onPlay: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const slips = labels.slice(0, DEMO_TIERS.length);
  const demo = useSlipDemo(slips.length, !pending && !reducedMotion);

  return (
    <section className="hti" aria-label="Hot Takes" data-intro-pending={pending || undefined}>
      <div className="hti-top">
        <Link href="/" className="hot-takes-back">
          &larr; Stim Games
        </Link>
      </div>

      <IntroToday game="hot-takes" />
      <h1 className="hti-wordmark">
        <GameTitle game="hot-takes" />
      </h1>
      <p className="hti-category">
        <small>Today&apos;s category</small>
        <b>{category}</b>
      </p>

      <div className="hti-stage" aria-hidden="true">
        <span className={`hti-hold${demo.holding === null ? "" : " is-on"}`}>
          {demo.holding === null ? " " : slips[demo.holding]}
        </span>
        <span className={`hti-stamp${demo.stamped ? " is-on" : ""}`}>🔥</span>
        <div className="hti-tiers">
          {TIERS.map((tier) => (
            <div key={tier} className={`hti-tier hti-tier-${tier}`}>
              <b>{tier}</b>
              <div className="hti-slips">
                {slips.slice(0, demo.placed).map((label, i) =>
                  DEMO_TIERS[i] === tier ? (
                    <span key={label} className="hti-slip">
                      {label}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="hti-rules">
        <span>
          <b>{labels.length}</b>items
        </span>
        <span>
          <b>S–D</b>tiers
        </span>
        <span>
          <b>lock</b>it in
        </span>
      </p>
      <button type="button" className="hti-play" onClick={onPlay}>
        Start ranking
      </button>
      <IntroCount game="hot-takes" fallback={`${labels.length} items, one ranking. Make yours.`} />
    </section>
  );
}
