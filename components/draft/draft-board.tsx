"use client";

import { useDraftStore } from "@/features/draft/store";
import { useDraftRoom } from "@/features/draft/use-draft-room";
import type { DraftRoomProjection } from "@/features/draft/types";
import { AvailablePool } from "./available-pool";
import { CurrentTurn } from "./current-turn";
import { PlayerRosters } from "./player-rosters";
import { TurnTimer } from "./turn-timer";

interface DraftBoardProps {
  initial: DraftRoomProjection;
  myPlayerId: string;
}

export function DraftBoard({ initial, myPlayerId }: DraftBoardProps) {
  const projection = useDraftStore((s) => s.projection) ?? initial;
  const connectionStatus = useDraftStore((s) => s.connectionStatus);

  useDraftRoom({
    draftId: projection.draft.id,
    roomCode: projection.draft.roomCode,
    myPlayerId,
  });

  const { draft, players, availableItems, picks } = projection;
  const currentSlot = draft.pickOrder[draft.currentPickIndex];
  const currentPlayer = players.find((p) => p.seat === currentSlot?.seat);
  const isMyTurn = currentPlayer?.id === myPlayerId;

  const connectionColor =
    connectionStatus === "connected"
      ? "bg-green-400"
      : connectionStatus === "connecting"
        ? "bg-yellow-400"
        : "bg-red-400";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold truncate">{draft.topic}</h1>
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Round {currentSlot?.round ?? "?"} / {draft.rounds}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TurnTimer
            deadline={draft.turnDeadline}
            timerSeconds={draft.timerSeconds}
            draftId={draft.id}
            isMyTurn={isMyTurn}
            myPlayerId={myPlayerId}
          />
          <span
            className={`w-2 h-2 rounded-full ${connectionColor}`}
            aria-label={`Connection: ${connectionStatus}`}
          />
        </div>
      </header>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Available pool */}
        <div className="lg:col-span-1">
          <AvailablePool
            items={availableItems}
            myPlayerId={myPlayerId}
            currentPlayerId={currentPlayer?.id ?? ""}
            draftId={draft.id}
            currentPickIndex={draft.currentPickIndex}
            picks={picks}
          />
        </div>

        {/* Current turn + AI commentary */}
        <div className="lg:col-span-1">
          <CurrentTurn
            currentSlot={currentSlot}
            currentPlayer={currentPlayer}
            isMyTurn={isMyTurn}
            picks={picks}
            players={players}
          />
        </div>

        {/* Player rosters */}
        <div className="lg:col-span-1">
          <PlayerRosters
            players={players}
            picks={picks}
            items={availableItems}
            draftId={draft.id}
            myPlayerId={myPlayerId}
          />
        </div>
      </div>
    </div>
  );
}
