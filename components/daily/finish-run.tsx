"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { nextDaily } from "@/lib/games/next";
import { DAILY_GAMES, GAME_META, type DailyGameId } from "@/lib/streak/types";

export function FinishRun({ gameId, played }: { gameId: DailyGameId; played: ReadonlySet<DailyGameId> }) {
  const next = nextDaily(played);
  const done = DAILY_GAMES.filter((id) => played.has(id)).length;
  const left = DAILY_GAMES.length - done;

  return (
    <div className="fin-run">
      <nav className="fin-rail" aria-label="Today's games">
        {DAILY_GAMES.map((id) => {
          const meta = GAME_META[id];
          const className = [
            "fin-chip",
            played.has(id) ? "is-done" : "",
            id === gameId ? "is-current" : "",
            id === next ? "is-next" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Link
              key={id}
              href={meta.href}
              className={className}
              style={{ "--c": meta.theme.accent } as CSSProperties}
              aria-current={id === gameId ? "true" : undefined}
              data-testid={`finish-chip-${id}`}
            >
              {meta.label}
              {id === next ? <span className="fin-chip-tag">next</span> : null}
            </Link>
          );
        })}
      </nav>
      <p className="fin-sweep-line" data-testid="finish-sweep-line">
        {left === 0 ? "Sweep. All seven done today." : `${done} of 7 today · ${left} to go for a Sweep`}
      </p>
    </div>
  );
}
