"use client";

import type { PickSlot, SafePlayer, SafePick } from "@/features/draft/types";

interface CurrentTurnProps {
  currentSlot: PickSlot | undefined;
  currentPlayer: SafePlayer | undefined;
  isMyTurn: boolean;
  picks: SafePick[];
  players: SafePlayer[];
}

export function CurrentTurn({
  currentSlot,
  currentPlayer,
  isMyTurn,
  picks,
  players,
}: CurrentTurnProps) {
  if (!currentSlot || !currentPlayer) {
    return (
      <section
        aria-label="Current turn"
        className="bg-white rounded-xl border p-4"
      >
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
          Current Turn
        </h2>
        <p className="text-sm text-gray-400 text-center py-4">
          Draft is complete or waiting for start
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Current turn"
      aria-live="polite"
      className={`rounded-xl border p-4 ${
        isMyTurn
          ? "bg-indigo-50 border-indigo-300"
          : "bg-white"
      }`}
    >
      <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
        Current Turn
      </h2>

      <div className="text-center py-4">
        <p className="text-lg font-bold">
          {currentPlayer.displayName}
        </p>
        <p className="text-sm text-gray-500">
          Seat {currentPlayer.seat}
          {currentPlayer.isHost && " (Host)"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Pick {currentSlot.overallPick} of{" "}
          {picks.length + (currentSlot.overallPick - (picks.length + 1)) + currentSlot.overallPick || "?"}
          {" "}· Round {currentSlot.round} · Pick #{currentSlot.pickInRound}
        </p>
      </div>

      {isMyTurn && (
        <p className="text-sm text-indigo-700 font-medium text-center">
          Your turn — select an item from the pool
        </p>
      )}

      {!isMyTurn && (
        <p className="text-sm text-gray-500 text-center">
          Waiting for {currentPlayer.displayName} to pick...
        </p>
      )}

      {/* Recent picks */}
      {picks.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
            Recent Picks
          </h3>
          <ul className="space-y-1">
            {[...picks]
              .reverse()
              .slice(0, 3)
              .map((pick) => {
                const picker = players.find((p) => p.id === pick.playerId);
                return (
                  <li key={pick.id} className="text-xs text-gray-600">
                    <span className="font-medium">{picker?.displayName ?? "?"}</span>
                    {" "}· Pick #{pick.overallPick}
                    {pick.isAutoPick && (
                      <span className="text-yellow-600 ml-1">(auto)</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      )}
    </section>
  );
}
