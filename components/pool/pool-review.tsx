"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomProjection } from "@/features/room/schema";
import { PoolEditor } from "./pool-editor";
import { SuggestionQueue } from "./suggestion-queue";
import type { PoolProjection, PoolSuggestion } from "@/features/pool/service";

interface PoolReviewProps {
  draftId: string;
  myPlayerId: string;
  hostPlayerId: string;
  room: RoomProjection;
}

export function PoolReview({ draftId, myPlayerId, hostPlayerId, room }: PoolReviewProps) {
  const [pool, setPool] = useState<PoolProjection | null>(null);
  const [suggestions, setSuggestions] = useState<PoolSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmLock, setConfirmLock] = useState(false);
  const channelRef = useRef<{ unsubscribe: () => void } | null>(null);

  const isHost = myPlayerId === hostPlayerId;

  const fetchPool = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/pool`);
      if (res.ok) {
        const data: PoolProjection = await res.json();
        setPool(data);
      }
    } catch {
      // non-fatal
    }
  }, [draftId]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/drafts/${draftId}/suggestions`);
      if (res.ok) {
        const data: PoolSuggestion[] = await res.json();
        setSuggestions(data);
      }
    } catch {
      // non-fatal
    }
  }, [draftId]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchPool(), fetchSuggestions()]);
      setLoading(false);
    }
    void init();
  }, [fetchPool, fetchSuggestions]);

  useEffect(() => {
    async function setupChannel() {
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();
        const channel = supabase.channel(`pool:${draftId}`);

        channel
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "draft_items",
              filter: `draft_id=eq.${draftId}`,
            },
            () => void fetchPool(),
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "pool_suggestions",
              filter: `draft_id=eq.${draftId}`,
            },
            () => void fetchSuggestions(),
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        // non-fatal
      }
    }

    void setupChannel();
    const pollInterval = setInterval(() => {
      void fetchPool();
      void fetchSuggestions();
    }, 15000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
      }
    };
  }, [draftId, fetchPool, fetchSuggestions]);

  async function handleGenerate() {
    if (!pool) return;
    try {
      const res = await fetch(`/api/drafts/${draftId}/pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic: room.topic,
          targetCount: room.maxPlayers * room.rounds * 2,
          existingItems: pool.items.map((i) => i.name),
        }),
      });
      if (res.ok) {
        const data: PoolProjection = await res.json();
        setPool(data);
      } else {
        const err = await res.json();
        setError(err.message ?? "Generation failed");
      }
    } catch {
      setError("Generation failed");
    }
  }

  async function handleLock() {
    try {
      const res = await fetch(`/api/drafts/${draftId}/pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lock" }),
      });
      if (res.ok) {
        setConfirmLock(false);
      } else {
        const err = await res.json();
        setError(err.message ?? "Lock failed");
      }
    } catch {
      setError("Lock failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex items-center justify-center">
        <p className="text-gray-500">Loading pool…</p>
      </div>
    );
  }

  const minItems = room.maxPlayers * room.rounds;
  const itemCount = pool?.items.length ?? 0;
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Pool Review
            </p>
            <h1 className="text-2xl font-bold mt-0.5 truncate">{room.topic}</h1>
          </div>
          <p className="text-sm text-gray-500">
            {itemCount} items (min {minItems})
          </p>
        </header>

        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            aria-label="Search pool items"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {pool && (
              <PoolEditor
                pool={pool}
                draftId={draftId}
                myPlayerId={myPlayerId}
                isHost={isHost}
                search={search}
                onPoolChange={setPool}
              />
            )}
          </div>

          <div className="lg:col-span-1">
            <SuggestionQueue
              draftId={draftId}
              myPlayerId={myPlayerId}
              isHost={isHost}
              suggestions={suggestions}
              onSuggestionsChange={setSuggestions}
              pool={pool}
            />
          </div>
        </div>

        {isHost && (
          <section aria-label="Host pool controls" className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Generate with AI
            </button>

            <button
              type="button"
              onClick={() => {
                const name = prompt("Enter item name:");
                if (name && name.trim()) {
                  fetch(`/api/drafts/${draftId}/pool`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "add-item", name: name.trim() }),
                  })
                    .then((res) => res.ok ? res.json() : null)
                    .then((data) => { if (data) setPool(data); });
                }
              }}
              className="bg-white border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Add manual item
            </button>

            {!confirmLock ? (
              <button
                type="button"
                onClick={() => setConfirmLock(true)}
                disabled={itemCount < minItems}
                aria-disabled={itemCount < minItems}
                className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {itemCount >= minItems
                  ? `Lock pool (${itemCount} items)`
                  : `Need ${minItems - itemCount} more items`}
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <span className="text-sm text-yellow-800">
                  Lock pool with {itemCount} items?
                </span>
                <button
                  type="button"
                  onClick={handleLock}
                  className="bg-yellow-600 text-white rounded px-3 py-1 text-xs font-medium hover:bg-yellow-700"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLock(false)}
                  className="text-sm text-gray-500 underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {pendingSuggestions.length > 0 && (
              <span className="text-sm text-amber-600 self-center">
                {pendingSuggestions.length} pending suggestion{pendingSuggestions.length !== 1 ? "s" : ""}
              </span>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
