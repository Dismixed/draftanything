"use client";

import Link from "next/link";
import { requestDirectPlay } from "@/lib/daily-intro/direct-play";
import { GAMES, isDailyGame } from "@/lib/games/registry";

/** Links each game's main page, the one search engines index. */
export function AllGamesNav() {
  return (
    <nav className="home-links" aria-label="All games">
      {GAMES.map((game) => (
        <Link
          key={game.id}
          href={game.canonicalPath}
          onClick={() => {
            if (isDailyGame(game.id)) requestDirectPlay(game.id);
          }}
        >
          {game.name}
        </Link>
      ))}
    </nav>
  );
}
