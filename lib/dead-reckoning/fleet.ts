/** The fleet: everyone else's voyages that day, real or estimated. */

import { hashUnit } from "./voyage";
import { LEGS, voyage, type Guess } from "./scoring";

export interface Fleet {
  /** `players` once the day has enough real voyages; `estimate` before that. */
  source: "players" | "estimate";
  /** Real voyages counted in `days`. */
  players: number;
  /** Days at sea for each voyage in the fleet, yours included when it was recorded. */
  days: number[];
  /** Per leg, a sample of everyone's guesses; the eighth is the treasure island's, from those who reached it. */
  guesses: number[][];
}

export const MIN_PLAYERS = 30;
export const SIMULATED_SAILORS = 300;
export const MAX_SAMPLE = 300;

function seeded(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulated sailors for a day, seeded by the date so everyone sees the same fleet.
 * Each sailor has a skill; each question a lean (most people guess a little low), a
 * spread, and a share of people who simply know the answer (88 keys, 32 teeth). Three in
 * a hundred leave a leg blank. Pass the treasure question as the eighth leg; a sailor
 * only answers it after reaching the last island under par.
 */
export function simulatedVoyages(date: string, legs: ReadonlyArray<{ id: string; answer: number }>, count = SIMULATED_SAILORS): Guess[][] {
  const rand = seeded(Math.floor(hashUnit(`fleet:${date}`) * 2 ** 31));
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (!u) u = rand();
    while (!v) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const shape = legs.map((l) => ({
    lean: -0.15 + hashUnit(`lean:${l.id}`) * 0.2,
    spread: 0.2 + hashUnit(`spread:${l.id}`) * 0.25,
    known: 0.1 + hashUnit(`known:${l.id}`) * 0.35,
  }));
  const crossings = legs.slice(0, LEGS);
  const treasure = legs[LEGS];
  return Array.from({ length: count }, () => {
    const skill = 0.55 + rand() * 1.1;
    const guess = (l: { answer: number }, i: number): Guess => {
      if (rand() < 0.03) return null;
      // Better sailors (a lower skill number) are likelier to know it outright.
      if (rand() < shape[i].known * (1.65 - skill)) return l.answer * (1 + (rand() - 0.5) * 0.01);
      return l.answer * Math.pow(10, shape[i].lean + gauss() * shape[i].spread * skill);
    };
    const guesses: Guess[] = crossings.map(guess);
    if (treasure && voyage(guesses, crossings.map((l) => l.answer), undefined, treasure.answer).treasure) {
      guesses.push(guess(treasure, LEGS));
    }
    return guesses;
  });
}

/** Evenly spaced sample, so the strips stay small however many people played. */
function sample<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items];
  const step = items.length / max;
  return Array.from({ length: max }, (_, i) => items[Math.floor(i * step)]);
}

/**
 * Builds the fleet from the day's real voyages, topping up with simulated ones until there
 * are enough. `legs` is the seven crossings then the treasure question; a voyage's eighth
 * guess, when it has one, is its treasure guess.
 */
export function buildFleet(date: string, legs: ReadonlyArray<{ id: string; answer: number }>, real: readonly Guess[][]): Fleet {
  const answers = legs.slice(0, LEGS).map((l) => l.answer);
  const treasureAnswer = legs[LEGS]?.answer ?? 0;
  const enough = real.length >= MIN_PLAYERS;
  const voyages = enough ? [...real] : [...real, ...simulatedVoyages(date, legs)];
  return {
    source: enough ? "players" : "estimate",
    players: real.length,
    days: voyages.map((v) => voyage(v.slice(0, LEGS), answers, v.length > LEGS ? v[LEGS] : undefined, treasureAnswer).days),
    guesses: legs.map((_, i) =>
      sample(
        voyages.map((v) => v[i] ?? null).filter((x): x is number => x !== null),
        MAX_SAMPLE,
      ),
    ),
  };
}
