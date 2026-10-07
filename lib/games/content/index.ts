import type { Metadata } from "next";
import { getGame, type GameId } from "@/lib/games/registry";
import { absoluteUrl } from "@/lib/seo";
import { hotTakes } from "./hot-takes";
import type { GameContent } from "./types";

export type { GameContent };

export const GAME_CONTENT: Partial<Record<GameId, GameContent>> = {
  "hot-takes": hotTakes,
};

export function getGameContent(id: GameId): GameContent | undefined {
  return GAME_CONTENT[id];
}

export function wordCount(content: GameContent): number {
  const text = [
    content.intro,
    ...content.sections.flatMap((section) => [section.heading, ...section.body]),
    ...content.faq.flatMap((item) => [item.question, item.answer]),
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function gameMetadata(id: GameId): Metadata {
  const game = getGame(id);
  const content = getGameContent(id);
  const title = content?.title ?? game.name;
  const description = content?.description ?? game.seo.description;

  return {
    title,
    description,
    alternates: { canonical: game.canonicalPath },
    openGraph: { title, description, url: game.canonicalPath, siteName: "Stim Games", type: "website" },
  };
}

export function buildFaqJsonLd(id: GameId): Record<string, unknown> | null {
  const content = getGameContent(id);
  if (!content) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": absoluteUrl(`${getGame(id).canonicalPath}#faq`),
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}
