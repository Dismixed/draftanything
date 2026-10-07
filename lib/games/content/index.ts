import type { Metadata } from "next";
import { getGame, type GameId } from "@/lib/games/registry";
import { absoluteUrl } from "@/lib/seo";
import { anyguessr } from "./anyguessr";
import { ballKnowledge } from "./ball-knowledge";
import { brainDead } from "./brain-dead";
import { chainlink } from "./chainlink";
import { draftAnything } from "./draft-anything";
import { freezeframes } from "./freezeframes";
import { gettingWarmer } from "./getting-warmer";
import { hotTakes } from "./hot-takes";
import { slipperySlope } from "./slippery-slope";
import type { GameContent } from "./types";

export type { GameContent };

export const GAME_CONTENT: Record<GameId, GameContent> = {
  chainlink,
  "brain-dead": brainDead,
  anyguessr,
  "hot-takes": hotTakes,
  freezeframes,
  "ball-knowledge": ballKnowledge,
  "getting-warmer": gettingWarmer,
  "draft-anything": draftAnything,
  "slippery-slope": slipperySlope,
};

export function getGameContent(id: GameId): GameContent {
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
  const { title, description } = content;

  return {
    title,
    description,
    alternates: { canonical: game.canonicalPath },
    openGraph: { title, description, url: game.canonicalPath, siteName: "Stim Games", type: "website" },
  };
}

export function buildFaqJsonLd(id: GameId): Record<string, unknown> {
  const content = getGameContent(id);

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
