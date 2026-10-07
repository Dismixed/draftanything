export const GAME_IDS = [
  "chainlink",
  "brain-dead",
  "anyguessr",
  "hot-takes",
  "freezeframes",
  "ball-knowledge",
  "getting-warmer",
  "draft-anything",
  "slippery-slope",
] as const;

export type GameId = (typeof GAME_IDS)[number];

/** Order is the lineup order on the home page. */
export const DAILY_GAMES = [
  "chainlink",
  "brain-dead",
  "anyguessr",
  "freezeframes",
  "ball-knowledge",
  "hot-takes",
  "getting-warmer",
] as const;

export type DailyGameId = (typeof DAILY_GAMES)[number];

/** The only games shown in the home page's featured slot, in rotation order. */
export const FEATURED_GAMES = ["chainlink", "brain-dead", "anyguessr"] as const satisfies readonly DailyGameId[];

export interface GameTheme {
  page: string;
  background: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
}

export interface GameEntry {
  id: GameId;
  kind: "daily" | "party";
  name: string;
  brand: { first: string; second: string; color: string };
  playHref: string;
  canonicalPath: string;
  category: string;
  blurb: string;
  pitch: string;
  theme: GameTheme;
  seo: { description: string; genre: string[]; playMode: string[]; priority: number };
}

const REGISTRY: Record<GameId, GameEntry> = {
  chainlink: {
    id: "chainlink",
    kind: "daily",
    name: "Chain Link",
    brand: { first: "Chain ", second: "Link", color: "#c9b458" },
    playHref: "/chainlink",
    canonicalPath: "/chainlink",
    category: "Word",
    blurb: "Link each word to the one before it.",
    pitch:
      "Each word pairs with the one before it to make a common phrase: snow, ball, park. Finish the chain with as few misses as you can.",
    theme: {
      page: "var(--cl-bg)",
      background: "var(--cl-card)",
      border: "var(--cl-border)",
      accent: "var(--cl-green)",
      text: "var(--cl-text)",
      muted: "var(--cl-gray-dim)",
    },
    seo: {
      description: "A daily word-chain puzzle where each word links naturally with the one before it.",
      genre: ["Word game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.95,
    },
  },
  "brain-dead": {
    id: "brain-dead",
    kind: "daily",
    name: "Brain Dead",
    brand: { first: "Brain ", second: "Dead", color: "var(--bd-primary)" },
    playHref: "/brain-dead/daily",
    canonicalPath: "/brain-dead",
    category: "Trivia",
    blurb: "Fifteen questions. One wrong answer ends the run.",
    pitch:
      "Fifteen trivia questions that get harder as you go. One wrong answer, or one timeout, and your run is over.",
    theme: {
      page: "var(--bd-bg)",
      background: "var(--bd-surface)",
      border: "var(--bd-border)",
      accent: "var(--bd-primary)",
      text: "var(--bd-text)",
      muted: "var(--bd-text-secondary)",
    },
    seo: {
      description: "A fast trivia challenge where one wrong answer ends the run.",
      genre: ["Trivia", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.9,
    },
  },
  anyguessr: {
    id: "anyguessr",
    kind: "daily",
    name: "AnyGuessr",
    brand: { first: "Any", second: "Guessr", color: "var(--ag-brand)" },
    playHref: "/anyguessr/daily",
    canonicalPath: "/anyguessr",
    category: "Geography",
    blurb: "Name the country from the clues.",
    pitch:
      "Seven rounds, seven clues: a flag, a landmark, a dish, a famous face. Pin the country on the map. Close guesses still score.",
    theme: {
      page: "var(--ag-bg)",
      background: "var(--ag-surface)",
      border: "var(--ag-border)",
      accent: "var(--ag-accent)",
      text: "var(--ag-text)",
      muted: "var(--ag-muted)",
    },
    seo: {
      description: "A country guessing game built from cultural clues, maps, flags, and geography.",
      genre: ["Geography game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.9,
    },
  },
  "hot-takes": {
    id: "hot-takes",
    kind: "daily",
    name: "Hot Takes",
    brand: { first: "Hot ", second: "Takes", color: "#ff3b3b" },
    playHref: "/hot-takes",
    canonicalPath: "/hot-takes",
    category: "Ranking",
    blurb: "Rank today's 15 items from S tier to D.",
    pitch:
      "Fifteen items in one category. Sort every one into S, A, B, C or D, then lock in your ranking.",
    theme: {
      page: "var(--ht-bg)",
      background: "var(--ht-surface)",
      border: "var(--ht-line)",
      accent: "var(--ht-accent)",
      text: "var(--ht-text)",
      muted: "var(--ht-text-dim)",
    },
    seo: {
      description: "A daily tier-list game where you rank fifteen items in one category from S to D.",
      genre: ["Ranking game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.85,
    },
  },
  freezeframes: {
    id: "freezeframes",
    kind: "daily",
    name: "FreezeFrames",
    brand: { first: "Freeze", second: "Frames", color: "#a855f7" },
    playHref: "/freezeframes/daily",
    canonicalPath: "/freezeframes/daily",
    category: "Movies & TV",
    blurb: "Guess the movie, song, show and album.",
    pitch:
      "Name the movie from a frame, the song from a 20-second clip, the TV show from a frame and the artist from an album cover.",
    theme: {
      page: "var(--ff-bg)",
      background: "var(--ff-surface)",
      border: "var(--ff-border)",
      accent: "var(--ff-purple-light)",
      text: "var(--ff-text)",
      muted: "var(--ff-muted)",
    },
    seo: {
      description: "A daily pop-culture guessing game across movies, songs, TV, and albums.",
      genre: ["Pop culture game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.8,
    },
  },
  "ball-knowledge": {
    id: "ball-knowledge",
    kind: "daily",
    name: "Ball Knowledge",
    brand: { first: "Ball ", second: "Knowledge", color: "#5b9ee8" },
    playHref: "/ball-knowledge/daily",
    canonicalPath: "/ball-knowledge/daily",
    category: "Trivia",
    blurb: "60 seconds. Name everything in the category.",
    pitch:
      "One category, 60 seconds. Type as many valid answers as you can before the clock runs out.",
    theme: {
      page: "var(--bk-court-navy)",
      background: "var(--bk-backboard)",
      border: "var(--bk-line)",
      accent: "var(--bk-net-blue)",
      text: "var(--bk-chalk)",
      muted: "var(--bk-chalk-dim)",
    },
    seo: {
      description: "A 60-second category challenge for naming as many valid answers as possible.",
      genre: ["Trivia", "Word game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.8,
    },
  },
  "getting-warmer": {
    id: "getting-warmer",
    kind: "daily",
    name: "Getting Warmer",
    brand: { first: "Getting ", second: "Warmer", color: "#ff6b1a" },
    playHref: "/getting-warmer/daily",
    canonicalPath: "/getting-warmer/daily",
    category: "Word",
    blurb: "Guess the word. Every miss adds a clue.",
    pitch:
      "Start with two clues to a secret word or phrase. Every wrong guess reveals another. Solve it in as few guesses as you can.",
    theme: {
      page: "var(--gw-bg)",
      background: "var(--gw-surface)",
      border: "color-mix(in srgb, var(--gw-orange) 65%, transparent)",
      accent: "var(--gw-orange)",
      text: "var(--gw-ink)",
      muted: "var(--gw-ink-dim)",
    },
    seo: {
      description: "A daily word puzzle where clues keep getting warmer until the answer is found.",
      genre: ["Word game", "Daily puzzle"],
      playMode: ["SinglePlayer"],
      priority: 0.8,
    },
  },
  "draft-anything": {
    id: "draft-anything",
    kind: "party",
    name: "Draft Anything",
    brand: { first: "Draft ", second: "Anything", color: "var(--gold-hi)" },
    playHref: "/draft-anything",
    canonicalPath: "/draft-anything",
    category: "Party",
    blurb: "Draft any topic with friends, defend your picks, then get judged.",
    pitch:
      "Pick any topic, take turns drafting, defend every pick, then let the room or the AI judge decide who built the best lineup. One room code, no accounts.",
    theme: {
      page: "var(--bg)",
      background: "var(--panel)",
      border: "var(--border)",
      accent: "var(--gold-hi)",
      text: "var(--text)",
      muted: "var(--text-dim)",
    },
    seo: {
      description:
        "A room-code party game where friends draft any topic, defend every pick, and vote on the best roster.",
      genre: ["Party game", "Draft game"],
      playMode: ["MultiPlayer", "CoOp"],
      priority: 0.9,
    },
  },
  "slippery-slope": {
    id: "slippery-slope",
    kind: "party",
    name: "Slippery Slope",
    brand: { first: "Slippery ", second: "Slope", color: "var(--ss-lime)" },
    playHref: "/slippery-slope",
    canonicalPath: "/slippery-slope",
    category: "Party",
    blurb: "Answer trivia to climb the board before someone knocks you back down.",
    pitch:
      "A trivia board game. Answer questions to move up the board, and watch for the slides that send you back down.",
    theme: {
      page: "var(--ss-bg)",
      background: "var(--ss-surface)",
      border: "var(--ss-border)",
      accent: "var(--ss-lime)",
      text: "var(--ss-text)",
      muted: "var(--ss-muted)",
    },
    seo: {
      description:
        "A trivia board game where players answer questions and climb before opponents knock them back down.",
      genre: ["Trivia", "Board game", "Party game"],
      playMode: ["SinglePlayer", "MultiPlayer"],
      priority: 0.75,
    },
  },
};

export const GAMES: GameEntry[] = GAME_IDS.map((id) => REGISTRY[id]);

export function getGame(id: GameId): GameEntry {
  return REGISTRY[id];
}

export function isDailyGame(id: GameId): id is DailyGameId {
  return (DAILY_GAMES as readonly string[]).includes(id);
}
