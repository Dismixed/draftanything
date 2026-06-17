"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonLoadingLabel } from "@/components/ui/button-spinner";

interface JoinRoomFormProps {
  /**
   * Pre-fill the room code field (e.g. when arriving via an invite link).
   */
  initialRoomCode?: string;
  onSuccess?: (draftId: string, roomCode: string) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  fontWeight: 600,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--text-dim)',
  marginBottom: '5px',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
};

export function JoinRoomForm({ initialRoomCode = "", onSuccess }: JoinRoomFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Ensure guest session exists before joining
      await fetch("/api/guest", { method: "POST" });

      // We don't know the draftId here, so we POST to a discovery endpoint.
      // The API will look up the draft by roomCode.
      const res = await fetch(`/api/drafts/by-code/${roomCode.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      const data = await res.json();

      if (!res.ok) {
        const friendlyErrors: Record<string, string> = {
          ROOM_NOT_FOUND: "Room not found. Check the code and try again.",
          ROOM_FULL: "This room is full.",
          NAME_TAKEN: "That name is already taken in this room. Choose a different one.",
          INVALID_PHASE: "This room has already started.",
          RATE_LIMITED: "Too many attempts. Please wait a moment.",
        };
        setError(
          friendlyErrors[data.error] ?? data.message ?? data.error ?? "Something went wrong",
        );
        return;
      }

      if (onSuccess) {
        onSuccess(data.draftId, data.roomCode);
      } else {
        router.push(`/draft/${data.roomCode}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      aria-label="Join a room"
    >
      <div style={fieldStyle}>
        <label htmlFor="join-room-code" style={labelStyle}>
          Room code
        </label>
        <input
          id="join-room-code"
          type="text"
          required
          minLength={6}
          maxLength={6}
          placeholder="e.g. ABCDE2"
          value={roomCode}
          onChange={(e) => {
            setRoomCode(e.target.value.toUpperCase());
            setError(null);
          }}
          className="da-input"
          style={{ fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: '16px', textTransform: 'uppercase' }}
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="join-display-name" style={labelStyle}>
          Your display name
        </label>
        <input
          id="join-display-name"
          type="text"
          required
          minLength={1}
          maxLength={30}
          placeholder="e.g. Bob"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setError(null);
          }}
          className="da-input"
        />
      </div>

      {error && (
        <p role="alert" style={{ color: '#ff4d4d', fontSize: '12px', margin: 0 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold"
        style={{ marginTop: '4px' }}
      >
        <ButtonLoadingLabel
          loading={submitting}
          label="— Join Room —"
          loadingLabel="Joining…"
        />
      </button>
    </form>
  );
}
