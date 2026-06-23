import type { Puzzle } from "./types";

/* ------------------------------------------------------------------ */
/*  Word chains — each pair forms a common compound or phrase          */
/*  e.g. apple + juice → "apple juice", juice + box → "juice box"     */
/* ------------------------------------------------------------------ */

const CHAINS: readonly (readonly string[])[] = [
  ["apple", "juice", "box", "spring", "break"],
  ["book", "mark", "down", "town", "hall"],
  ["snow", "ball", "park", "bench", "mark"],
  ["tooth", "brush", "fire", "place", "mat"],
  ["news", "paper", "weight", "loss", "leader"],
  ["butter", "fly", "wheel", "chair", "lift"],
  ["foot", "ball", "room", "mate", "ship"],
  ["rain", "bow", "tie", "dye", "job"],
  ["eye", "lash", "out", "door", "bell"],
  ["head", "light", "house", "hold", "up"],
  ["sea", "shell", "shock", "wave", "pool"],
  ["life", "guard", "dog", "house", "cat"],
  ["back", "pack", "rat", "race", "car"],
  ["moon", "light", "year", "book", "store"],
  ["hot", "dog", "days", "off", "ramp"],
  ["cup", "cake", "walk", "way", "side"],
  ["arm", "chair", "man", "hole", "punch"],
  ["foot", "print", "shop", "lift", "gate"],
  ["sun", "flower", "pot", "luck", "charm"],
  ["water", "fall", "out", "field", "goal"],
  ["fire", "fly", "paper", "trail", "mix"],
  ["key", "board", "game", "plan", "book"],
  ["star", "fish", "bowl", "cut", "off"],
  ["horse", "power", "plant", "food", "truck"],
  ["air", "port", "side", "walk", "through"],
  ["night", "fall", "back", "bone", "yard"],
  ["cross", "walk", "out", "look", "out"],
  ["hand", "shake", "down", "pour", "over"],
  ["brain", "storm", "cloud", "burst", "pipe"],
  ["love", "bird", "bath", "robe", "hook"],
];

const WORDS_PER_PUZZLE = 5;

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (mulberry32)                                           */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Puzzle generator — picks a word chain                              */
/* ------------------------------------------------------------------ */

function generatePuzzle(seed: number): Puzzle {
  const rng = mulberry32(seed);
  const chainIndex = Math.floor(rng() * CHAINS.length);
  const chain = CHAINS[chainIndex];
  const words = chain.slice(0, WORDS_PER_PUZZLE);
  return { words };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function getDailyPuzzle(date?: Date): Puzzle {
  const d = date ?? new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return generatePuzzle(seed);
}

export function getRandomPuzzle(): Puzzle {
  return generatePuzzle(Date.now());
}

export function getDateString(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Display helper: "apple" + "juice" → "Apple Juice" */
export function formatPair(left: string, right: string): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(left)} ${cap(right)}`;
}
