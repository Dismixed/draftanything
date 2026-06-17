"use client";

import { useMemo, useRef, useEffect } from "react";
import type { SafePick, SafePlayer, PickSlot } from "@/features/draft/types";

interface PickHistoryProps {
  picks: SafePick[];
  players: SafePlayer[];
  currentPickIndex: number;
  pickOrder: PickSlot[];
}

export function PickHistory({
  picks,
  players,
  currentPickIndex,
  pickOrder,
}: PickHistoryProps) {
  const listRef = useRef<HTMLUListElement>(null);

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => b.overallPick - a.overallPick),
    [picks],
  );

  const nextSlot = pickOrder[currentPickIndex];

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [picks.length]);

  return (
    <section
      aria-label="Pick history"
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
          marginBottom: '12px',
          margin: '0 0 12px 0',
        }}
      >
        Pick History
      </h2>

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
          return (
            <li
              key={pick.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 8px',
                background: 'var(--panel)',
                border: '1px solid var(--border-hi)',
                fontSize: '13px',
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--text-dim)', fontSize: '11px', fontVariantNumeric: 'tabular-nums', minWidth: '24px' }}>
                {pick.overallPick}.
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player?.displayName ?? "?"}
                {" — "}
                {pick.forfeited ? (
                  <span style={{ color: 'var(--text-dim)' }}>Forfeited</span>
                ) : (
                  pick.itemName ?? "?"
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
