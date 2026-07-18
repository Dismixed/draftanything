"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDraftStore } from "@/features/draft/store";
import { useDraftRoom } from "@/features/draft/use-draft-room";
import { useWatchlist } from "@/features/draft/use-watchlist";
import type { DraftRoomProjection } from "@/features/draft/types";
import { useSound } from "@/lib/audio/sound-context";
import { createSoundGate } from "@/lib/audio/debounce";
import { preloadSamples } from "@/lib/audio/samples";
import { DRAFT_SAMPLE_SRCS } from "@/lib/audio/sounds";
import { AvailablePool } from "./available-pool";
import { PickHistory } from "./pick-history";
import { PlayerRosters } from "./player-rosters";
import { TurnTimer } from "./turn-timer";
import { AiDesk } from "./ai-desk";
import { OffTheDomeInput } from "./off-the-dome-input";
import { VetoPanel } from "./veto-panel";
import { PhasePanel } from "./phase-panel";
import { DraftWatchlist } from "./draft-watchlist";
import { RoomChat } from "@/components/chat/room-chat";

interface DraftBoardProps {
  initial: DraftRoomProjection;
  myPlayerId: string;
}

type MobileTab = "rosters" | "pool" | "ai";

const PHASE_LABELS: Partial<Record<DraftRoomProjection["draft"]["phase"], string>> = {
  VETO_VOTING: "Veto Vote",
  DRAFT_COMPLETE: "Review",
  DEFENSE: "Defense",
  VOTING: "Voting",
  JUDGING: "Judging",
  COMPLETE: "Complete",
};

export function DraftBoard({ initial, myPlayerId }: DraftBoardProps) {
  const router = useRouter();
  const { play, unlocked } = useSound();
  const initialPhaseRef = useRef(initial.draft.phase);
  const prevPhaseRef = useRef(initial.draft.phase);
  const prevPicksLengthRef = useRef(initial.picks.length);
  const prevPendingPickIdRef = useRef(initial.draft.pendingPickId);
  const prevIsMyTurnRef = useRef(false);
  const opponentPickGateRef = useRef(createSoundGate(500));
  const turnStripRef = useRef<HTMLDivElement>(null);
  const projection = useDraftStore((s) => s.projection) ?? initial;
  const connectionStatus = useDraftStore((s) => s.connectionStatus);
  const [mobileTab, setMobileTab] = useState<MobileTab>("rosters");
  const [isSubmittingPick, setIsSubmittingPick] = useState(false);

  const { refetch: refetchProjection } = useDraftRoom({
    draftId: initial.draft.id,
    roomCode: initial.draft.roomCode,
    myPlayerId,
    initialProjection: initial,
  });

  const refreshProjection = useCallback(async () => {
    await refetchProjection();
  }, [refetchProjection]);

  const handleOffTheDomePick = useCallback(
    async (itemName: string) => {
      if (projection.draft.phase !== "DRAFTING") {
        throw new Error("This action isn't available in the current phase.");
      }

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
          play("ui.error", { profile: "restrained" });
          throw new Error(err.message ?? "Pick failed");
        }
        play("pick", { profile: "restrained" });

        await refetchProjection();

        void fetch("/api/ai/commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId: projection.draft.id }),
        });
      } finally {
        setIsSubmittingPick(false);
      }
    },
    [
      projection.draft.id,
      projection.draft.phase,
      projection.draft.currentPickIndex,
      play,
      refetchProjection,
    ],
  );

  const handleInitiateVeto = useCallback(async () => {
    const res = await fetch(`/api/drafts/${projection.draft.id}/veto/initiate`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json();
      play("ui.error", { profile: "restrained" });
      throw new Error(err.message ?? "Failed to initiate veto");
    }
    play("veto", { profile: "restrained" });
    await refetchProjection();
  }, [projection.draft.id, play, refetchProjection]);

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
          play("ui.error", { profile: "restrained" });
          throw new Error(err.message ?? "Pick failed");
        }
        play("pick", { profile: "restrained" });
        await refetchProjection();
        void fetch("/api/ai/commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draftId: projection.draft.id }),
        });
      } finally {
        setIsSubmittingPick(false);
      }
    },
    [projection.draft.id, projection.draft.currentPickIndex, play, refetchProjection],
  );

  useEffect(() => {
    if (unlocked) preloadSamples(DRAFT_SAMPLE_SRCS);
  }, [unlocked]);

  useEffect(() => {
    if (projection.draft.phase !== "VOTING") return;
    if (projection.votes.length < projection.players.length) return;
    void refreshProjection();
  }, [
    projection.draft.phase,
    projection.players.length,
    projection.votes.length,
    refreshProjection,
  ]);

  useEffect(() => {
    if (projection.draft.phase !== initialPhaseRef.current) {
      initialPhaseRef.current = projection.draft.phase;
      router.refresh();
    }
  }, [projection.draft.phase, router]);

  useEffect(() => {
    const phase = projection.draft.phase;
    const prev = prevPhaseRef.current;
    if (phase !== prev) {
      if (phase === "VETO_VOTING") {
        play("veto", { profile: "restrained" });
      } else if (prev === "VETO_VOTING") {
        const pendingId = prevPendingPickIdRef.current;
        const stillPending = projection.picks.some((p) => p.id === pendingId);
        if (pendingId && !stillPending) {
          play("veto-success", { profile: "restrained" });
        } else {
          play("phase", { profile: "restrained" });
        }
      } else {
        play("phase", { profile: "restrained" });
      }
      prevPhaseRef.current = phase;
    }
    prevPendingPickIdRef.current = projection.draft.pendingPickId;
  }, [projection.draft.phase, projection.draft.pendingPickId, projection.picks, play]);

  const { draft, players, availableItems, picks } = projection;

  useEffect(() => {
    const len = picks.length;
    if (len > prevPicksLengthRef.current) {
      const latest = picks.reduce((a, b) =>
        a.overallPick > b.overallPick ? a : b,
      );
      if (latest.playerId !== myPlayerId && opponentPickGateRef.current()) {
        play("pick", { profile: "restrained", volumeScale: 0.7 });
      }
    }
    prevPicksLengthRef.current = len;
  }, [picks, myPlayerId, play]);

  const isDrafting = draft.phase === "DRAFTING";
  const isVetoVoting = draft.phase === "VETO_VOTING";
  const isActiveDraft = isDrafting || isVetoVoting;
  const isEvaluatingJudgment =
    draft.phase === "JUDGING" &&
    draft.judgingStartedAt != null &&
    projection.judgment === null;
  const phaseLabel = isEvaluatingJudgment
    ? "Evaluating"
    : PHASE_LABELS[draft.phase];
  const currentSlot = isActiveDraft ? draft.pickOrder[draft.currentPickIndex] : undefined;
  const currentPlayer = currentSlot
    ? players.find((p) => p.seat === currentSlot.seat)
    : undefined;
  const isMyTurn = isDrafting && currentPlayer?.id === myPlayerId;

  useEffect(() => {
    if (isMyTurn && !prevIsMyTurnRef.current && isDrafting) {
      play("draft.on-clock", { profile: "restrained" });
      turnStripRef.current?.classList.add("anim-glow-pulse");
      const t = window.setTimeout(() => {
        turnStripRef.current?.classList.remove("anim-glow-pulse");
      }, 2400);
      return () => window.clearTimeout(t);
    }
    prevIsMyTurnRef.current = !!isMyTurn;
  }, [isMyTurn, isDrafting, play]);

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
              onAutoPickTriggered={refreshProjection}
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
          ref={turnStripRef}
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

      {/* Mobile tabs — layout via Tailwind so md:hidden isn't overridden by inline display */}
      <nav
        className={[
          "flex md:hidden sticky z-10",
          isDrafting && currentPlayer && currentSlot ? "top-[89px]" : "top-[53px]",
        ].join(" ")}
        style={{
          borderBottom: '1px solid var(--border-hi)',
          background: 'rgba(11,14,28,0.98)',
        }}
        aria-label="Draft view tabs"
      >
        {(["rosters", "pool", "ai"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className="draft-tab-btn"
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

      {isVetoVoting && draft.pickingMode === "off_the_dome" && (
        <VetoPanel
          projection={projection}
          myPlayerId={myPlayerId}
          onVoteSubmitted={refreshProjection}
        />
      )}

      {draft.phase === "VOTING" && (
        <div style={{ padding: '20px 16px 0', maxWidth: '960px', margin: '0 auto' }}>
          <PhasePanel
            projection={projection}
            myPlayerId={myPlayerId}
            onVoteSubmitted={refreshProjection}
          />
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
              currentPickIndex={isVetoVoting ? -1 : draft.currentPickIndex}
              pickOrder={draft.pickOrder}
              pendingPickId={draft.pendingPickId}
              myPlayerId={myPlayerId}
              canInitiateVeto={isDrafting}
              onInitiateVeto={handleInitiateVeto}
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
            currentPlayerId={isVetoVoting ? undefined : currentPlayer?.id}
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
        <PhasePanel
          projection={projection}
          myPlayerId={myPlayerId}
          onJudgingComplete={refreshProjection}
        />
      )}

      {isDrafting && draft.pickingMode === "off_the_dome" && currentPlayer && (
        <OffTheDomeInput
          isMyTurn={!!isMyTurn}
          currentPlayerName={currentPlayer.displayName}
          onSubmit={handleOffTheDomePick}
          isSubmitting={isSubmittingPick}
        />
      )}

      <RoomChat
        draftId={draft.id}
        roomCode={draft.roomCode}
        myPlayerId={myPlayerId}
        bottomInset={
          isDrafting && draft.pickingMode === "off_the_dome"
            ? "max(140px, calc(112px + env(safe-area-inset-bottom)))"
            : undefined
        }
      />
    </div>
  );
}
