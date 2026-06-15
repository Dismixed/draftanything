"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JoinRoomFormProps {
  /**
   * Pre-fill the room code field (e.g. when arriving via an invite link).
   */
  initialRoomCode?: string;
  onSuccess?: (draftId: string, roomCode: string) => void;
}

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
      className="flex flex-col gap-4 w-full max-w-md"
      aria-label="Join a room"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="join-room-code" className="text-sm font-medium">
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
          className="border rounded px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="join-display-name" className="text-sm font-medium">
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
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-green-600 text-white rounded px-4 py-2 font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Joining…" : "Join room"}
      </button>
    </form>
  );
}
