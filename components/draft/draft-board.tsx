"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftStore } from "@/features/draft/store";
import { useDraftRoom } from "@/features/draft/use-draft-room";
import { useWatchlist } from "@/features/draft/use-watchlist";
import type { DraftRoomProjection } from "@/features/draft/types";
import { AvailablePool } from "./available-pool";
import { PickHistory } from "./pick-history";
import { PlayerRosters } from "./player-rosters";
import { TurnTimer } from "./turn-timer";
import { AiDesk } from "./ai-desk";
import { OffTheDomeInput } from "./off-the-dome-input";
import { PhasePanel } from "./phase-panel";
import { DraftWatchlist } from "./draft-watchlist";

interface DraftBoardProps {
  initial: DraftRoomProjection;
  myPlayerId: string;
}

type MobileTab = "rosters" | "pool" | "ai";

const PHASE_LABELS: Partial<Record<DraftRoomProjection["draft"]["phase"], string>> = {
  DRAFT_COMPLETE: "Review",
  DEFENSE: "Defense",
  VOTING: "Voting",
  JUDGING: "Judging",
  COMPLETE: "Complete",
};

export function DraftBoard({ initial, myPlayerId }: DraftBoardProps) {
  const router = useRouter();
  const initialPhaseRef = useRef(initial.draft.phase);
  const setProjection = useDraftStore((s) => s.setProjection);
  const projection = useDraftStore((s) => s.projection) ?? initial;
  const connectionStatus = useDraftStore((s) => s.connectionStatus);
  const [mobileTab, setMobileTab] = useState<MobileTab>("rosters");
  const [isSubmittingPick, setIsSubmittingPick] = useState(false);

  const handleOffTheDomePick = useCallback(
    async (itemName: string) => {
      setIsSubmittingPick(true);
      try {
        const res = await fetch(`/api/drafts/${projection.draft.id}/pick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemName,
            expectedPick: projection.draft.currentPickIndex,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message ?? "Pick failed");
        }
      } finally {
        setIsSubmittingPick(false);
      }
    },
    [projection.draft.id, projection.draft.currentPickIndex],
  );

  const handlePoolPick = useCallback(
    async (itemId: string) => {
      setIsSubmittingPick(true);
      try {
        const res = await fetch(`/api/drafts/${projection.draft.id}/pick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId,
            expectedPick: projection.draft.currentPickIndex,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message ?? "Pick failed");
        }
      } finally {
        setIsSubmittingPick(false);
      }
    },
    [projection.draft.id, projection.draft.currentPickIndex],
  );

  useDraftRoom({
    draftId: projection.draft.id,
    roomCode: projection.draft.roomCode,
    myPlayerId,
  });

  useEffect(() => {
    if (projection.draft.phase !== initialPhaseRef.current) {
      setProjection(null);
      initialPhaseRef.current = projection.draft.phase;
      router.refresh();
    }
  }, [projection.draft.phase, router, setProjection]);

  const { draft, players, availableItems, picks } = projection;
  const isDrafting = draft.phase === "DRAFTING";
  const isEvaluatingJudgment =
    draft.phase === "JUDGING" &&
    draft.judgingStartedAt != null &&
    projection.judgment === null;
  const phaseLabel = isEvaluatingJudgment
    ? "Evaluating"
    : PHASE_LABELS[draft.phase];
  const currentSlot = isDrafting ? draft.pickOrder[draft.currentPickIndex] : undefined;
  const currentPlayer = currentSlot
    ? players.find((p) => p.seat === currentSlot.seat)
    : undefined;
  const isMyTurn = isDrafting && currentPlayer?.id === myPlayerId;

  const {
    entries: watchlistEntries,
    addEntry: addWatchlistEntry,
    removeEntry: removeWatchlistEntry,
    moveEntry: moveWatchlistEntry,
  } = useWatchlist({
    draftId: draft.id,
    playerId: myPlayerId,
    picks,
    availableItems,
  });

  const watchlistItemIds = useMemo(
    () =>
      new Set(
        watchlistEntries
          .filter((entry) => entry.kind === "pool")
          .map((entry) => entry.itemId),
      ),
    [watchlistEntries],
  );

  const connectionDotColor =
    connectionStatus === "connected"
      ? "#00ff87"
      : connectionStatus === "connecting"
        ? "#f0c860"
        : "#ff4444";

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 md:static"
        style={{
          background: 'rgba(11,14,28,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-hi)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <h1
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              fontSize: '18px',
              color: 'var(--text)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {draft.topic}
          </h1>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: phaseLabel ? 'var(--gold)' : 'var(--text-dim)',
              flexShrink: 0,
            }}
          >
            {isDrafting
              ? `R${currentSlot?.round ?? "?"}/${draft.rounds}`
              : (phaseLabel ?? `R${draft.rounds}/${draft.rounds}`)}
          </span>
        </div>

        {isDrafting && currentPlayer && currentSlot && (
          <div
            className="hidden sm:block"
            style={{
              fontSize: '12px',
              color: 'var(--text-dim)',
              textAlign: 'center',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ color: isMyTurn ? 'var(--gold)' : 'var(--text)' }}>
              {isMyTurn ? "Your turn" : currentPlayer.displayName}
            </span>
            {" · Pick "}{currentSlot.overallPick}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {isDrafting && (
            <TurnTimer
              deadline={draft.turnDeadline}
              timerSeconds={draft.timerSeconds}
              draftId={draft.id}
              isMyTurn={isMyTurn}
              myPlayerId={myPlayerId}
              serverNow={projection.serverNow}
            />
          )}
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: connectionDotColor,
              display: 'inline-block',
              flexShrink: 0,
            }}
            aria-label={`Connection: ${connectionStatus}`}
          />
        </div>
      </header>

      {/* Mobile turn strip */}
      {isDrafting && currentPlayer && currentSlot && (
        <div
          className="sm:hidden"
          style={{
            padding: '8px 16px',
            borderBottom: '1px solid var(--border-hi)',
            background: isMyTurn ? 'rgba(201,168,76,0.06)' : 'rgba(11,14,28,0.98)',
            fontSize: '12px',
            color: 'var(--text-dim)',
            textAlign: 'center',
          }}
        >
          <span style={{ color: isMyTurn ? 'var(--gold)' : 'var(--text)' }}>
            {isMyTurn ? "Your turn" : `${currentPlayer.displayName} on the clock`}
          </span>
          {" · Pick "}{currentSlot.overallPick}
          {isMyTurn && draft.pickingMode === "off_the_dome"
            ? " — type your pick below"
            : isMyTurn
              ? " — tap Pool to select"
              : null}
        </div>
      )}

      {/* Mobile tabs */}
      <nav
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-hi)',
          background: 'rgba(11,14,28,0.98)',
          position: 'sticky',
          top: isDrafting && currentPlayer && currentSlot ? '89px' : '53px',
          zIndex: 10,
        }}
        className="md:hidden"
        aria-label="Draft view tabs"
      >
        {(["rosters", "pool", "ai"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            style={{
              flex: 1,
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: mobileTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
              color: mobileTab === tab ? 'var(--gold)' : 'var(--text-dim)',
              cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab === "pool" ? "Pool" : tab === "rosters" ? "Rosters" : "AI"}
          </button>
        ))}
      </nav>

      {draft.phase === "VOTING" && (
        <div style={{ padding: '20px 16px 0', maxWidth: '960px', margin: '0 auto' }}>
          <PhasePanel projection={projection} myPlayerId={myPlayerId} />
        </div>
      )}

      {/* Main layout: pool | rosters (hero) | sidebar */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_minmax(0,2.5fr)_minmax(200px,1fr)] gap-4 px-4 pt-6 pb-4 md:pt-8"
        style={{
          alignItems: "start",
          paddingBottom:
            isDrafting && draft.pickingMode === "off_the_dome"
              ? "max(120px, calc(88px + env(safe-area-inset-bottom)))"
              : undefined,
        }}
      >
        {/* Available pool / Pick history */}
        <div
          className={`md:col-span-1 lg:col-span-1 order-2 md:order-1 flex flex-col gap-4 ${mobileTab !== "pool" ? "hidden md:flex" : ""}`}
        >
          {draft.pickingMode === "off_the_dome" ? (
            <PickHistory
              picks={picks}
              players={players}
              currentPickIndex={draft.currentPickIndex}
              pickOrder={draft.pickOrder}
            />
          ) : (
            <AvailablePool
              items={availableItems}
              myPlayerId={myPlayerId}
              currentPlayerId={currentPlayer?.id ?? ""}
              draftId={draft.id}
              currentPickIndex={draft.currentPickIndex}
              picks={picks}
              pickingMode={draft.pickingMode}
              watchlistItemIds={watchlistItemIds}
              onAddToWatchlist={(itemId, name) =>
                addWatchlistEntry({ kind: "pool", itemId, name })
              }
            />
          )}

          {isDrafting && (
            <DraftWatchlist
              entries={watchlistEntries}
              pickingMode={draft.pickingMode}
              isMyTurn={!!isMyTurn}
              isSubmittingPick={isSubmittingPick}
              onAddText={(name) => addWatchlistEntry({ kind: "text", name })}
              onAddPoolItem={(itemId, name) =>
                addWatchlistEntry({ kind: "pool", itemId, name })
              }
              onRemove={removeWatchlistEntry}
              onMove={moveWatchlistEntry}
              onPickPoolItem={draft.pickingMode === "pool" ? handlePoolPick : undefined}
              onPickTextItem={
                draft.pickingMode === "off_the_dome" ? handleOffTheDomePick : undefined
              }
            />
          )}
        </div>

        {/* Rosters — center hero */}
        <div
          className={`md:col-span-1 lg:col-span-1 order-1 md:order-2 ${mobileTab !== "rosters" ? "hidden md:block" : ""}`}
        >
          <PlayerRosters
            players={players}
            picks={picks}
            items={availableItems}
            draftId={draft.id}
            myPlayerId={myPlayerId}
            currentPlayerId={currentPlayer?.id}
            rounds={draft.rounds}
          />
        </div>

        {/* AI commentary */}
        <div
          className={[
            "order-3",
            mobileTab === "ai" ? "block" : "hidden",
            "md:block md:col-span-2 lg:col-span-1",
            "lg:col-span-1 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:flex lg:min-h-0 lg:flex-col",
          ].join(" ")}
        >
          <AiDesk
            draftId={draft.id}
            commentary={projection.commentary}
            picks={picks}
            players={players}
          />
        </div>
      </div>

      {(draft.phase === "DRAFT_COMPLETE" ||
        draft.phase === "DEFENSE" ||
        draft.phase === "JUDGING" ||
        draft.phase === "COMPLETE") && (
        <PhasePanel projection={projection} myPlayerId={myPlayerId} />
      )}

      {isDrafting && draft.pickingMode === "off_the_dome" && currentPlayer && (
        <OffTheDomeInput
          isMyTurn={!!isMyTurn}
          currentPlayerName={currentPlayer.displayName}
          onSubmit={handleOffTheDomePick}
          isSubmitting={isSubmittingPick}
        />
      )}
    </div>
  );
}
