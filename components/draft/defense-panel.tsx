"use client";

import { useState } from "react";
import type { DraftRoomProjection } from "@/features/draft/types";

interface DefensePanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

export function DefensePanel({ projection, myPlayerId }: DefensePanelProps) {
  const [defenseText, setDefenseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { draft, players } = projection;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;

  const handleSubmit = async (skipped: boolean) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/defense`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defenseText: skipped ? null : defenseText,
          skipped,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to submit defense");
      }

      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to advance phase");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section aria-label="Defense" className="bg-white rounded-xl border p-4">
        <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
          Your Defense
        </h2>
        <p className="text-sm text-green-600 font-medium">
          Defense submitted successfully.
        </p>
        {isHost && (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={submitting}
            autoFocus
            className="mt-3 w-full bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Advancing..." : "End Defense & Advance"}
          </button>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Defense" className="bg-white rounded-xl border p-4">
      <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
        Defend Your Picks
      </h2>

      <p className="text-sm text-gray-600 mb-3">
        Explain why your roster deserves to win.
      </p>

      <textarea
        value={defenseText}
        onChange={(e) => setDefenseText(e.target.value)}
        placeholder="My roster is strategically superior because..."
        className="w-full border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        maxLength={2000}
        disabled={submitting}
      />

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={submitting || defenseText.trim().length === 0}
          className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit Defense"}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="flex-1 bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          Skip Defense
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {isHost && (
        <button
          type="button"
          onClick={handleAdvance}
          disabled={submitting}
          className="mt-3 w-full bg-gray-200 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          {submitting ? "Advancing..." : "End Defense Early & Advance"}
        </button>
      )}
    </section>
  );
}
