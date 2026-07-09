"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATS } from "./data";
import type { SsRoomProjection } from "@/features/slippery-slope/schema";
import { useLeaveSsLobbyOnExit } from "@/features/slippery-slope/use-leave-lobby";
import { PCOLORS } from "./data";

interface SlipperySlopeLobbyProps {
  initial: SsRoomProjection;
  myPlayerId: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function SlipperySlopeLobby({ initial, myPlayerId }: SlipperySlopeLobbyProps) {
  const router = useRouter();
  const [room, setRoom] = useState(initial);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHost = room.hostPlayerId === myPlayerId;
  const playerCount = room.players.length;
  const canStart = isHost && playerCount >= 2;
  const categoryLabel =
    CATS.find((c) => c.id === room.category)?.name ?? room.category;

  useLeaveSsLobbyOnExit(room.roomId, room.phase);

  useEffect(() => {
    if (room.phase !== "LOBBY") {
      router.refresh();
    }
  }, [room.phase, router]);

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/slippery-slope/${room.roomId}/state`);
      if (res.ok) {
        setRoom(await res.json());
      }
    } catch {
      // non-fatal
    }
  }, [room.roomId]);

  useEffect(() => {
    let channel: ReturnType<
      import("@supabase/supabase-js").SupabaseClient["channel"]
    > | null = null;

    const roomId = room.roomId;

    async function setup() {
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();
        const me = room.players.find((p) => p.id === myPlayerId);

        channel = supabase.channel(`slippery-lobby:${roomId}`, {
          config: { presence: { key: myPlayerId } },
        });

        channel
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "ss_players", filter: `room_id=eq.${roomId}` },
            () => void fetchRoom(),
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "ss_rooms", filter: `id=eq.${roomId}` },
            () => void fetchRoom(),
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              setConnectionStatus("connected");
              await channel!.track({
                playerId: myPlayerId,
                displayName: me?.displayName ?? "Guest",
              });
            } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
              setConnectionStatus("disconnected");
            }
          });
      } catch {
        setConnectionStatus("disconnected");
      }
    }

    void setup();
    const poll = setInterval(() => void fetchRoom(), 30_000);
    return () => {
      clearInterval(poll);
      if (channel) void channel.unsubscribe();
    };
  }, [room.roomId, myPlayerId, fetchRoom, room.players]);

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(room.roomCode);
    } catch {
      // ignore
    }
  }

  async function handleStart() {
    if (!canStart || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/slippery-slope/${room.roomId}/start`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.message ?? "Failed to start game");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStarting(false);
    }
  }

  const statusColor =
    connectionStatus === "connected"
      ? "var(--ss-lime)"
      : connectionStatus === "connecting"
        ? "var(--ss-orange)"
        : "var(--ss-red)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ss-bg)",
        color: "var(--ss-text)",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <nav className="ss-nav">
        <div className="ss-logo" style={{ color: "var(--ss-text)" }}>
          <span style={{ color: "var(--ss-lime)" }}>slippery</span>slope
        </div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--ss-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusColor,
              display: "inline-block",
            }}
          />
          {connectionStatus}
        </div>
      </nav>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div className="ss-lobby-wrap">
          <div className="ss-card">
            <p className="ss-eyebrow">Room Code</p>
            <div className="ss-code-block">{room.roomCode}</div>
            <button
              type="button"
              className="ss-btn ss-btn-ghost ss-btn-sm"
              style={{ marginBottom: "0.5rem" }}
              onClick={handleCopyCode}
            >
              Copy code
            </button>
            <p className="ss-code-hint">Share this with your friends</p>
            <div className="ss-divider" />
            <p style={{ color: "var(--ss-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              Category: <strong style={{ color: "var(--ss-text)" }}>{categoryLabel}</strong>
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.65rem",
              }}
            >
              <span
                style={{
                  fontFamily: "'Syne Mono', monospace",
                  fontSize: "0.68rem",
                  color: "var(--ss-muted)",
                  textTransform: "uppercase",
                }}
              >
                Players
              </span>
              <span style={{ fontFamily: "'Syne Mono', monospace", fontSize: "0.68rem", color: "var(--ss-muted)" }}>
                {playerCount} / {room.maxPlayers}
              </span>
            </div>
            <div className="ss-plist">
              {room.players.map((p) => (
                <div key={p.id} className="ss-prow">
                  <div
                    className="ss-pdot"
                    style={{ background: PCOLORS[p.colorIndex] ?? PCOLORS[0] }}
                  />
                  <span className="ss-pname">{p.displayName}</span>
                  <span className={p.isHost ? "ss-ptag ss-ptag-host" : "ss-ptag"}>
                    {p.isHost ? "HOST" : ""}
                  </span>
                </div>
              ))}
            </div>
            <div className="ss-divider" />
            {error && (
              <p style={{ color: "var(--ss-red)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                {error}
              </p>
            )}
            {isHost ? (
              <button
                className="ss-btn ss-btn-lime"
                style={{ width: "100%", marginBottom: "0.65rem" }}
                disabled={!canStart || starting}
                onClick={handleStart}
              >
                {starting ? "Starting…" : "Start Game →"}
              </button>
            ) : (
              <p style={{ color: "var(--ss-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                Waiting for host to start…
              </p>
            )}
            <a href="/slippery-slope" className="ss-btn ss-btn-ghost ss-btn-sm" style={{ width: "100%", display: "block", textDecoration: "none" }}>
              ← Leave
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
