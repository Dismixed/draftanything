"use client";

import { useState, useMemo } from "react";
import type { DraftRoomProjection, SafePick } from "@/features/draft/types";

interface VotingPanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

interface VoteState {
  selectedPlayerId: string | null;
  submitted: boolean;
}

export function VotingPanel({ projection, myPlayerId }: VotingPanelProps) {
  const [vote, setVote] = useState<VoteState>({ selectedPlayerId: null, submitted: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { draft, players, picks, availableItems } = projection;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;

  const itemMap = useMemo(
    () => new Map(availableItems.map((item) => [item.id, item])),
    [availableItems],
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

  const handleVote = async () => {
    if (!vote.selectedPlayerId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPlayerId: vote.selectedPlayerId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to submit vote");
      }

      setVote((prev) => ({ ...prev, submitted: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to advance phase");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const currentVoter = players.find((p) => p.id === myPlayerId);

  if (vote.submitted) {
    return (
      <section aria-label="Voting" className="bg-white rounded-xl border p-4">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
          Vote Recorded
        </h2>
        <p className="text-sm text-green-600 font-medium">
          Your vote has been recorded.
        </p>
        {isHost && (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={submitting}
            className="mt-3 w-full bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Advancing..." : "Close Voting & Advance"}
          </button>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Voting" className="bg-white rounded-xl border p-4">
      <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
        Vote for the Best Roster
      </h2>

      {currentVoter && (
        <p className="text-xs text-gray-500 mb-3">
          Voting as <span className="font-semibold">{currentVoter.displayName}</span>
        </p>
      )}

      <div className="space-y-4">
        {players.map((player) => {
          if (player.id === myPlayerId) return null;

          const playerPicks = rosters.get(player.id) ?? [];
          const isSelected = vote.selectedPlayerId === player.id;

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => setVote((prev) => ({ ...prev, selectedPlayerId: player.id }))}
              disabled={submitting}
              className={`w-full text-left border rounded-lg p-3 transition-colors ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold text-sm">{player.displayName}</span>
                <span className="text-xs text-gray-400">Seat {player.seat}</span>
                {player.isHost && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    Host
                  </span>
                )}
              </div>

              <ul className="space-y-0.5">
                {playerPicks.length === 0 ? (
                  <li className="text-xs text-gray-400">No picks yet</li>
                ) : (
                  playerPicks.map((pick) => {
                    const item = itemMap.get(pick.itemId);
                    return (
                      <li key={pick.id} className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="text-gray-300">#{pick.overallPick}</span>
                        <span>{item?.name ?? "?"}</span>
                      </li>
                    );
                  })
                )}
              </ul>
            </button>
          );
        })}
      </div>

      {players.filter((p) => p.id !== myPlayerId).length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No other players to vote for.
        </p>
      )}

      <button
        type="button"
        onClick={handleVote}
        disabled={submitting || !vote.selectedPlayerId}
        className="mt-4 w-full bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Submitting Vote..." : "Submit Vote"}
      </button>

      {isHost && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={submitting}
          className="mt-2 w-full bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          {submitting ? "Advancing..." : "Close Voting Early & Advance"}
        </button>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </section>
  );
}
