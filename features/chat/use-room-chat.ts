"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SafeRoomMessage } from "./types";

const CHAT_BROADCAST_EVENT = "room_message";
const POLL_INTERVAL_MS = 5000;

interface UseRoomChatOptions {
  draftId: string;
  roomCode: string;
}

function mergeMessage(
  prev: SafeRoomMessage[],
  message: SafeRoomMessage,
): SafeRoomMessage[] {
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function useRoomChat({ draftId, roomCode }: UseRoomChatOptions) {
  const [messages, setMessages] = useState<SafeRoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/messages`);
      if (res.ok) {
        const data = (await res.json()) as SafeRoomMessage[];
        setMessages(data);
        setError(null);
      } else if (res.status !== 429) {
        const err = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setError(err.message ?? "Could not load chat");
      }
    } catch {
      setError("Could not load chat");
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

  const addMessage = useCallback((message: SafeRoomMessage) => {
    setMessages((prev) => mergeMessage(prev, message));
  }, []);

  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();

        const channel = supabase.channel(`chat:${roomCode}`, {
          config: { broadcast: { ack: false, self: false } },
        });

        channel
          .on("broadcast", { event: CHAT_BROADCAST_EVENT }, ({ payload }) => {
            if (cancelled) return;
            const message = payload as SafeRoomMessage;
            if (message?.id) {
              addMessage(message);
            }
          })
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
          .subscribe((status) => {
            if (cancelled) return;
            if (status === "SUBSCRIBED") {
              void fetchMessages();
            }
          });

        channelRef.current = channel;
      } catch {
        // non-fatal — polling fallback still works
      }
    }

    void setup();

    const pollInterval = setInterval(() => {
      void fetchMessages();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [draftId, roomCode, refetch, fetchMessages, addMessage]);

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
        addMessage(message);

        channelRef.current?.send({
          type: "broadcast",
          event: CHAT_BROADCAST_EVENT,
          payload: message,
        });

        return true;
      } catch {
        setError("Failed to send message");
        return false;
      } finally {
        setSending(false);
      }
    },
    [draftId, sending, addMessage],
  );

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    refreshMessages: fetchMessages,
  };
}
