import type { MetadataRoute } from "next";

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? "https://stimgames.com",
);

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export type GameId =
  | "chainlink"
  | "brain-dead"
  | "anyguessr"
  | "hot-takes"
  | "freezeframes"
  | "ball-knowledge"
  | "getting-warmer"
  | "draft-anything"
  | "slippery-slope";

interface GameSeo {
  id: GameId;
  name: string;
  path: string;
  description: string;
  genre: string[];
  playMode: string[];
  priority: number;
}

type JsonLdNode = Record<string, unknown>;

function normalizeSiteUrl(url: string): string {
  const normalized = url.trim().replace(/\/+$/, "");
  return normalized === "http://localhost:3000" ? "https://stimgames.com" : normalized;
}

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const games: GameSeo[] = [
  {
    id: "chainlink",
    name: "Chainlink",
    path: "/chainlink",
    description: "A daily word-chain puzzle where each word links naturally with the one before it.",
    genre: ["Word game", "Daily puzzle"],
    playMode: ["SinglePlayer"],
    priority: 0.95,
  },
  {
    id: "brain-dead",
    name: "Brain Dead",
    path: "/brain-dead",
    description: "A fast trivia challenge where one wrong answer ends the run.",
    genre: ["Trivia", "Daily puzzle"],
    playMode: ["SinglePlayer"],
    priority: 0.9,
  },
  {
    id: "anyguessr",
    name: "AnyGuessr",
    path: "/anyguessr",
    description: "A country guessing game built from cultural clues, maps, flags, and geography.",
    genre: ["Geography game", "Daily puzzle"],
    playMode: ["SinglePlayer"],
    priority: 0.9,
  },
  {
    id: "hot-takes",
    name: "Hot Takes",
    path: "/hot-takes",
    description: "A daily tier-list game where players rank the same category and compare with the crowd.",
    genre: ["Ranking game", "Daily puzzle"],
    playMode: ["SinglePlayer"],
    priority: 0.85,
  },
  {
    id: "freezeframes",
    name: "FreezeFrames",
    path: "/freezeframes/daily",
    description: "A daily pop-culture guessing game across movies, songs, TV, and albums.",
    genre: ["Pop culture game", "Daily puzzle"],
    playMode: ["SinglePlayer"],
    priority: 0.8,
  },
  {
    id: "ball-knowledge",
    name: "Ball Knowledge",
    path: "/ball-knowledge/daily",
    description: "A 60-second category challenge for naming as many valid answers as possible.",
    genre: ["Trivia", "Word game", "Daily puzzle"],
    playMode: ["SinglePlayer"],
    priority: 0.8,
  },
  {
    id: "getting-warmer",
    name: "Getting Warmer",
    path: "/getting-warmer/daily",
    description: "A daily word puzzle where clues keep getting warmer until the answer is found.",
    genre: ["Word game", "Daily puzzle"],
    playMode: ["SinglePlayer"],
    priority: 0.8,
  },
  {
    id: "draft-anything",
    name: "Draft Anything",
    path: "/draft-anything",
    description: "A room-code party game where friends draft any topic, defend every pick, and vote on the best roster.",
    genre: ["Party game", "Draft game"],
    playMode: ["MultiPlayer", "CoOp"],
    priority: 0.9,
  },
  {
    id: "slippery-slope",
    name: "Slippery Slope",
    path: "/slippery-slope",
    description: "A trivia board game where players answer questions and climb before opponents knock them back down.",
    genre: ["Trivia", "Board game", "Party game"],
    playMode: ["SinglePlayer", "MultiPlayer"],
    priority: 0.75,
  },
];

export const sitemapEntries: MetadataRoute.Sitemap = [
  {
    url: absoluteUrl("/"),
    changeFrequency: "daily" satisfies ChangeFrequency,
    priority: 1,
  },
  ...games.map((game) => ({
    url: absoluteUrl(game.path),
    changeFrequency: "daily" as ChangeFrequency,
    priority: game.priority,
  })),
];

export function buildHomeJsonLd(): { "@context": "https://schema.org"; "@graph": JsonLdNode[] } {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: "Stim Labs",
        url: absoluteUrl("/"),
        logo: absoluteUrl("/stimlabs_badge_v5.svg"),
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: "Stim Games",
        url: absoluteUrl("/"),
        publisher: { "@id": absoluteUrl("/#organization") },
        description:
          "Stim Games is a browser-based daily games hub with quick geography, movies, trivia, word, ranking, and group-play challenges.",
        inLanguage: "en-US",
      },
      {
        "@type": "ItemList",
        "@id": absoluteUrl("/#games"),
        name: "Stim Games catalog",
        itemListElement: games.map((game, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: game.name,
          url: absoluteUrl(game.path),
        })),
      },
      {
        "@type": "FAQPage",
        "@id": absoluteUrl("/#faq"),
        mainEntity: [
          faq("What is Stim Games?", "Stim Games is a daily games hub with quick browser challenges across geography, movies, trivia, word chains, rankings, and group play."),
          faq("Do Stim Games have a new daily challenge?", "Yes. Most games are built around daily puzzles, streaks, and quick sessions you can finish in a few minutes."),
          faq("Can I play Stim Games without an account?", "Yes. Games are designed for quick browser play, and multiplayer rooms support room-code play without requiring an account."),
          faq("Which Stim Games are multiplayer?", "Draft Anything and Slippery Slope support multiplayer party-game sessions."),
        ],
      },
    ],
  };
}

export function getGameSeo(gameId: GameId): GameSeo {
  const game = games.find((entry) => entry.id === gameId);

  if (!game) {
    throw new Error(`Unknown game SEO id: ${gameId}`);
  }

  return game;
}

export function buildGameJsonLd(gameId: GameId): JsonLdNode {
  const game = getGameSeo(gameId);

  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    url: absoluteUrl(game.path),
    description: game.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    genre: game.genre,
    playMode: game.playMode,
    publisher: {
      "@type": "Organization",
      name: "Stim Labs",
      url: absoluteUrl("/"),
    },
  };
}

export function JsonLdScript({ data }: { data: JsonLdNode | { "@context": string; "@graph": JsonLdNode[] } }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

function faq(name: string, text: string): JsonLdNode {
  return {
    "@type": "Question",
    name,
    acceptedAnswer: {
      "@type": "Answer",
      text,
    },
  };
}
