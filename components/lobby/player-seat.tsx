import type { RoomPlayer } from "@/features/room/schema";
import { AiTag } from "@/components/draft/ai-tag";

interface PlayerSeatProps {
  seat: number;
  player: RoomPlayer | null;
  /** Host only: show the controls that add and remove AI drafters. */
  canManageBots?: boolean;
  onAddBot?: () => void;
  onRemoveBot?: (playerId: string) => void;
  busy?: boolean;
}

const seatButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border-hi)',
  color: 'var(--text)',
  fontFamily: 'var(--font-outfit), sans-serif',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  cursor: 'pointer',
  padding: '6px 12px',
  flexShrink: 0,
};

export function PlayerSeat({
  seat,
  player,
  canManageBots = false,
  onAddBot,
  onRemoveBot,
  busy = false,
}: PlayerSeatProps) {
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
    // Dimmed while it is only a placeholder; full strength when it holds a button.
    opacity: canManageBots ? 1 : 0.5,
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
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'normal', fontFamily: 'var(--font-outfit), sans-serif', flex: 1 }}>
            Waiting for player…
          </span>
          {canManageBots && (
            <button
              type="button"
              onClick={onAddBot}
              disabled={busy}
              style={{ ...seatButtonStyle, opacity: busy ? 0.6 : 1 }}
            >
              + Add AI drafter
            </button>
          )}
        </>
      ) : (
        <>
          {/* Monogram circle */}
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-playfair-display), serif', fontSize: '14px', color: 'var(--gold)' }}>
            {player.displayName.charAt(0).toUpperCase()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            {/* Display name */}
            <span style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic', fontSize: '14px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.displayName}
            </span>
            {player.isBot && <AiTag />}

            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>
              {player.isHost && (
                <span
                  aria-label="Host"
                  style={{ border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '2px 7px', fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                  Host
                </span>
              )}
              {player.isBot && canManageBots && (
                <button
                  type="button"
                  onClick={() => onRemoveBot?.(player.id)}
                  disabled={busy}
                  aria-label={`Remove ${player.displayName}`}
                  style={{ ...seatButtonStyle, padding: '3px 9px', opacity: busy ? 0.6 : 1 }}
                >
                  Remove
                </button>
              )}
              {player.isReady && !player.isBot && (
                <span
                  aria-label="Ready"
                  style={{ border: '1px solid rgba(0,229,255,0.3)', color: 'var(--cyan)', fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '2px 7px', fontFamily: 'var(--font-outfit), sans-serif' }}
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
  canManageBots?: boolean;
  onAddBot?: () => void;
  onRemoveBot?: (playerId: string) => void;
  busy?: boolean;
}

export function SeatList({
  players,
  maxPlayers,
  canManageBots,
  onAddBot,
  onRemoveBot,
  busy,
}: SeatListProps) {
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
          canManageBots={canManageBots}
          onAddBot={onAddBot}
          onRemoveBot={onRemoveBot}
          busy={busy}
        />
      ))}
    </div>
  );
}
