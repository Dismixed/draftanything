"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SafeRoomMessage } from "./types";

interface UseRoomChatOptions {
  draftId: string;
  roomCode: string;
}

export function useRoomChat({ draftId, roomCode }: UseRoomChatOptions) {
  const [messages, setMessages] = useState<SafeRoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/messages`);
      if (res.ok) {
        const data = (await res.json()) as SafeRoomMessage[];
        setMessages(data);
        setError(null);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  const refetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchMessages();
    }, 150);
  }, [fetchMessages]);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    let channel: ReturnType<
      import("@supabase/supabase-js").SupabaseClient["channel"]
    > | null = null;

    async function setup() {
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();

        channel = supabase.channel(`chat:${roomCode}`);

        channel
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "room_messages",
              filter: `draft_id=eq.${draftId}`,
            },
            () => {
              refetch();
            },
          )
          .subscribe();
      } catch {
        // non-fatal — polling via manual refetch on send still works
      }
    }

    void setup();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [draftId, roomCode, refetch]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return false;

      setSending(true);
      setError(null);
      try {
        const res = await fetch(`/api/drafts/${draftId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });

        if (!res.ok) {
          const err = await res.json();
          setError(err.message ?? "Failed to send message");
          return false;
        }

        const message = (await res.json()) as SafeRoomMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        return true;
      } catch {
        setError("Failed to send message");
        return false;
      } finally {
        setSending(false);
      }
    },
    [draftId, sending],
  );

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
  };
}
