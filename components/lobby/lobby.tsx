"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  // Phase is chosen by the server page; refresh when it advances (host action or realtime).
  useEffect(() => {
    if (room.phase !== "LOBBY") {
      router.refresh();
    }
  }, [room.phase, router]);

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
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "drafts",
              filter: `id=eq.${draftId}`,
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
      const isOffTheDome = room.pickingMode === "off_the_dome";
      const res = await fetch(`/api/drafts/${room.draftId}/pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isOffTheDome ? "commence-draft" : "start-review" }),
      });
      if (res.ok) {
        const updated: RoomProjection = await res.json();
        setRoom(updated);
        router.refresh();
      } else {
        const err = await res.json();
        console.error("Failed to start draft:", err.message);
      }
    } catch {
      console.error("Failed to start draft");
    }
  }

  const statusDotColor: Record<ConnectionStatus, string> = {
    connecting: '#f0c860',
    connected: '#00ff87',
    disconnected: '#ff4444',
  };

  const statusLabel: Record<ConnectionStatus, string> = {
    connecting: "Connecting…",
    connected: "Connected",
    disconnected: "Disconnected",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'var(--text-dim)',
    marginBottom: '12px',
    display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '16px' }}>
      <div style={{ maxWidth: '672px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              Lobby
            </p>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 700, margin: '4px 0 0', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '360px' }}>
              {room.topic}
            </h1>
          </div>

          {/* Connection status */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0, marginTop: '4px' }}
            aria-label={`Connection status: ${statusLabel[connectionStatus]}`}
          >
            <span
              style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusDotColor[connectionStatus], display: 'inline-block', boxShadow: `0 0 6px ${statusDotColor[connectionStatus]}` }}
            />
            {statusLabel[connectionStatus]}
            {connectionStatus === "connected" && onlineCount > 0 && (
              <span style={{ color: 'var(--text-dim)', opacity: 0.6 }}>({onlineCount} online)</span>
            )}
          </div>
        </header>

        {/* Room code */}
        <section aria-labelledby="room-code-label" className="panel-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <span id="room-code-label" style={sectionLabelStyle}>
              Room code
            </span>
            <p style={{ fontFamily: 'monospace', fontSize: '28px', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '0.2em', textShadow: '0 0 16px rgba(0,229,255,0.5), 0 0 48px rgba(0,229,255,0.18)', margin: 0 }}>
              {room.roomCode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label="Copy room code"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-hi)',
              color: 'var(--text-dim)',
              fontFamily: 'Outfit, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: '8px 14px',
              transition: 'border-color 0.2s, color 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.3)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hi)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
            }}
          >
            Copy
          </button>
        </section>

        {/* Configuration summary */}
        <section aria-labelledby="config-label" className="panel-card" style={{ padding: '16px' }}>
          <span id="config-label" style={sectionLabelStyle}>
            Configuration
          </span>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', margin: 0 }}>
            <div>
              <dt style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>Draft type</dt>
              <dd style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontWeight: 500, textTransform: 'capitalize' }}>{room.draftType}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>Mode</dt>
              <dd style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontWeight: 500 }}>
                {room.pickingMode === "off_the_dome" ? "Off the Dome" : "From a Pool"}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>Judging</dt>
              <dd style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontWeight: 500, textTransform: 'capitalize' }}>{room.judgingMode}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>Rounds</dt>
              <dd style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontWeight: 500 }}>{room.rounds}</dd>
            </div>
            <div>
              <dt style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>Turn timer</dt>
              <dd style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontWeight: 500 }}>
                {room.timerSeconds ? `${room.timerSeconds}s` : "Off"}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>AI judge</dt>
              <dd style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontWeight: 500, textTransform: 'capitalize' }}>
                {room.aiPersonality === "custom" ? "Custom" : room.aiPersonality}
              </dd>
              {room.aiPersonality === "custom" && room.customJudgePrompt && (
                <dd style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {room.customJudgePrompt}
                </dd>
              )}
            </div>
            <div>
              <dt style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' }}>Capacity</dt>
              <dd style={{ fontSize: '13px', color: 'var(--text)', margin: 0, fontWeight: 500 }}>
                {playerCount}/{room.maxPlayers} players
              </dd>
            </div>
          </dl>
        </section>

        {/* Player seats */}
        <section aria-labelledby="players-label" className="panel-card" style={{ padding: '16px' }}>
          <span id="players-label" style={sectionLabelStyle}>
            Players
          </span>
          <SeatList players={room.players} maxPlayers={room.maxPlayers} />
        </section>

        {/* Host controls */}
        {isHost && (
          <section aria-label="Host controls">
            {!canStart && (
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px', textAlign: 'center' }}>
                Waiting for at least 2 players to join before you can start.
              </p>
            )}
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              aria-disabled={!canStart}
              className="btn-gold"
            >
              {canStart
                ? "— Commence Draft —"
                : `Need ${Math.max(0, 2 - playerCount)} more player${Math.max(0, 2 - playerCount) !== 1 ? "s" : ""}`}
            </button>
          </section>
        )}

        {!isHost && (
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
            Waiting for the host to start the draft…
          </p>
        )}

      </div>
    </div>
  );
}
