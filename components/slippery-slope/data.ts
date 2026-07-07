/* ══════════════════════════════════
   Slippery Slope — Game Data
   ══════════════════════════════════ */

export interface Question {
  q: string;
  a: string[];
  c: number; // correct index
  d: number; // difficulty 1-4
  cat: string; // OpenTDB subcategory label
}

export interface Player {
  name: string;
  color: string;
  pos: number;
  isHuman: boolean;
  joined?: boolean;
}

export type Category = {
  id: string;
  name: string;
  em: string;
};

export const PCOLORS = [
  "#b5f23d", "#2dd4bf", "#fb923c", "#a78bfa", "#f472b6", "#60a5fa",
];

export const LETTERS = ["A", "B", "C", "D"];

export const CATS: Category[] = [
  { id: "general", name: "General", em: "🎯" },
  { id: "sports", name: "Sports", em: "🏀" },
  { id: "movies", name: "Movies", em: "🎬" },
  { id: "music", name: "Music", em: "🎵" },
  { id: "arts", name: "Arts & Lit", em: "📚" },
  { id: "science", name: "Science", em: "🔬" },
  { id: "history", name: "History", em: "📜" },
  { id: "food", name: "Food", em: "🍕" },
  { id: "culture", name: "Culture", em: "🌐" },
  { id: "geography", name: "Geography", em: "🌍" },
];

/* Snake & Ladder map: [from, to] — if to < from it's a snake, else ladder */
export const DEFAULT_SL_MAP: Record<number, number> = {
  4: 14,   // ladder: 4→14
  9: 29,   // ladder: 9→29
  17: 7,   // snake: 17→7
  20: 38,  // ladder: 20→38
  24: 16,  // snake: 24→16
  28: 6,   // snake: 28→6
  31: 44,  // ladder: 31→44
  33: 48,  // ladder: 33→48
  36: 22,  // snake: 36→22
  42: 13,  // snake: 42→13
  46: 27,  // snake: 46→27
  49: 11,  // snake: 49→11
};

/** @deprecated use DEFAULT_SL_MAP */
export const SL_MAP = DEFAULT_SL_MAP;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Randomize snake/ladder positions each game — 6 snakes, 6 ladders. */
export function generateSlMap(
  snakeCount = 6,
  ladderCount = 6,
): Record<number, number> {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const map: Record<number, number> = {};
    const occupied = new Set<number>();
    let failed = false;

    for (let i = 0; i < snakeCount && !failed; i++) {
      const jump = 6 + Math.floor(Math.random() * 20);
      const candidates: [number, number][] = [];
      for (let from = jump + 1; from <= 49; from++) {
        const to = from - jump;
        if (to < 1 || occupied.has(from) || occupied.has(to)) continue;
        candidates.push([from, to]);
      }
      if (!candidates.length) {
        failed = true;
        break;
      }
      const [from, to] = pickRandom(candidates);
      map[from] = to;
      occupied.add(from);
      occupied.add(to);
    }

    for (let i = 0; i < ladderCount && !failed; i++) {
      const jump = 6 + Math.floor(Math.random() * 20);
      const candidates: [number, number][] = [];
      for (let from = 1; from <= 49; from++) {
        const to = from + jump;
        if (to > 49 || occupied.has(from) || occupied.has(to)) continue;
        candidates.push([from, to]);
      }
      if (!candidates.length) {
        failed = true;
        break;
      }
      const [from, to] = pickRandom(candidates);
      map[from] = to;
      occupied.add(from);
      occupied.add(to);
    }

    if (!failed && Object.keys(map).length === snakeCount + ladderCount) {
      return map;
    }
  }

  return { ...DEFAULT_SL_MAP };
}

export const DLABEL = ["", "Easy", "Medium", "Hard", "Brutal"];
export const DCLASS = ["", "ss-dp1", "ss-dp2", "ss-dp3", "ss-dp4"];
export const WCLASS = [
  "", "wsel", "wsel", "wsel", "wsel2", "wsel2",
  "wsel2", "wsel3", "wsel3", "wsel4", "wsel4",
];

export function wagerToDiff(w: number): number {
  if (w <= 3) return 1;
  if (w <= 6) return 2;
  if (w <= 8) return 3;
  return 4;
}
