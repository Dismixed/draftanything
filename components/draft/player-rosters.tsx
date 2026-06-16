"use client";

import type { SafePlayer, SafePick, SafeItem } from "@/features/draft/types";
import { useMemo } from "react";

interface PlayerRostersProps {
  players: SafePlayer[];
  picks: SafePick[];
  items: SafeItem[];
  draftId: string;
  myPlayerId: string;
}

export function PlayerRosters({
  players,
  picks,
  items,
}: PlayerRostersProps) {
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const rosters = useMemo(() => {
    const map = new Map<string, SafePick[]>();
    for (const player of players) {
      map.set(
        player.id,
        picks
          .filter((p) => p.playerId === player.id)
          .sort((a, b) => a.overallPick - b.overallPick),
      );
    }
    return map;
  }, [players, picks]);

  return (
    <section
      aria-label="Player rosters"
      className="bg-white rounded-xl border p-4"
    >
      <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
        Rosters
      </h2>

      <div className="space-y-4">
        {players.map((player) => {
          const playerPicks = rosters.get(player.id) ?? [];
          return (
            <div key={player.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-sm">
                  {player.displayName}
                </span>
                <span className="text-xs text-gray-400">
                  Seat {player.seat}
                </span>
                {player.isHost && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    Host
                  </span>
                )}
              </div>

              {playerPicks.length === 0 ? (
                <p className="text-xs text-gray-400 ml-1">No picks yet</p>
              ) : (
                <ul className="space-y-0.5 ml-1">
                  {playerPicks.map((pick) => {
                    const item = itemMap.get(pick.itemId);
                    return (
                      <li
                        key={pick.id}
                        className="text-xs text-gray-600 flex items-center gap-2"
                      >
                        <span className="text-gray-300">
                          #{pick.overallPick}
                        </span>
                        <span>{item?.name ?? "?"}</span>
                        {pick.isAutoPick && (
                          <span className="text-yellow-600 text-[10px]">
                            auto
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {players.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No players
        </p>
      )}
    </section>
  );
}
