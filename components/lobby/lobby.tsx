"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomProjection } from "@/features/room/schema";
import { SeatList } from "./player-seat";

interface PresenceState {
  [key: string]: Array<{ playerId: string; displayName: string }>;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface LobbyProps {
  initial: RoomProjection;
  /** The player ID (draft_players.id) for the current user, returned by create/join. */
  myPlayerId: string;
}

export function Lobby({ initial, myPlayerId }: LobbyProps) {
  const [room, setRoom] = useState<RoomProjection>(initial);
  const [onlineCount, setOnlineCount] = useState(0);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const channelRef = useRef<ReturnType<
    import("@supabase/supabase-js").SupabaseClient["channel"]
  > | null>(null);

  const isHost = room.hostPlayerId === myPlayerId;
  const playerCount = room.players.length;
  const canStart = isHost && playerCount >= 2;

  // Poll for room updates. Realtime postgres_changes fires immediately for
  // player join/leave; this 30s interval is a fallback in case the socket drops.
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${room.draftId}/state`);
      if (res.ok) {
        const updated: RoomProjection = await res.json();
        setRoom(updated);
      }
    } catch {
      // Polling failure is non-fatal
    }
  }, [room.draftId]);

  useEffect(() => {
    // Subscribe to Supabase Realtime for both presence and authoritative DB changes.
    let channel: ReturnType<
      import("@supabase/supabase-js").SupabaseClient["channel"]
    > | null = null;

    const draftId = room.draftId;

    async function setupChannel() {
      try {
        const { createClient } = await import(
          "@/lib/supabase/browser"
        );
        const supabase = createClient();

        const myPlayer = room.players.find((p) => p.id === myPlayerId);

        channel = supabase.channel(`draft:${draftId}`, {
          config: { presence: { key: myPlayerId } },
        });

        channel
          .on("presence", { event: "sync" }, () => {
            const state = channel!.presenceState<{
              playerId: string;
              displayName: string;
            }>();
            let count = 0;
            for (const presences of Object.values(state as PresenceState)) {
              count += presences.length;
            }
            setOnlineCount(count);
          })
          // postgres_changes: refetch immediately when draft_players changes
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "draft_players",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              void fetchRoom();
            },
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              setConnectionStatus("connected");
              await channel!.track({
                playerId: myPlayer?.id ?? myPlayerId,
                displayName: myPlayer?.displayName ?? "Guest",
              });
            } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
              setConnectionStatus("disconnected");
            }
          });

        channelRef.current = channel;
      } catch {
        setConnectionStatus("disconnected");
      }
    }

    void setupChannel();

    // 30-second fallback poll — Realtime postgres_changes handles immediate updates
    const pollInterval = setInterval(() => void fetchRoom(), 30000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
    // Only re-run when draftId or myPlayerId changes (not on every room state update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.draftId, myPlayerId, fetchRoom]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(room.roomCode);
    } catch {
      // Clipboard may not be available in all contexts
    }
  }

  async function handleStart() {
    if (!canStart) return;
    try {
      const res = await fetch(`/api/drafts/${room.draftId}/pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start-review" }),
      });
      if (res.ok) {
        const updated: RoomProjection = await res.json();
        setRoom(updated);
      } else {
        const err = await res.json();
        console.error("Failed to start pool review:", err.message);
      }
    } catch {
      console.error("Failed to start pool review");
    }
  }

  const statusDot: Record<ConnectionStatus, string> = {
    connecting: "bg-yellow-400",
    connected: "bg-green-400",
    disconnected: "bg-red-400",
  };

  const statusLabel: Record<ConnectionStatus, string> = {
    connecting: "Connecting…",
    connected: "Connected",
    disconnected: "Disconnected",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Lobby
            </p>
            <h1 className="text-2xl font-bold mt-0.5 truncate">{room.topic}</h1>
          </div>

          {/* Connection status */}
          <div
            className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0 mt-1"
            aria-label={`Connection status: ${statusLabel[connectionStatus]}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${statusDot[connectionStatus]}`}
            />
            {statusLabel[connectionStatus]}
          {connectionStatus === "connected" && onlineCount > 0 && (
            <span className="ml-1 text-gray-400">({onlineCount} online)</span>
          )}
          </div>
        </header>

        {/* Room code */}
        <section
          aria-labelledby="room-code-label"
          className="bg-white rounded-xl border p-4 flex items-center justify-between gap-4"
        >
          <div>
            <p
              id="room-code-label"
              className="text-xs uppercase tracking-wider text-gray-500 font-semibold"
            >
              Room code
            </p>
            <p className="text-3xl font-mono font-bold tracking-widest mt-1">
              {room.roomCode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy room code"
            className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Copy
          </button>
        </section>

        {/* Configuration summary */}
        <section
          aria-labelledby="config-label"
          className="bg-white rounded-xl border p-4"
        >
          <p
            id="config-label"
            className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3"
          >
            Configuration
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Draft type</dt>
              <dd className="font-medium capitalize">{room.draftType}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Judging</dt>
              <dd className="font-medium capitalize">{room.judgingMode}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Rounds</dt>
              <dd className="font-medium">{room.rounds}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Turn timer</dt>
              <dd className="font-medium">
                {room.timerSeconds ? `${room.timerSeconds}s` : "Off"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">AI personality</dt>
              <dd className="font-medium capitalize">{room.aiPersonality}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Capacity</dt>
              <dd className="font-medium">
                {playerCount}/{room.maxPlayers} players
              </dd>
            </div>
          </dl>
        </section>

        {/* Player seats */}
        <section aria-labelledby="players-label" className="bg-white rounded-xl border p-4">
          <p
            id="players-label"
            className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3"
          >
            Players
          </p>
          <SeatList players={room.players} maxPlayers={room.maxPlayers} />
        </section>

        {/* Host controls */}
        {isHost && (
          <section aria-label="Host controls">
            {!canStart && (
              <p className="text-sm text-gray-500 mb-2 text-center">
                Waiting for at least 2 players to join before you can start.
              </p>
            )}
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              aria-disabled={!canStart}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-3 font-semibold text-base hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {canStart ? "Start draft" : `Need ${2 - playerCount > 0 ? 2 - playerCount : 0} more player${2 - playerCount !== 1 ? "s" : ""}`}
            </button>
          </section>
        )}

        {!isHost && (
          <p className="text-center text-sm text-gray-500">
            Waiting for the host to start the draft…
          </p>
        )}
      </div>
    </div>
  );
}
