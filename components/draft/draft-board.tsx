"use client";

import { useState } from "react";
import { useDraftStore } from "@/features/draft/store";
import { useDraftRoom } from "@/features/draft/use-draft-room";
import type { DraftRoomProjection } from "@/features/draft/types";
import { AvailablePool } from "./available-pool";
import { CurrentTurn } from "./current-turn";
import { PlayerRosters } from "./player-rosters";
import { TurnTimer } from "./turn-timer";
import { AiDesk } from "./ai-desk";

interface DraftBoardProps {
  initial: DraftRoomProjection;
  myPlayerId: string;
}

type MobileTab = "pool" | "rosters" | "ai";

export function DraftBoard({ initial, myPlayerId }: DraftBoardProps) {
  const projection = useDraftStore((s) => s.projection) ?? initial;
  const connectionStatus = useDraftStore((s) => s.connectionStatus);
  const [mobileTab, setMobileTab] = useState<MobileTab>("pool");

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
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-bold truncate">{draft.topic}</h1>
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold shrink-0">
            R{currentSlot?.round ?? "?"}/{draft.rounds}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <TurnTimer
            deadline={draft.turnDeadline}
            timerSeconds={draft.timerSeconds}
            draftId={draft.id}
            isMyTurn={isMyTurn}
            myPlayerId={myPlayerId}
            serverNow={projection.serverNow}
          />
          <span
            className={`w-2 h-2 rounded-full ${connectionColor}`}
            aria-label={`Connection: ${connectionStatus}`}
          />
        </div>
      </header>

      {/* Mobile tabs */}
      <nav
        className="flex border-b bg-white sticky top-[57px] z-10 md:hidden"
        aria-label="Draft view tabs"
      >
        {(["pool", "rosters", "ai"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 text-xs font-semibold uppercase tracking-wider py-2.5 transition-colors ${
              mobileTab === tab
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "pool" ? "Pool" : tab === "rosters" ? "Rosters" : "AI"}
          </button>
        ))}
      </nav>

      {/* Current turn indicator (mobile) */}
      <div className="md:hidden px-4 pt-3 pb-2">
        <CurrentTurn
          currentSlot={currentSlot}
          currentPlayer={currentPlayer}
          isMyTurn={isMyTurn}
          picks={picks}
          players={players}
        />
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {/* Available pool: visible on desktop; on mobile only when pool tab active */}
        <div
          className={`md:col-span-1 ${mobileTab !== "pool" ? "hidden md:block" : ""}`}
        >
          <AvailablePool
            items={availableItems}
            myPlayerId={myPlayerId}
            currentPlayerId={currentPlayer?.id ?? ""}
            draftId={draft.id}
            currentPickIndex={draft.currentPickIndex}
            picks={picks}
          />
        </div>

        {/* Current turn info (desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <CurrentTurn
            currentSlot={currentSlot}
            currentPlayer={currentPlayer}
            isMyTurn={isMyTurn}
            picks={picks}
            players={players}
          />
        </div>

        {/* AI Commissioner Commentary */}
        <div
          className={`md:col-span-1 ${mobileTab !== "ai" ? "hidden md:block" : ""}`}
        >
          <AiDesk commentary={projection.commentary} />
        </div>

        {/* Player rosters */}
        <div
          className={`md:col-span-1 ${mobileTab !== "rosters" ? "hidden md:block" : ""}`}
        >
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
