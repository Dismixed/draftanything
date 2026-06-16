"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { DraftRoomProjection } from "@/features/draft/types";

interface JudgingPanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
}

export function JudgingPanel({ projection, myPlayerId }: JudgingPanelProps) {
  const router = useRouter();
  const [judging, setJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { draft, players, judgment } = projection;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;

  const alreadyJudged = judgment !== null;

  const handleRunJudging = useCallback(async () => {
    setJudging(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Judging failed");
      }

      router.push(`/results/${draft.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setJudging(false);
    }
  }, [draft.id, router]);

  const handleAdvance = useCallback(async () => {
    setJudging(true);
    setError(null);

    try {
      const res = await fetch(`/api/drafts/${draft.id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "COMPLETE" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Failed to advance phase");
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setJudging(false);
    }
  }, [draft.id, router]);

  if (alreadyJudged) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
              Results Ready
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              The AI commissioner has finished evaluating rosters.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push(`/results/${draft.id}`)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                View Results
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={handleAdvance}
                  disabled={judging}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {judging ? "Advancing..." : "Advance to Complete"}
                </button>
              )}
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isHost) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-xl border p-4">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
              Judging Phase
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              All defenses and votes are in. Ready to evaluate the rosters?
            </p>
            <button
              type="button"
              onClick={handleRunJudging}
              disabled={judging}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {judging ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Evaluating...
                </>
              ) : (
                "Run Judging"
              )}
            </button>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
            Judging in Progress
          </h2>
          <p className="text-sm text-gray-600">
            The host is evaluating rosters. Results will appear shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
