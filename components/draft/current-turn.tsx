"use client";

import { useMemo } from "react";
import type { PickSlot, SafePlayer, SafePick, SafeItem } from "@/features/draft/types";

interface CurrentTurnProps {
  currentSlot: PickSlot | undefined;
  currentPlayer: SafePlayer | undefined;
  isMyTurn: boolean;
  picks: SafePick[];
  players: SafePlayer[];
  items: SafeItem[];
  variant?: "full" | "compact";
}

export function CurrentTurn({
  currentSlot,
  currentPlayer,
  isMyTurn,
  picks,
  players,
  items,
  variant = "full",
}: CurrentTurnProps) {
  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const recentPicks = [...picks].reverse().slice(0, variant === "compact" ? 2 : 3);

  if (!currentSlot || !currentPlayer) {
    return (
      <section
        aria-label="Current turn"
        className="panel-card"
        style={{ padding: '16px' }}
      >
        <h2
          style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            margin: '0 0 12px 0',
          }}
        >
          Current Turn
        </h2>
        <p
          style={{
            color: 'var(--text-dim)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          Draft is complete or waiting for start
        </p>
      </section>
    );
  }

  if (variant === "compact") {
    return (
      <section
        aria-label="Current turn"
        aria-live="polite"
        className="panel-card"
        style={{
          padding: '12px 14px',
          borderTop: isMyTurn ? '2px solid var(--gold)' : undefined,
        }}
      >
        <h2
          style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            margin: '0 0 6px 0',
          }}
        >
          On the Clock
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text)', margin: '0 0 2px 0' }}>
          <span
            style={{
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              color: isMyTurn ? 'var(--gold-hi)' : 'var(--text)',
            }}
          >
            {isMyTurn ? "You" : currentPlayer.displayName}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>
            {" "}· Pick {currentSlot.overallPick} · R{currentSlot.round}
          </span>
        </p>
        <p style={{ fontSize: '11px', color: isMyTurn ? 'var(--gold)' : 'var(--text-dim)', margin: 0 }}>
          {isMyTurn ? "Select from the pool" : `Waiting for ${currentPlayer.displayName}`}
        </p>
        {recentPicks.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {recentPicks.map((pick) => {
              const picker = players.find((p) => p.id === pick.playerId);
              const item = itemMap.get(pick.itemId);
              return (
                <li key={pick.id} style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  {picker?.displayName ?? "?"} → {item?.name ?? "?"}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Current turn"
      aria-live="polite"
      className="panel-card"
      style={{
        padding: '16px',
        borderTop: isMyTurn ? '2px solid var(--gold)' : undefined,
        boxShadow: isMyTurn ? '0 0 24px rgba(201,168,76,0.06) inset' : undefined,
      }}
    >
      <h2
        style={{
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          margin: '0 0 4px 0',
        }}
      >
        On the Clock
      </h2>

      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <p
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: '20px',
            color: isMyTurn ? 'var(--gold-hi)' : 'var(--text)',
            margin: '0 0 4px 0',
          }}
        >
          {currentPlayer.displayName}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
          Seat {currentPlayer.seat}
          {currentPlayer.isHost && " (Host)"}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
          Pick {currentSlot.overallPick} · Round {currentSlot.round} · #{currentSlot.pickInRound}
        </p>
      </div>

      {isMyTurn && (
        <p style={{ color: 'var(--gold)', fontSize: '12px', textAlign: 'center', margin: '4px 0 0' }}>
          Your turn — select an item from the pool
        </p>
      )}

      {!isMyTurn && (
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', margin: '4px 0 0' }}>
          Waiting for {currentPlayer.displayName} to pick...
        </p>
      )}

      {/* Recent picks */}
      {picks.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--border-hi)',
            marginTop: '12px',
            paddingTop: '12px',
          }}
        >
          <h3
            style={{
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              margin: '0 0 8px 0',
            }}
          >
            Recent Picks
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {recentPicks.map((pick) => {
                const picker = players.find((p) => p.id === pick.playerId);
                const item = itemMap.get(pick.itemId);
                return (
                  <li key={pick.id} style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    <span style={{ color: 'var(--text)' }}>{picker?.displayName ?? "?"}</span>
                    {" "}picked{" "}
                    <span style={{ color: 'var(--text)' }}>{item?.name ?? "?"}</span>
                    {" "}· #{pick.overallPick}
                    {pick.isAutoPick && (
                      <span style={{ color: 'var(--cyan)', marginLeft: '4px' }}>(auto)</span>
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
