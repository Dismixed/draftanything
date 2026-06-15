"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CreateRoomFormProps {
  onSuccess?: (draftId: string, roomCode: string) => void;
}

const DEFAULT_VALUES = {
  displayName: "",
  topic: "",
  maxPlayers: 4,
  rounds: 5,
  timerSeconds: 60 as number | null,
  draftType: "standard" as "standard" | "snake" | "random",
  judgingMode: "ai" as "ai" | "community" | "hybrid",
  aiPersonality: "analyst" as "analyst" | "hype" | "roast",
};

export function CreateRoomForm({ onSuccess }: CreateRoomFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange<K extends keyof typeof DEFAULT_VALUES>(
    key: K,
    value: (typeof DEFAULT_VALUES)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Ensure guest session exists before creating room
      await fetch("/api/guest", { method: "POST" });

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? data.error ?? "Something went wrong");
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
      aria-label="Create a room"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="create-display-name" className="text-sm font-medium">
          Your display name
        </label>
        <input
          id="create-display-name"
          type="text"
          required
          minLength={1}
          maxLength={30}
          placeholder="e.g. Alice"
          value={form.displayName}
          onChange={(e) => handleChange("displayName", e.target.value)}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="create-topic" className="text-sm font-medium">
          Draft topic
        </label>
        <input
          id="create-topic"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Best TV Shows of the 90s"
          value={form.topic}
          onChange={(e) => handleChange("topic", e.target.value)}
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="create-max-players" className="text-sm font-medium">
            Players (2–6)
          </label>
          <input
            id="create-max-players"
            type="number"
            required
            min={2}
            max={6}
            value={form.maxPlayers}
            onChange={(e) => handleChange("maxPlayers", Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="create-rounds" className="text-sm font-medium">
            Rounds (1–10)
          </label>
          <input
            id="create-rounds"
            type="number"
            required
            min={1}
            max={10}
            value={form.rounds}
            onChange={(e) => handleChange("rounds", Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="create-draft-type" className="text-sm font-medium">
          Draft type
        </label>
        <select
          id="create-draft-type"
          value={form.draftType}
          onChange={(e) =>
            handleChange("draftType", e.target.value as "standard" | "snake" | "random")
          }
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="standard">Standard (linear order)</option>
          <option value="snake">Snake (reverses each round)</option>
          <option value="random">Random</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="create-judging-mode" className="text-sm font-medium">
          Judging mode
        </label>
        <select
          id="create-judging-mode"
          value={form.judgingMode}
          onChange={(e) =>
            handleChange(
              "judgingMode",
              e.target.value as "ai" | "community" | "hybrid",
            )
          }
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ai">AI judge</option>
          <option value="community">Community vote</option>
          <option value="hybrid">Hybrid (AI + community)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="create-personality" className="text-sm font-medium">
          AI personality
        </label>
        <select
          id="create-personality"
          value={form.aiPersonality}
          onChange={(e) =>
            handleChange(
              "aiPersonality",
              e.target.value as "analyst" | "hype" | "roast",
            )
          }
          className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="analyst">Analyst (thoughtful, data-driven)</option>
          <option value="hype">Hype (energetic, enthusiastic)</option>
          <option value="roast">Roast (playful trash talk)</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Turn timer</label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="timer"
              checked={form.timerSeconds === null}
              onChange={() => handleChange("timerSeconds", null)}
            />
            Off
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="timer"
              checked={form.timerSeconds !== null}
              onChange={() => handleChange("timerSeconds", 60)}
            />
            On
          </label>
          {form.timerSeconds !== null && (
            <input
              type="number"
              min={15}
              max={180}
              value={form.timerSeconds}
              onChange={(e) => handleChange("timerSeconds", Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Timer seconds"
            />
          )}
          {form.timerSeconds !== null && (
            <span className="text-sm text-gray-500">seconds</span>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Creating room…" : "Create room"}
      </button>
    </form>
  );
}
