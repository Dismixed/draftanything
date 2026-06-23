"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDraftStore } from "./store";
import type { DraftRoomProjection } from "./types";

interface UseDraftRoomOptions {
  draftId: string;
  roomCode: string;
  /** The current player's draft_players.id */
  myPlayerId: string;
}

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

  const refetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const projection = await fetchProjection();
      if (projection) {
        setProjection(projection);
      }
    }, 200);
  }, [fetchProjection, setProjection]);

  const refetchCommentary = useCallback(() => {
    void (async () => {
      const projection = await fetchProjection();
      if (projection) {
        setProjection(projection);
      }
    })();
  }, [fetchProjection, setProjection]);

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
              // Fetch on initial subscription
              const projection = await fetchProjection();
              if (projection) {
                setProjection(projection);
              }
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

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [draftId, roomCode, myPlayerId, setProjection, setConnectionStatus, refetch, refetchCommentary, fetchProjection]);
}
