"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [pool, setPool] = useState<PoolProjection | null>(null);
  const [suggestions, setSuggestions] = useState<PoolSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
              event: "UPDATE",
              schema: "public",
              table: "drafts",
              filter: `id=eq.${draftId}`,
            },
            () => {
              router.refresh();
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
  }, [draftId, fetchPool, fetchSuggestions, router]);

  async function handleGenerate() {
    if (!pool || generating) return;
    setGenerating(true);
    setError(null);
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
    } finally {
      setGenerating(false);
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
        router.refresh();
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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-dim)' }}>Loading pool…</p>
      </div>
    );
  }

  const minItems = room.maxPlayers * room.rounds;
  const itemCount = pool?.items.length ?? 0;
  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '4px' }}>
              Pool Review
            </p>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: 'var(--text)', fontSize: 'clamp(20px,4vw,28px)', margin: 0 }}>
              {room.topic}
            </h1>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', flexShrink: 0 }}>
            {itemCount} items (min {minItems})
          </p>
        </header>

        {error && (
          <div role="alert" style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.25)', padding: '12px 14px', color: '#ff4d4d', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', marginLeft: '8px' }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="da-input"
            style={{ flex: 1 }}
            aria-label="Search pool items"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2" style={{ position: "relative" }}>
            {generating && (
              <div
                aria-live="polite"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(8,8,12,0.72)",
                  border: "1px solid var(--border-hi)",
                }}
              >
                <p style={{ color: "var(--gold)", fontSize: "13px", margin: 0, letterSpacing: "0.08em" }}>
                  Generating pool items…
                </p>
              </div>
            )}
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
              onPoolChange={setPool}
            />
          </div>
        </div>

        {isHost && (
          <section aria-label="Host pool controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              aria-busy={generating}
              className="btn-gold"
              style={{ width: "auto", padding: "10px 18px" }}
            >
              {generating ? "Generating…" : "Generate with AI"}
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
              className="btn-ghost"
              style={{ width: 'auto' }}
            >
              Add manual item
            </button>

            {!confirmLock ? (
              <button
                type="button"
                onClick={() => setConfirmLock(true)}
                disabled={itemCount < minItems}
                aria-disabled={itemCount < minItems}
                className="btn-gold"
                style={{ width: 'auto', padding: '10px 18px', opacity: itemCount < minItems ? 0.4 : 1, cursor: itemCount < minItems ? 'not-allowed' : 'pointer' }}
              >
                {itemCount >= minItems
                  ? `Lock pool (${itemCount} items)`
                  : `Need ${minItems - itemCount} more items`}
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', padding: '10px 14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                  Lock pool with {itemCount} items?
                </span>
                <button
                  type="button"
                  onClick={handleLock}
                  className="btn-gold"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmLock(false)}
                  className="btn-ghost"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                >
                  Cancel
                </button>
              </div>
            )}

            {pendingSuggestions.length > 0 && (
              <span style={{ color: 'var(--gold)', fontSize: '12px' }}>
                {pendingSuggestions.length} pending suggestion{pendingSuggestions.length !== 1 ? "s" : ""}
              </span>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
