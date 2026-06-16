import type { RoomPlayer } from "@/features/room/schema";

interface PlayerSeatProps {
  seat: number;
  player: RoomPlayer | null;
}

export function PlayerSeat({ seat, player }: PlayerSeatProps) {
  const isEmpty = player === null;

  return (
    <div
      aria-label={isEmpty ? `Seat ${seat} — empty` : `Seat ${seat} — ${player.displayName}`}
      className={[
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        isEmpty
          ? "border-dashed border-gray-300 bg-gray-50 text-gray-400"
          : "border-solid border-gray-200 bg-white",
      ].join(" ")}
    >
      {/* Seat number badge */}
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
        {seat}
      </span>

      {isEmpty ? (
        <span className="text-sm italic">Waiting for player…</span>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Display name */}
          <span className="font-medium text-sm truncate">{player.displayName}</span>

          {/* Badges */}
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            {player.isHost && (
              <span
                aria-label="Host"
                className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-semibold"
              >
                Host
              </span>
            )}
            {player.isReady && (
              <span
                aria-label="Ready"
                className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-semibold"
              >
                Ready
              </span>
            )}
          </div>
        </div>
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
    <div className="flex flex-col gap-2" aria-label="Player seats">
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
