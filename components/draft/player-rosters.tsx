"use client";

import type { SafePlayer, SafePick, SafeItem } from "@/features/draft/types";
import { getPickItemLabel } from "@/features/draft/pick-label";
import { useMemo } from "react";

interface PlayerRostersProps {
  players: SafePlayer[];
  picks: SafePick[];
  items: SafeItem[];
  draftId: string;
  myPlayerId: string;
  currentPlayerId?: string;
  rounds: number;
}

export function RosterColumn({
  player,
  playerPicks,
  itemMap,
  isMe,
  isOnClock,
}: {
  player: SafePlayer;
  playerPicks: SafePick[];
  itemMap: Map<string, SafeItem>;
  isMe: boolean;
  isOnClock: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: isMe ? 'rgba(201,168,76,0.04)' : 'rgba(0,0,0,0.15)',
        border: `1px solid ${isOnClock ? 'rgba(201,168,76,0.45)' : 'var(--border-hi)'}`,
        borderTop: isOnClock ? '2px solid var(--gold)' : '1px solid var(--border-hi)',
        padding: '10px',
      }}
    >
      <div style={{ marginBottom: '8px' }}>
        <p
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: '16px',
            color: isOnClock ? 'var(--gold-hi)' : 'var(--text)',
            margin: '0 0 4px 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {player.displayName}
          {isMe && (
            <span style={{ fontSize: '10px', fontStyle: 'normal', color: 'var(--gold)', marginLeft: '6px' }}>
              (you)
            </span>
          )}
        </p>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span
            style={{
              border: '1px solid var(--border-hi)',
              color: 'var(--text-dim)',
              fontSize: '8px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: '2px 5px',
            }}
          >
            Seat {player.seat}
          </span>
          {isOnClock && (
            <span
              style={{
                border: '1px solid rgba(201,168,76,0.4)',
                color: 'var(--gold)',
                fontSize: '8px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                padding: '2px 5px',
              }}
            >
              On clock
            </span>
          )}
        </div>
      </div>

      {playerPicks.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>No picks yet</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {playerPicks.map((pick) => {
            return (
              <li
                key={pick.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: 'var(--panel)',
                  border: '1px solid var(--border-hi)',
                  padding: '6px 8px',
                }}
              >
                <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                  #{pick.overallPick}
                  {pick.isAutoPick && (
                    <span style={{ color: 'var(--cyan)', marginLeft: '4px' }}>auto</span>
                  )}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    color: pick.forfeited ? 'var(--text-dim)' : 'var(--text)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {getPickItemLabel(pick, itemMap)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function PlayerRosters({
  players,
  picks,
  items,
  myPlayerId,
  currentPlayerId,
  rounds,
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

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.seat - b.seat),
    [players],
  );

  const totalPicks = picks.length;
  const maxPicks = players.length * rounds;

  return (
    <section
      aria-label="Player rosters"
      className="panel-card"
      style={{ padding: '16px', minHeight: 'min(60vh, 520px)' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px', gap: '12px' }}>
        <h2
          style={{
            fontFamily: '"Playfair Display", serif',
            fontStyle: 'italic',
            fontSize: '22px',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Rosters
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0 }}>
          {totalPicks}/{maxPicks} picks
        </span>
      </div>

      <div
        className="flex flex-col gap-2.5 md:grid md:gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${sortedPlayers.length}, minmax(0, 1fr))`,
        }}
      >
        {sortedPlayers.map((player) => (
          <RosterColumn
            key={player.id}
            player={player}
            playerPicks={rosters.get(player.id) ?? []}
            itemMap={itemMap}
            isMe={player.id === myPlayerId}
            isOnClock={player.id === currentPlayerId}
          />
        ))}
      </div>

      {players.length === 0 && (
        <p
          style={{
            color: 'var(--text-dim)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          No players
        </p>
      )}
    </section>
  );
}
