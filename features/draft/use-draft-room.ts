"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDraftStore } from "./store";
import type { DraftRoomProjection } from "./types";

interface UseDraftRoomOptions {
  draftId: string;
  roomCode: string;
  /** The current player's draft_players.id */
  myPlayerId: string;
  /** SSR projection — seeds the store and resets when the draft changes. */
  initialProjection: DraftRoomProjection;
}

const POLL_MS = 5_000;

/**
 * Subscribes to Supabase Realtime for draft table changes, debounces a
 * canonical projection refetch, and replaces Zustand state.
 *
 * On channel reconnect, fetches first and then resumes event handling.
 * Never replays missed mutations locally.
 */
export function useDraftRoom({
  draftId,
  roomCode,
  myPlayerId,
  initialProjection,
}: UseDraftRoomOptions) {
  const setProjection = useDraftStore((s) => s.setProjection);
  const setConnectionStatus = useDraftStore((s) => s.setConnectionStatus);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<
    import("@supabase/supabase-js").SupabaseClient["channel"]
  > | null>(null);

  const fetchProjection = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/projection`);
      if (res.ok) {
        const data = await res.json();
        return data as DraftRoomProjection;
      }
    } catch {
      // non-fatal
    }
    return null;
  }, [draftId]);

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

  const refetchCommentary = useCallback(() => {
    void refetchNow();
  }, [refetchNow]);

  useEffect(() => {
    setProjection(initialProjection);
    // Seed store when entering this draft; SSR initial is authoritative on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, setProjection]);

  useEffect(() => {
    let channel: ReturnType<
      import("@supabase/supabase-js").SupabaseClient["channel"]
    > | null = null;

    async function setup() {
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();

        channel = supabase.channel(`draft:${roomCode}`);

        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "drafts",
              filter: `id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "picks",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "draft_items",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "commentary",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetchCommentary();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "arguments",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "votes",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "pick_veto_votes",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "judgments",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              setConnectionStatus("connected");
              await refetchNow();
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

    const pollInterval = setInterval(() => {
      void refetchNow();
    }, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refetchNow();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [
    draftId,
    roomCode,
    myPlayerId,
    setConnectionStatus,
    refetch,
    refetchCommentary,
    refetchNow,
  ]);

  return { refetch: refetchNow };
}
