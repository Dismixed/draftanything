"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSlipperySlopeStore } from "./store";
import type { SsRoomProjection } from "./schema";

interface UseSlipperyRoomOptions {
  roomId: string;
  roomCode: string;
  myPlayerId: string;
  initialProjection: SsRoomProjection;
}

const POLL_MS = 5_000;

export function useSlipperyRoom({
  roomId,
  roomCode,
  myPlayerId,
  initialProjection,
}: UseSlipperyRoomOptions) {
  const setProjection = useSlipperySlopeStore((s) => s.setProjection);
  const setConnectionStatus = useSlipperySlopeStore((s) => s.setConnectionStatus);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<
    import("@supabase/supabase-js").SupabaseClient["channel"]
  > | null>(null);

  const fetchProjection = useCallback(async () => {
    try {
      const res = await fetch(`/api/slippery-slope/${roomId}/projection`);
      if (res.ok) {
        return (await res.json()) as SsRoomProjection;
      }
    } catch {
      // non-fatal
    }
    return null;
  }, [roomId]);

  const refetchNow = useCallback(async () => {
    const projection = await fetchProjection();
    if (projection) {
      setProjection(projection);
    }
    return projection;
  }, [fetchProjection, setProjection]);

  const refetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void refetchNow();
    }, 200);
  }, [refetchNow]);

  useEffect(() => {
    setProjection(initialProjection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    roomId,
    initialProjection.phase,
    initialProjection.turnSeq,
    initialProjection.turnPhase,
    initialProjection.players.map((p) => p.position).join(","),
    setProjection,
  ]);

  useEffect(() => {
    let channel: ReturnType<
      import("@supabase/supabase-js").SupabaseClient["channel"]
    > | null = null;

    async function setup() {
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();

        channel = supabase.channel(`slippery:${roomCode}`, {
          config: { presence: { key: myPlayerId } },
        });

        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ss_rooms",
              filter: `id=eq.${roomId}`,
            },
            () => refetch(),
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ss_players",
              filter: `room_id=eq.${roomId}`,
            },
            () => refetch(),
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              setConnectionStatus("connected");
              const me = initialProjection.players.find((p) => p.id === myPlayerId);
              await channel!.track({
                playerId: myPlayerId,
                displayName: me?.displayName ?? "Guest",
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

    void setup();

    const poll = setInterval(() => void refetchNow(), POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void refetchNow();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [
    roomId,
    roomCode,
    myPlayerId,
    refetch,
    refetchNow,
    setConnectionStatus,
    initialProjection.players,
  ]);

  return { refetchNow };
}
