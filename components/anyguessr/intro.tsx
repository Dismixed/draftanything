"use client";

import Link from "next/link";
import { useState } from "react";
import { IntroCount, IntroToday } from "@/components/daily-intro/intro-meta";
import { GameTitle } from "@/components/ui/game-title";
import {
  DAILY_CLUE_TYPE_LABEL,
  DAILY_MAX_ROUND_SCORE,
} from "@/lib/anyguessr/daily";
import { useDemoLoop } from "@/lib/daily-intro/use-demo-loop";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/** A rough world, one character per dot, 48 columns by 18 rows. */
const WORLD = [
  "................................................",
  ".....#####.........######..##########...........",
  "..###########.....###.##..##############.####...",
  ".#############....#####..#################.##...",
  "..###########.....####...##################.....",
  "....########......##.....#################......",
  ".....######......########..##############.......",
  "......####......##########..##########..#.......",
  ".......###......###########..#######............",
  "........##.......##########...####..##..........",
  ".........###......########.....##....#..........",
  "..........#####.....######..........##..........",
  "..........######....#####.............###.......",
  "...........#####.....####............#####......",
  "...........####......###............#######.....",
  "............###......##..............##.###.....",
  "............##........................#...##....",
  "............#...................................",
];
const COLS = 48;
const ROWS = WORLD.length;
const DOTS = WORLD.flatMap((row, y) =>
  [...row].flatMap((ch, x) => (ch === "#" ? [[x, y] as const] : [])),
);

/** Demo pins, by percent of the map. Scores use the game's real 100-point rounds. */
const PINS = [
  { kind: "Flag", clue: "A red maple leaf", at: [19, 22], pts: 98 },
  { kind: "Food", clue: "Sushi", at: [86, 30], pts: 92 },
  { kind: "Food", clue: "Jollof rice", at: [48.5, 57.5], pts: 86 },
  { kind: "Landmark", clue: "Christ the Redeemer", at: [31, 72], pts: 89 },
  { kind: "Landmark", clue: "Petra", at: [59.5, 43], pts: 94 },
  { kind: "Landmark", clue: "Uluru", at: [84, 78], pts: 95 },
  { kind: "Person", clue: "Frida Kahlo", at: [16, 46], pts: 81 },
] as const;

/** Pins that would sit behind the text when the map is the desktop backdrop. */
const isCentre = (x: number) => x > 30 && x < 70;

/** Drops pins one by one; each shows its clue tag while it is the newest. */
function usePinDemo(enabled: boolean): {
  dropped: number[];
  tag: number | null;
} {
  const [state, setState] = useState<{ dropped: number[]; tag: number | null }>(
    { dropped: [], tag: null },
  );

  useDemoLoop(async (wait) => {
    for (;;) {
      // On desktop the middle of the map sits behind the text, so those pins are skipped.
      const wide = window.matchMedia("(min-width: 700px)").matches;
      const order = PINS.flatMap((pin, i) =>
        wide && isCentre(pin.at[0]) ? [] : [i],
      );
      setState({ dropped: [], tag: null });
      await wait(400);
      for (let k = 0; k < order.length; k++) {
        const dropped = order.slice(0, k + 1);
        setState({ dropped, tag: null });
        await wait(350);
        setState({ dropped, tag: order[k]! });
        await wait(1500);
      }
      setState((s) => ({ ...s, tag: null }));
      await wait(900);
    }
  }, enabled);

  return enabled ? state : { dropped: PINS.map((_, i) => i), tag: null };
}

export interface AnyGuessrTeaser {
  firstClueType: string;
  rounds: number;
}

export function AnyGuessrIntro({
  pending,
  teaser,
  onPlay,
}: {
  pending: boolean;
  teaser: AnyGuessrTeaser | null;
  onPlay: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const demo = usePinDemo(!pending && !reducedMotion);
  const firstClue = teaser
    ? DAILY_CLUE_TYPE_LABEL[teaser.firstClueType]
    : undefined;

  return (
    <section
      className="agi"
      aria-label="AnyGuessr"
      data-intro-pending={pending || undefined}
    >
      <div className="agi-map" aria-hidden="true">
        <svg
          viewBox={`0 0 ${COLS} ${ROWS}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {DOTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.31} />
          ))}
        </svg>
        {demo.dropped
          .map((i) => PINS[i]!)
          .map((pin, k) => {
            const i = demo.dropped[k]!;
            return (
              <div
                key={pin.clue}
                className={
                  isCentre(pin.at[0]) ? "agi-drop is-centre" : "agi-drop"
                }
              >
                <span
                  className="agi-pin"
                  style={{ left: `${pin.at[0]}%`, top: `${pin.at[1]}%` }}
                />
                <span
                  className={`agi-tag${demo.tag === i ? " is-on" : ""}${pin.at[0] < 22 ? " is-left" : pin.at[0] > 78 ? " is-right" : ""}`}
                  style={{ left: `${pin.at[0]}%`, top: `${pin.at[1]}%` }}
                >
                  <small>{pin.kind}</small>
                  {pin.clue}
                  <b>+{pin.pts}</b>
                </span>
              </div>
            );
          })}
      </div>

      <div className="agi-body">
        <div className="agi-top">
          <Link href="/" className="ag-back">
            &larr; Stim Games
          </Link>
        </div>
        <IntroToday game="anyguessr" />
        <GameTitle game="anyguessr" as="h1" className="agi-wordmark" />
        <p className="agi-pitch">
          Seven clues, seven countries. Pin each one on the map.{" "}
          <b>Close still scores.</b>
        </p>
        <div className="agi-spacer" />
        <p className="agi-rules">
          <span>
            <b>{teaser?.rounds ?? 7}</b>clues
          </span>
          <span>
            <b>1</b>pin each
          </span>
          <span>
            <b>{DAILY_MAX_ROUND_SCORE}</b>for a bullseye
          </span>
        </p>
        <p className="agi-teaser">
          {firstClue ? (
            <>
              First clue today: <b>{firstClue}</b>
            </>
          ) : (
            <>A new set of countries every day</>
          )}
        </p>
        <button type="button" className="agi-play" onClick={onPlay}>
          Get your passport
        </button>
        <IntroCount
          game="anyguessr"
          fallback="Today's passport is blank. Be one of the first to stamp it."
        />
      </div>
    </section>
  );
}
