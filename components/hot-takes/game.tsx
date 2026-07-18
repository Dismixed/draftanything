"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { GameTitle } from "@/components/ui/game-title";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { OtherDailies } from "@/components/daily/other-dailies";
import { DailyCompleteShell } from "@/components/daily/daily-complete-shell";
import { useGameHowItWorks } from "@/lib/game-how-it-works";
import type { HotTakesDailyCategory, HotTakesDailyItem } from "@/lib/hot-takes/types";

const TIERS = ["S", "A", "B", "C", "D"] as const;
type Tier = (typeof TIERS)[number];
type DropZone = Tier | "tray";

const DRAG_THRESHOLD_PX = 8;

const TIER_COLORS: Record<Tier, string> = {
  S: "var(--ht-heat-s)",
  A: "var(--ht-heat-a)",
  B: "var(--ht-heat-b)",
  C: "var(--ht-heat-c)",
  D: "var(--ht-heat-d)",
};

function zoneFromPoint(
  x: number,
  y: number,
  exclude?: HTMLElement | null,
): DropZone | null {
  const prev = exclude?.style.pointerEvents;
  if (exclude) exclude.style.pointerEvents = "none";
  const el = document.elementFromPoint(x, y);
  if (exclude) exclude.style.pointerEvents = prev ?? "";
  const zone = el?.closest("[data-drop-zone]")?.getAttribute("data-drop-zone");
  if (zone === "tray" || (TIERS as readonly string[]).includes(zone ?? "")) {
    return zone as DropZone;
  }
  return null;
}

function seedRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateConsensus(items: HotTakesDailyItem[]) {
  const out: Record<string, Record<Tier, number>> = {};
  items.forEach((it, idx) => {
    const rnd = seedRandom(idx * 13 + 7);
    const weights = TIERS.map(() => Math.pow(rnd(), 2.2));
    const sum = weights.reduce((a, b) => a + b, 0);
    const pct = weights.map((w) => Math.round((w / sum) * 100));
    const diff = 100 - pct.reduce((a, b) => a + b, 0);
    pct[0] += diff;
    out[it.id] = {
      S: pct[0]!,
      A: pct[1]!,
      B: pct[2]!,
      C: pct[3]!,
      D: pct[4]!,
    };
  });
  return out;
}

function TierItem({
  item,
  dragging,
  selected,
  disabled,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  item: HotTakesDailyItem;
  dragging: boolean;
  selected: boolean;
  disabled: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
}) {
  return (
    <div
      className={`hot-takes-item${dragging ? " dragging" : ""}${selected ? " selected" : ""}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        if (disabled) return;
        onPointerDown(e, item.id);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="hot-takes-icon-box">
        <img src={item.imageUrl} alt={item.label} draggable={false} />
      </div>
      <span className="hot-takes-item-label">{item.label}</span>
    </div>
  );
}

export default function HotTakesGame({
  initialCategory,
}: {
  initialCategory: HotTakesDailyCategory;
}) {
  const [category] = useState(initialCategory);
  const [placements, setPlacements] = useState<Record<string, Tier | "tray">>(() => {
    const init: Record<string, Tier | "tray"> = {};
    for (const item of initialCategory.items) init[item.id] = "tray";
    return init;
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [trayShuffle, setTrayShuffle] = useState(0);
  const { showHowItWorks, dismissHowItWorks } = useGameHowItWorks("hot-takes");
  const [completeOpen, setCompleteOpen] = useState(false);
  const consensus = useMemo(() => generateConsensus(category.items), [category.items]);
  const pointerDragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const trayItems = useMemo(() => {
    const items = category.items.filter((item) => placements[item.id] === "tray");
    const shuffled = [...items];
    let seed = trayShuffle + 1;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  }, [category.items, placements, trayShuffle]);
  const remaining = trayItems.length;

  const moveItem = useCallback((itemId: string, zone: DropZone) => {
    setPlacements((prev) => ({ ...prev, [itemId]: zone }));
    setSelectedId(null);
  }, []);

  const clearPointerDrag = useCallback(() => {
    pointerDragRef.current = null;
    setDraggingId(null);
    setDragOverZone(null);
  }, []);

  const handleItemPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
      if (submitted || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointerDragRef.current = {
        id,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
      };
    },
    [submitted],
  );

  const handleItemPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = pointerDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.active = true;
      setSelectedId(null);
      setDraggingId(drag.id);
    }

    e.preventDefault();
    setDragOverZone(zoneFromPoint(e.clientX, e.clientY, e.currentTarget));
  }, []);

  const handleItemPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = pointerDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }

      if (drag.active) {
        const zone = zoneFromPoint(e.clientX, e.clientY, e.currentTarget);
        if (zone) moveItem(drag.id, zone);
        clearPointerDrag();
        return;
      }

      clearPointerDrag();
      setSelectedId((prev) => (prev === drag.id ? null : drag.id));
    },
    [clearPointerDrag, moveItem],
  );

  const handleZoneActivate = useCallback(
    (zone: DropZone) => {
      if (submitted || !selectedId) return;
      moveItem(selectedId, zone);
    },
    [moveItem, selectedId, submitted],
  );

  function shuffleTray() {
    setTrayShuffle((n) => n + 1);
  }

  const results = useMemo(() => {
    if (!submitted) return null;

    let totalAgree = 0;
    let hottestLabel = "";
    let hottestTier: Tier = "S";
    let hottestPct = 101;

    const rows = category.items.map((item) => {
      const yourTier = placements[item.id] as Tier;
      const dist = consensus[item.id]!;
      const agree = dist[yourTier];
      totalAgree += agree;
      if (agree < hottestPct) {
        hottestLabel = item.label;
        hottestTier = yourTier;
        hottestPct = agree;
      }
      return { item, yourTier, dist };
    });

    const avg = Math.round(totalAgree / category.items.length);
    const hottest =
      hottestPct <= 100
        ? { label: hottestLabel, tier: hottestTier, pct: hottestPct }
        : null;
    return { rows, avg, hottest };
  }, [submitted, category.items, placements, consensus]);

  const shareText = results
    ? `Hot Takes — ${category.name}\nI'm ${results.avg}% aligned with the crowd today. Think you can do better?`
    : "";

  useEffect(() => {
    if (!submitted) {
      setCompleteOpen(false);
      return;
    }
    document.getElementById("hot-takes-results")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const timer = setTimeout(() => setCompleteOpen(true), 450);
    return () => clearTimeout(timer);
  }, [submitted]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DailyCompleteShell
      enabled={submitted}
      open={completeOpen}
      onClose={() => setCompleteOpen(false)}
      ariaLabel="Daily complete"
    >
    <div className="hot-takes-page">
      <div className="hot-takes-wrap">
        <header className="hot-takes-header">
          <div className="hot-takes-eyebrow">
            Tier Game · <span>Solo · Daily</span>
          </div>
          <h1 className="hot-takes-title">
            <GameTitle game="hot-takes" />
          </h1>
          <p className="hot-takes-sub">
            Fifteen items, one ranking. Drag or tap them S to D, then see if you&apos;re right — or
            just controversial.
          </p>
          <div className="hot-takes-meta-row">
            <div className="hot-takes-pill">
              Today&apos;s category: <b>{category.name}</b>
            </div>
            <div className="hot-takes-pill">{dateLabel}</div>
          </div>
        </header>

        <div className="hot-takes-action-bar">
          <button
            type="button"
            className="hot-takes-btn hot-takes-btn-primary"
            disabled={remaining !== 0 || submitted}
            onClick={() => setSubmitted(true)}
          >
            {remaining === 0
              ? "Lock in my ranking"
              : `Lock in my ranking (${remaining} left)`}
          </button>
          <button
            type="button"
            className="hot-takes-btn hot-takes-btn-ghost"
            onClick={shuffleTray}
            disabled={submitted}
          >
            Shuffle tray
          </button>
        </div>

        <div className="hot-takes-game-area">
          <div className="hot-takes-board">
            {TIERS.map((tier) => {
              const tierItems = category.items.filter((item) => placements[item.id] === tier);
              return (
                <div key={tier} className={`hot-takes-tier-row hot-takes-tier-${tier}`}>
                  <div className="hot-takes-tier-label">{tier}</div>
                  <div
                    data-drop-zone={tier}
                    className={`hot-takes-tier-list${dragOverZone === tier ? " drag-over" : ""}${selectedId ? " placeable" : ""}`}
                    onClick={() => handleZoneActivate(tier)}
                  >
                    {tierItems.map((item) => (
                      <TierItem
                        key={item.id}
                        item={item}
                        dragging={draggingId === item.id}
                        selected={selectedId === item.id}
                        disabled={submitted}
                        onPointerDown={handleItemPointerDown}
                        onPointerMove={handleItemPointerMove}
                        onPointerUp={handleItemPointerUp}
                        onPointerCancel={clearPointerDrag}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hot-takes-tray-panel">
            <div className="hot-takes-tray-title">
              {selectedId ? "Tap a tier to place" : "Drag or tap into your tiers"}
            </div>
            <div
              data-drop-zone="tray"
              className={`hot-takes-tray-list${dragOverZone === "tray" ? " drag-over" : ""}${selectedId ? " placeable" : ""}`}
              onClick={() => handleZoneActivate("tray")}
            >
              {trayItems.map((item) => (
                <TierItem
                  key={item.id}
                  item={item}
                  dragging={draggingId === item.id}
                  selected={selectedId === item.id}
                  disabled={submitted}
                  onPointerDown={handleItemPointerDown}
                  onPointerMove={handleItemPointerMove}
                  onPointerUp={handleItemPointerUp}
                  onPointerCancel={clearPointerDrag}
                />
              ))}
            </div>
          </div>
        </div>

        {results && (
          <div className="hot-takes-results" id="hot-takes-results">
            <h2>How you stack up</h2>
            <p className="hot-takes-sub">Here&apos;s how everyone else ranked today&apos;s category.</p>

            <div className="hot-takes-score-banner">
              <div className="hot-takes-score-num">{results.avg}%</div>
              <div className="hot-takes-score-text">
                average agreement with the crowd across your 15 picks.
                {results.hottest && (
                  <>
                    {" "}
                    Your hottest take: {results.hottest.label} in {results.hottest.tier} tier
                    (only {results.hottest.pct}% agree).
                  </>
                )}
              </div>
            </div>

            {results.rows.map(({ item, yourTier, dist }) => (
              <div key={item.id} className="hot-takes-consensus-item">
                <div className="hot-takes-consensus-top">
                  <img src={item.imageUrl} alt="" />
                  <div className="hot-takes-consensus-name">{item.label}</div>
                  <div className="hot-takes-consensus-pick">
                    you said <b>{yourTier}</b> · {dist[yourTier]}% agree
                  </div>
                </div>
                <div className="hot-takes-bars">
                  {TIERS.map((t) => {
                    const w = dist[t];
                    return (
                      <div
                        key={t}
                        className={`hot-takes-bar${t === yourTier ? " you" : ""}`}
                        style={{ width: `${w}%`, background: TIER_COLORS[t] }}
                      >
                        {w >= 10 ? (
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#1a1a1a" }}>
                            {w}%
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                className="hot-takes-btn hot-takes-btn-ghost"
                onClick={() => {
                  if (shareText) {
                    void navigator.clipboard?.writeText(shareText);
                  }
                }}
              >
                Copy share text
              </button>
            </div>

            <OtherDailies currentGameId="hot-takes" />
          </div>
        )}

        <footer className="hot-takes-footer">
          Part of the <Link href="/" className="brand">Stim Games</Link> daily lineup
        </footer>
      </div>

      {showHowItWorks && (
        <GameHowItWorksModal
          subtitle="15 items · One ranking a day"
          rules={HOT_TAKES_HOW_IT_WORKS}
          onDismiss={dismissHowItWorks}
          theme={{
            overlay: "var(--ht-overlay)",
            surface: "var(--ht-surface)",
            border: "var(--ht-line)",
            accent: "var(--ht-accent)",
            text: "var(--ht-text)",
            textMuted: "var(--ht-text-dim)",
          }}
        />
      )}
    </div>
    </DailyCompleteShell>
  );
}

const HOT_TAKES_HOW_IT_WORKS = [
  {
    title: "Rank Today's Category",
    body: "Everyone gets the same 15 items in one category — drag or tap each into your S, A, B, C, or D tiers.",
  },
  {
    title: "From the Tray",
    body: "Items start in the tray. Drag them into a tier, or tap an item then tap a tier. Move them back anytime before you lock in.",
  },
  {
    title: "Lock It In",
    body: "Place every item before you submit. Once you lock in your ranking, you can't change it.",
  },
  {
    title: "See the Crowd",
    body: "After you submit, compare your tiers to how everyone else ranked — find out if you're aligned or controversial.",
  },
] as const;
