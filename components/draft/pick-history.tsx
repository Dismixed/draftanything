"use client";

import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import type { SafePick, SafePlayer, PickSlot } from "@/features/draft/types";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

interface PickHistoryProps {
  picks: SafePick[];
  players: SafePlayer[];
  currentPickIndex: number;
  pickOrder: PickSlot[];
  pendingPickId?: string | null;
  myPlayerId: string;
  canInitiateVeto: boolean;
  onInitiateVeto?: () => Promise<void>;
}

export function PickHistory({
  picks,
  players,
  currentPickIndex,
  pickOrder,
  pendingPickId,
  myPlayerId,
  canInitiateVeto,
  onInitiateVeto,
}: PickHistoryProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [initiatingVeto, setInitiatingVeto] = useState(false);
  const [vetoError, setVetoError] = useState<string | null>(null);

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => b.overallPick - a.overallPick),
    [picks],
  );

  const latestPick = sortedPicks[0] ?? null;

  const nextSlot = currentPickIndex >= 0 ? pickOrder[currentPickIndex] : undefined;
  const [animatedPickId, setAnimatedPickId] = useState<string | null>(null);
  const prevLengthRef = useRef(picks.length);

  useEffect(() => {
    if (picks.length > prevLengthRef.current) {
      const newest = [...picks].sort((a, b) => b.overallPick - a.overallPick)[0];
      if (newest) {
        setAnimatedPickId(newest.id);
        const t = window.setTimeout(() => setAnimatedPickId(null), 400);
        prevLengthRef.current = picks.length;
        if (listRef.current) listRef.current.scrollTop = 0;
        return () => window.clearTimeout(t);
      }
    }
    prevLengthRef.current = picks.length;
  }, [picks]);

  const handleInitiateVeto = useCallback(async () => {
    if (!onInitiateVeto || initiatingVeto) return;
    setVetoError(null);
    setInitiatingVeto(true);
    try {
      await onInitiateVeto();
    } catch (e) {
      setVetoError(e instanceof Error ? e.message : "Failed to initiate veto");
    } finally {
      setInitiatingVeto(false);
    }
  }, [onInitiateVeto, initiatingVeto]);

  const showVetoButton =
    canInitiateVeto &&
    latestPick &&
    !latestPick.forfeited &&
    !latestPick.vetoChallengeResolved &&
    latestPick.playerId !== myPlayerId &&
    players.length > 1;

  return (
    <section
      aria-label="Pick history"
      className="panel-card"
      style={{ padding: '16px' }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            margin: 0,
          }}
        >
          Pick History
        </h2>
        {showVetoButton && (
          <button
            type="button"
            className="btn-veto-danger"
            disabled={initiatingVeto}
            onClick={() => void handleInitiateVeto()}
            style={{
              background: "rgba(255,68,68,0.12)",
              color: "#ff6b6b",
              border: "1px solid rgba(255,68,68,0.45)",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "8px",
              fontWeight: 600,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: initiatingVeto ? "not-allowed" : "pointer",
              opacity: initiatingVeto ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            {initiatingVeto ? (
              <ButtonLoadingLabel loading loadingLabel="..." label="Veto last pick" />
            ) : (
              "Veto last pick"
            )}
          </button>
        )}
      </div>

      {vetoError && (
        <p
          role="alert"
          style={{
            color: "#ff4d4d",
            fontSize: "11px",
            margin: "0 0 8px 0",
          }}
        >
          {vetoError}
        </p>
      )}

      <ul
        ref={listRef}
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxHeight: '360px',
          overflowY: 'auto',
        }}
      >
        {nextSlot && (
          <li
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 8px',
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.3)',
              fontSize: '13px',
              color: 'var(--gold)',
              fontStyle: 'italic',
            }}
          >
            <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontVariantNumeric: 'tabular-nums', minWidth: '24px' }}>
              {nextSlot.overallPick}.
            </span>
            <span>? — On the clock...</span>
          </li>
        )}

        {sortedPicks.map((pick) => {
          const player = playerMap.get(pick.playerId);
          const isPending = pick.id === pendingPickId;
          return (
            <li
              key={pick.id}
              className={pick.id === animatedPickId ? "anim-slide-in-top" : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                background: isPending ? 'rgba(201,168,76,0.08)' : 'var(--panel)',
                border: `1px solid ${isPending ? 'rgba(201,168,76,0.45)' : 'var(--border-hi)'}`,
                fontSize: '13px',
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontVariantNumeric: 'tabular-nums', minWidth: '24px' }}>
                {pick.overallPick}.
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {player?.displayName ?? "?"}
                {" — "}
                {pick.forfeited ? (
                  <span style={{ color: 'var(--text-dim)' }}>Forfeited</span>
                ) : (
                  pick.itemName ?? "?"
                )}
                {isPending && (
                  <span style={{ color: 'var(--gold)', fontSize: '11px', marginLeft: '6px' }}>
                    (veto vote)
                  </span>
                )}
              </span>
            </li>
          );
        })}

        {picks.length === 0 && !nextSlot && (
          <li
            style={{
              color: 'var(--text-dim)',
              fontSize: '13px',
              textAlign: 'center',
              padding: '16px 0',
            }}
          >
            No picks yet
          </li>
        )}
      </ul>
    </section>
  );
}
