"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DAILY_CLUE_TYPE_LABEL, DAILY_FACT_LABEL, formatDistanceKm } from "@/lib/anyguessr/daily";
import { revealInk, revealSchedule, revealText, revealTier, STAGE } from "@/lib/anyguessr/reveal";
import type { DailyRoundRecap } from "@/lib/anyguessr/types";
import { useSound } from "@/lib/audio/sound-context";
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { prefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";
import { triggerAnimation } from "@/lib/motion/trigger-class";
import { stampTone } from "./stamps";
import WorldMap from "./world-map";

interface Props {
  recap: DailyRoundRecap;
  totalScore: number;
  /** The run of close rounds ending here, and the run this round ended, if it did. */
  streak?: { current: number; broken: number };
  onContinue: () => void;
}

/** Longest the reveal waits for the map before playing anyway. */
const MAP_WAIT_MS = 3000;

/** Above the recap's scrim, so confetti is not drawn behind it. */
const CONFETTI_Z = 1100;

/** Counts from zero to `target` once `active`, easing out. It reads zero until it starts, never the final number. */
function useRevealCount(target: number, active: boolean, durationMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, durationMs]);

  return value;
}

/**
 * Shown after each guess. It plays the round out in beats: the guess lands, the camera pushes in,
 * a line draws to the answer, the answer slams in, the distance and score count up, then a stamp
 * says how close it was. The button skips to the end.
 */
export default function RoundRecap({ recap, totalScore, streak = { current: 0, broken: 0 }, onContinue }: Props) {
  const { play } = useSound();
  const cardRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLHeadingElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const lastTick = useRef(0);

  const [stage, setStage] = useState<number>(() => (prefersReducedMotion() ? STAGE.done : STAGE.pin));
  const [skipped, setSkipped] = useState(false);
  // The map loads after the recap opens, so the beats wait for it rather than play over a blank map.
  const [mapReady, setMapReady] = useState(false);
  const onMapReady = useCallback(() => setMapReady(true), []);
  const timers = useRef<number[]>([]);

  const clueLabel =
    DAILY_CLUE_TYPE_LABEL[recap.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL] ?? recap.clueType;
  const tier = revealTier(recap);
  const { banner, quip } = revealText(tier, recap.distanceKm);
  const ink = revealInk(tier);
  const hasGuess = !recap.surrendered && recap.guessLat !== null;
  const missed = hasGuess && !recap.exact;
  const done = stage >= STAGE.done;
  const animated = !skipped && !prefersReducedMotion();

  // A map that never loads must not hold the reveal back for good.
  useEffect(() => {
    const id = window.setTimeout(() => setMapReady(true), MAP_WAIT_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!mapReady) return;
    const ids = revealSchedule(missed).map(({ stage: next, at }) => window.setTimeout(() => setStage((s) => Math.max(s, next)), at));
    timers.current = ids;
    return () => ids.forEach(window.clearTimeout);
    // The schedule starts once, when the map is ready. A skip clears the timers itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  const skip = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    setSkipped(true);
    setStage(STAGE.done);
  }, []);

  // What each beat sounds and looks like as it arrives. A skipped reveal stays quiet.
  useEffect(() => {
    if (!animated) return;
    if (stage === STAGE.pin && hasGuess) play("pick");
    if (stage === STAGE.fly) play("ui.whoosh");
    if (stage === STAGE.answer) {
      play("ui.tap");
      impactRing(answerRef.current, "var(--ag-accent)");
    }
    if (stage === STAGE.verdict) {
      if (tier === "exact") {
        play("correct");
        void burstFrom(bannerRef.current, 3, "correct", { zIndex: CONFETTI_Z, particles: 120 });
      } else if (tier === "neighbour") {
        play("correct", { volumeScale: 0.7 });
        void burstFrom(bannerRef.current, 1, "gold", { zIndex: CONFETTI_Z, particles: 40 });
      } else if (tier === "far") {
        play("wrong");
        triggerAnimation(cardRef.current, "anim-screen-shake", 260);
      } else if (tier !== "skipped") {
        play("ui.tap");
      }
      if (streak.current >= 3) window.setTimeout(() => play("streak"), 350);
    }
    // Only the stage changing starts a beat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const duration = skipped || prefersReducedMotion() ? 1 : 650;
  const km = useRevealCount(Math.round(recap.distanceKm), stage >= STAGE.distance && !recap.surrendered, duration);
  const points = useRevealCount(recap.roundScore, stage >= STAGE.score, duration);

  // A tick for each few points and kilometres that go by.
  useEffect(() => {
    if (!animated || (stage !== STAGE.distance && stage !== STAGE.score)) return;
    const now = performance.now();
    if (now - lastTick.current < 70) return;
    lastTick.current = now;
    play("ui.tick");
    // The value changing is the cue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [km, points]);

  const distance = recap.surrendered ? "—" : stage < STAGE.distance ? "—" : recap.exact ? "0 km" : formatDistanceKm(km);
  const shownScore = stage < STAGE.score ? "—" : recap.surrendered ? "0" : `+${points}`;
  const previousTotal = totalScore - recap.roundScore;
  const shownTotal = stage < STAGE.score ? previousTotal : previousTotal + points;
  const answered = stage >= STAGE.answer;
  const judged = stage >= STAGE.verdict;

  return (
    <div
      ref={cardRef}
      className={`ag-recap anim-fade-slide-up is-${stampTone(recap)}`}
      data-stage={stage}
      data-tier={tier}
    >
      <p className="ag-recap-kind">
        <b>Round {recap.roundIndex + 1}</b>
        {clueLabel}
      </p>

      <h2 ref={answerRef} className={`ag-recap-answer${answered ? (animated ? " is-slam" : "") : " is-veiled"}`}>
        {answered && recap.flagUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recap.flagUrl} alt="" />
        )}
        {answered ? recap.answer : "Where is it?"}
      </h2>

      <p className="ag-recap-guess">
        {recap.surrendered ? (
          "You gave up this round"
        ) : (
          <>
            You guessed <b>{recap.guess}</b>
          </>
        )}
      </p>

      {/* The map is not interactive here, so a tap on it is free to mean "skip". */}
      <div className="ag-recap-map" onClick={done ? undefined : skip}>
        <WorldMap
          answer={{ cca3: recap.answerCca3, lat: recap.answerLat, lng: recap.answerLng }}
          guess={{ cca3: recap.guessCca3, lat: recap.guessLat, lng: recap.guessLng }}
          reveal={{ framed: stage >= STAGE.fly, line: stage >= STAGE.arc, answer: stage >= STAGE.answer }}
          onReady={onMapReady}
        />
        {judged && (
          <div ref={bannerRef} className={`ag-recap-banner is-${ink}${animated ? " is-slam" : ""}`} role="status">
            {banner}
          </div>
        )}
        {judged && animated && tier === "exact" && <span className="ag-recap-flash" aria-hidden="true" />}
      </div>

      <div className="ag-recap-stats">
        <div>
          <b>{distance}</b>
          <span>Distance</span>
        </div>
        <div>
          <b className="is-score">{shownScore}</b>
          <span>Round score</span>
        </div>
        <div>
          <b>{shownTotal}</b>
          <span>Total</span>
        </div>
      </div>

      <div className="ag-recap-chips">
        {judged && <span className={`ag-recap-chip is-${ink}${animated ? " anim-pop-in" : ""}`}>{quip}</span>}
        {judged && streak.current >= 2 && (
          <span className={`ag-recap-chip${animated ? " anim-pop-in" : ""}`}>Streak ×{streak.current}</span>
        )}
        {judged && streak.current < 2 && streak.broken >= 2 && (
          <span className={`ag-recap-chip is-lost${animated ? " anim-pop-in" : ""}`}>Streak ×{streak.broken} broken</span>
        )}
      </div>

      {recap.funFact && (
        <p className={`ag-recap-fact${done ? " is-in" : ""}`}>
          <b>{DAILY_FACT_LABEL[recap.clueType] ?? "Did you know"}</b>
          {recap.funFact}
          {recap.funFactSource && (
            <a href={recap.funFactSource} target="_blank" rel="noopener noreferrer">
              Source: Wikipedia
            </a>
          )}
        </p>
      )}

      <button type="button" className="ag-cta" onClick={done ? onContinue : skip} autoFocus>
        {!done ? "Skip" : recap.isFinalRound ? "See results" : "Next round"}
      </button>
    </div>
  );
}
