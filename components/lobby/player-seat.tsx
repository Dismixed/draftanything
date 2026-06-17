import type { RoomPlayer } from "@/features/room/schema";

interface PlayerSeatProps {
  seat: number;
  player: RoomPlayer | null;
}

export function PlayerSeat({ seat, player }: PlayerSeatProps) {
  const isEmpty = player === null;

  const filledStyle: React.CSSProperties = {
    background: player?.isHost ? 'rgba(201,168,76,0.03)' : 'var(--panel)',
    border: `1px solid ${player?.isHost ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.2)'}`,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const emptyStyle: React.CSSProperties = {
    background: 'var(--panel)',
    border: '1px dashed var(--border-hi)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    opacity: 0.5,
  };

  return (
    <div
      aria-label={isEmpty ? `Seat ${seat} — empty` : `Seat ${seat} — ${player.displayName}`}
      style={isEmpty ? emptyStyle : filledStyle}
    >
      {isEmpty ? (
        <>
          {/* Empty monogram circle */}
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px dashed var(--border-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{seat}</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'normal', fontFamily: 'Outfit, sans-serif' }}>
            Waiting for player…
          </span>
        </>
      ) : (
        <>
          {/* Monogram circle */}
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: '"Playfair Display", serif', fontSize: '14px', color: 'var(--gold)' }}>
            {player.displayName.charAt(0).toUpperCase()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            {/* Display name */}
            <span style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.displayName}
            </span>

            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>
              {player.isHost && (
                <span
                  aria-label="Host"
                  style={{ border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '2px 7px', fontFamily: 'Outfit, sans-serif' }}
                >
                  Host
                </span>
              )}
              {player.isReady && (
                <span
                  aria-label="Ready"
                  style={{ border: '1px solid rgba(0,229,255,0.3)', color: 'var(--cyan)', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '2px 7px', fontFamily: 'Outfit, sans-serif' }}
                >
                  Ready
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface SeatListProps {
  players: RoomPlayer[];
  maxPlayers: number;
}

export function SeatList({ players, maxPlayers }: SeatListProps) {
  // Build a seat map (1-indexed)
  const seatMap = new Map<number, RoomPlayer>(
    players.map((p) => [p.seat, p]),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-label="Player seats">
      {Array.from({ length: maxPlayers }, (_, i) => i + 1).map((seat) => (
        <PlayerSeat
          key={seat}
          seat={seat}
          player={seatMap.get(seat) ?? null}
        />
      ))}
    </div>
  );
}
