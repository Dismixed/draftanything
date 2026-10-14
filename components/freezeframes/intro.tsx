"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { IntroCount, IntroToday } from "@/components/daily-intro/intro-meta";
import { useDemoLoop } from "@/lib/daily-intro/use-demo-loop";
import { MAX_PTS } from "@/lib/freezeframes/game-logic";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * Demo-only examples and public-domain art are separate from the bundled backup puzzle.
 * The backup can be served as today's puzzle, so never reuse its answers or assets here.
 */
const REEL = [
  { label: "Movie", img: "/freezeframes/demo/movie.jpg", answer: "A Trip to the Moon" },
  { label: "Song", img: null, answer: "The Entertainer" },
  { label: "TV show", img: "/freezeframes/demo/show.jpg", answer: "I Love Lucy" },
  { label: "Album", img: "/freezeframes/demo/album.jpg", answer: "Louis Armstrong" },
] as const;

/** Three copies, so the frame in the gate always has neighbours on both sides. */
const CELLS = [...REEL, ...REEL, ...REEL];
const FIRST = REEL.length;

const BARS = Array.from({ length: 16 }, (_, i) => -((i * 137) % 900));

interface Reel {
  /** Index into CELLS of the frame in the gate. */
  at: number;
  slide: boolean;
  focused: boolean;
  typed: number;
  solved: boolean;
}

const STILL: Reel = { at: FIRST, slide: false, focused: true, typed: REEL[0].answer.length, solved: true };

/** Advances the strip one frame at a time; the frame in the gate sharpens and its answer types in. */
function useReelDemo(enabled: boolean): Reel {
  const [reel, setReel] = useState<Reel>({ ...STILL, focused: false, typed: 0, solved: false });

  useDemoLoop(async (wait) => {
    let at = FIRST;
    for (;;) {
      setReel({ at, slide: true, focused: false, typed: 0, solved: false });
      await wait(850);
      setReel((r) => ({ ...r, focused: true }));
      await wait(1500);
      const answer = CELLS[at]!.answer;
      for (let k = 1; k <= answer.length; k++) {
        setReel((r) => ({ ...r, typed: k }));
        await wait(65);
      }
      setReel((r) => ({ ...r, solved: true }));
      await wait(1100);
      at++;
      if (at === FIRST + REEL.length) {
        // Slide onto the third copy's first frame, then jump back to the same picture unseen.
        setReel({ at, slide: true, focused: false, typed: 0, solved: false });
        await wait(850);
        at = FIRST;
        setReel({ at, slide: false, focused: false, typed: 0, solved: false });
        await wait(50);
      }
    }
  }, enabled);

  return enabled ? reel : STILL;
}

export function FreezeFramesIntro({ pending, onPlay }: { pending: boolean; onPlay: () => void }) {
  const reducedMotion = useReducedMotion();
  const reel = useReelDemo(!pending && !reducedMotion);

  return (
    <section className="ffi" aria-label="FreezeFrames" data-intro-pending={pending || undefined}>
      <div className="ffi-top">
        <Link href="/" className="ff-back">
          &larr; Stim Games
        </Link>
        <Link href="/freezeframes/leaderboard" className="ff-link">
          Leaderboard
        </Link>
      </div>

      <IntroToday game="freezeframes" />
      <h1 className="ffi-wordmark">
        Freeze<span className="hl">Frames</span>
      </h1>
      <p className="ffi-pitch">Name the movie from a frame, the song from a clip, the TV show and the album.</p>

      <div className="ffi-strip" aria-hidden="true">
        <div
          className={`ffi-track${reel.slide ? " is-sliding" : ""}`}
          style={{ "--at": reel.at } as CSSProperties}
        >
          {CELLS.map((cell, i) => {
            const inGate = i === reel.at;
            const sharp = inGate && reel.focused;
            return (
              <div key={i} className={`ffi-cell${inGate ? " is-gate" : ""}${sharp ? " is-sharp" : ""}`}>
                <div className="ffi-pic">
                  {cell.img ? (
                    <Image src={cell.img} alt="" fill sizes="250px" />
                  ) : (
                    <div className="ffi-wave">
                      {BARS.map((delay, b) => (
                        <i key={b} style={{ animationDelay: `${delay}ms` }} />
                      ))}
                    </div>
                  )}
                </div>
                <span className="ffi-cat">{cell.label}</span>
                {inGate && reel.typed > 0 && (
                  <span className={`ffi-ans${reel.solved ? " is-ok" : ""}`}>
                    {cell.answer.slice(0, reel.typed)}
                    {reel.solved ? " ✓" : <span className="ffi-caret" />}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="ffi-gate" />
      </div>

      <p className="ffi-rules">
        <span>
          <b>4</b>rounds
        </span>
        <span>
          <b>{MAX_PTS.toLocaleString("en-US")}</b>pts each
        </span>
        <span>
          <b>faster</b>scores more
        </span>
      </p>
      <p className="ffi-teaser">
        Today: <b>a movie, a song, a TV show and an album</b>
      </p>
      <button type="button" className="ffi-play" onClick={onPlay}>
        ▶ Roll it
      </button>
      <IntroCount game="freezeframes" fallback="Today's reel is fresh. Be one of the first to roll it." />
    </section>
  );
}
