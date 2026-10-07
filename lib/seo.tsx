import type { MetadataRoute } from "next";
import { GAMES, type GameId } from "@/lib/games/registry";

export type { GameId };

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? "https://stimgames.com",
);

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

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

export const games: GameSeo[] = GAMES.map((game) => ({
  id: game.id,
  name: game.name,
  path: game.canonicalPath,
  description: game.seo.description,
  genre: game.seo.genre,
  playMode: game.seo.playMode,
  priority: game.seo.priority,
}));

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
