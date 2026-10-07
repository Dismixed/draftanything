import type { Metadata } from "next";
import Image from "next/image";
import { GameCard } from "@/components/home/game-card";
import { Today } from "@/components/home/today";
import { utcDayNumber } from "@/lib/games/today";
import { buildHomeJsonLd, JsonLdScript } from "@/lib/seo";

// The featured game changes at midnight UTC. Keep the cached page close to current;
// <Today /> corrects any remaining gap from the browser's clock.
export const revalidate = 300;

const DESCRIPTION =
  "Seven free daily games: trivia, geography, word chains, pop culture and tier lists, in the style of Wordle and Connections. New puzzles every day, no sign-up.";

export const metadata: Metadata = {
  title: { absolute: "Stim Games: Free Daily Games, New Puzzles Every Day" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Stim Games: Free Daily Games, New Puzzles Every Day",
    description: DESCRIPTION,
    url: "/",
    siteName: "Stim Games",
    type: "website",
  },
};

export default function StimGames() {
  return (
    <main className="home-page game-page">
      <JsonLdScript data={buildHomeJsonLd()} />

      <div className="home-inner">
        <header className="home-header">
          <Image
            src="/stimlabs_badge_v5.svg"
            alt="Stim Labs"
            width={44}
            height={51}
            priority
            unoptimized
          />
          <h1>
            Stim <em>Games</em>
          </h1>
        </header>
        <p className="home-tagline">Seven free daily games. New puzzles every day.</p>
        <p className="home-subline">
          Trivia, geography, word chains, pop culture and tier lists, in the style of Wordle and
          Connections. No sign-up.
        </p>

        <Today dayNumber={utcDayNumber()} />

        <div className="home-section-head">
          <h2 className="home-section-label">Play with friends</h2>
          <span className="home-section-rule" aria-hidden />
        </div>
        <div className="home-party">
          <GameCard
            gameId="draft-anything"
            cta="Create a room"
            event="home_game_clicked"
            eventProps={{ game: "draft-anything", slot: "party", position: 1, played_today: false }}
          />
          <GameCard
            gameId="slippery-slope"
            cta="Open the board"
            event="home_game_clicked"
            eventProps={{ game: "slippery-slope", slot: "party", position: 2, played_today: false }}
          />
        </div>

        <p className="home-footer">Built by Stim Labs</p>
      </div>
    </main>
  );
}
