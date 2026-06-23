"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomChat } from "@/features/chat/use-room-chat";

interface RoomChatProps {
  draftId: string;
  roomCode: string;
  myPlayerId: string;
}

const PLAYER_COLORS = [
  "#00e5ff",
  "#c9a84c",
  "#ff6b6b",
  "#7c3aff",
  "#00ff87",
  "#f06000",
];

function playerColor(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  }
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length];
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function RoomChat({ draftId, roomCode, myPlayerId }: RoomChatProps) {
  const { messages, loading, sending, error, sendMessage } = useRoomChat({
    draftId,
    roomCode,
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const lastSeenCountRef = useRef(0);

  useEffect(() => {
    if (open) {
      setUnread(0);
      lastSeenCountRef.current = messages.length;
    } else if (messages.length > lastSeenCountRef.current) {
      setUnread(messages.length - lastSeenCountRef.current);
    }
  }, [messages.length, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const handleSend = useCallback(async () => {
    const text = draft;
    if (!text.trim()) return;
    const sent = await sendMessage(text);
    if (sent) {
      setDraft("");
    }
  }, [draft, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "max(16px, env(safe-area-inset-bottom))",
        right: "max(16px, env(safe-area-inset-right))",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "8px",
      }}
    >
      {open && (
        <section
          aria-label="Room chat"
          className="panel-card"
          style={{
            width: "min(340px, calc(100vw - 32px))",
            height: "min(420px, calc(100dvh - 120px))",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--border-hi)",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
              }}
            >
              Room Chat
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{
                background: "none",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
                padding: "2px 4px",
              }}
            >
              ×
            </button>
          </header>

          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {loading && messages.length === 0 && (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  textAlign: "center",
                  margin: "auto 0",
                }}
              >
                Loading chat…
              </p>
            )}

            {!loading && messages.length === 0 && (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--text-dim)",
                  textAlign: "center",
                  margin: "auto 0",
                  lineHeight: 1.5,
                }}
              >
                No messages yet. Say something to the room.
              </p>
            )}

            {messages.map((message) => {
              const isMe = message.playerId === myPlayerId;
              const color = playerColor(message.playerId);
              return (
                <div key={message.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "6px",
                      marginBottom: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: isMe ? "var(--gold)" : color,
                      }}
                    >
                      {isMe ? "You" : message.playerName}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        color: "var(--text-dim)",
                        opacity: 0.6,
                      }}
                    >
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text)",
                      lineHeight: 1.5,
                      margin: 0,
                      wordBreak: "break-word",
                    }}
                  >
                    {message.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border-hi)",
              padding: "10px 12px",
              flexShrink: 0,
            }}
          >
            {error && (
              <p
                style={{
                  fontSize: "11px",
                  color: "#ff6b6b",
                  margin: "0 0 6px",
                }}
              >
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Trash talk…"
                maxLength={500}
                disabled={sending}
                aria-label="Chat message"
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--border-hi)",
                  color: "var(--text)",
                  fontFamily: "Outfit, sans-serif",
                  fontSize: "13px",
                  padding: "8px 10px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                style={{
                  background: draft.trim()
                    ? "rgba(201,168,76,0.15)"
                    : "rgba(0,0,0,0.2)",
                  border: "1px solid",
                  borderColor: draft.trim()
                    ? "rgba(201,168,76,0.4)"
                    : "var(--border-hi)",
                  color: draft.trim() ? "var(--gold-hi)" : "var(--text-dim)",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "8px 12px",
                  cursor: draft.trim() && !sending ? "pointer" : "not-allowed",
                  flexShrink: 0,
                }}
              >
                Send
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        style={{
          position: "relative",
          minWidth: "52px",
          height: "52px",
          borderRadius: "26px",
          padding: "0 16px",
          background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(124,58,255,0.15))",
          border: "1px solid rgba(201,168,76,0.35)",
          color: "var(--gold-hi)",
          cursor: "pointer",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        }}
      >
        {open ? "×" : "Chat"}
        {!open && unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              minWidth: "18px",
              height: "18px",
              borderRadius: "9px",
              background: "#ff4444",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}
