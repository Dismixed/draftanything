import type { CSSProperties } from "react";
import Link from "next/link";
import { GameCard } from "@/components/home/game-card";
import { buildFaqJsonLd, getGameContent } from "@/lib/games/content";
import { getGame, type GameId } from "@/lib/games/registry";
import { otherDailies } from "@/lib/games/today";
import { JsonLdScript } from "@/lib/seo";

/** Descriptive content shown beneath a game. */
export function GameAbout({ gameId }: { gameId: GameId }) {
  const content = getGameContent(gameId);
  const game = getGame(gameId);
  const faqJsonLd = buildFaqJsonLd(gameId);
  const headingId = `about-${gameId}`;

  return (
    <section
      className="game-about"
      aria-labelledby={headingId}
      style={
        {
          "--ga-page": game.theme.page,
          "--ga-text": game.theme.text,
          "--ga-muted": game.theme.muted,
          "--ga-border": game.theme.border,
        } as CSSProperties
      }
    >
      <div className="game-about-inner">
        <h2 id={headingId}>{`About ${game.name}`}</h2>
        <p className="game-about-intro">{content.intro}</p>

        {content.sections.map((section, index) => (
          <details key={section.heading} open={index === 0}>
            <summary>{section.heading}</summary>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </details>
        ))}

        <h3>More daily games</h3>
        <div className="game-about-more" data-testid="game-about-more">
          {otherDailies(gameId).map((otherId) => (
            <GameCard
              key={otherId}
              gameId={otherId}
              event="game_about_link_clicked"
              eventProps={{ from_game: gameId, to_game: otherId }}
            />
          ))}
        </div>
        <Link href="/" className="game-about-home">
          All Stim Games →
        </Link>

        <h3>Questions</h3>
        {content.faq.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
      <JsonLdScript data={faqJsonLd} />
    </section>
  );
}
