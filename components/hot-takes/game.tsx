"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { GameTitle } from "@/components/ui/game-title";
import { hotTakesShare } from "@/lib/share/results";
import { FinishScreen } from "@/components/daily/finish-screen";
import { useDailyIntro } from "@/lib/daily-intro/use-daily-intro";
import { getHotTakesPlayed, saveHotTakesPlayed } from "@/lib/hot-takes/storage";
import { HotTakesIntro } from "./intro";
import { HotTakesImage } from "@/components/hot-takes/optimized-image";
import { tiltFor } from "@/lib/hot-takes/tilt";
import type { HotTakesDailyCategory, HotTakesDailyItem } from "@/lib/hot-takes/types";
import { burstFrom } from "@/lib/motion/burst";
import { useCountUp } from "@/lib/motion/count-up";
import { recordDailyCompletion } from "@/lib/streak/storage";

const TIERS = ["S", "A", "B", "C", "D"] as const;
const subscribeNever = () => () => {};
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
    // Rounding leaves a point or two over. It goes to the largest share, which can absorb it;
    // adding it to the first one used to produce "-1% agree".
    const diff = 100 - pct.reduce((a, b) => a + b, 0);
    pct[pct.indexOf(Math.max(...pct))] += diff;
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

/** One item, drawn as a snapshot. Once it is in a tier it carries that tier's letter as an ink stamp. */
function TierItem({
  item,
  tilt,
  tier,
  dragging,
  selected,
  disabled,
  fresh = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  item: HotTakesDailyItem;
  tilt: number;
  tier?: Tier;
  dragging: boolean;
  selected: boolean;
  disabled: boolean;
  fresh?: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>, id: string) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: () => void;
}) {
  return (
    <div
      className={`hot-takes-item${dragging ? " dragging" : ""}${selected ? " selected" : ""}${fresh ? " is-fresh" : ""}`}
      style={{ "--ht-tilt": `${tilt}deg` } as CSSProperties}
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
        <HotTakesImage src={item.imageUrl} alt={item.label} width={96} draggable={false} />
      </div>
      <span className="hot-takes-item-label">{item.label}</span>
      {tier ? (
        <b className="hot-takes-ink" aria-hidden="true">
          {tier}
        </b>
      ) : null}
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
  // A ranking locked in earlier today is restored on mount; the intro waits for that check.
  const [checkedPlayed, setCheckedPlayed] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [lastPlacedId, setLastPlacedId] = useState<string | null>(null);
  const scoreNumRef = useRef<HTMLDivElement>(null);
  const consensus = useMemo(() => generateConsensus(category.items), [category.items]);
  const tilts = useMemo(
    () => new Map(category.items.map((item, index) => [item.id, tiltFor(index)])),
    [category.items],
  );
  // Restored once the page has hydrated, so the server and the browser draw the same first frame.
  // Done during render (React's pattern for derived state) rather than in an effect.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  if (hydrated && !checkedPlayed) {
    setCheckedPlayed(true);
    const played = getHotTakesPlayed(category.name);
    if (played) {
      const restored = { ...placements };
      for (const id of Object.keys(restored)) {
        const tier = played.placements[id];
        if (tier && (TIERS as readonly string[]).includes(tier)) restored[id] = tier as Tier;
      }
      setPlacements(restored);
      setSubmitted(true);
    }
  }

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
    setLastPlacedId(zone === "tray" ? null : itemId);
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

  const displayAvg = useCountUp(results?.avg ?? 0, submitted, 900);
  const resultsAvg = results?.avg;
  useEffect(() => {
    if (resultsAvg === undefined) return;
    const timer = setTimeout(() => {
      void burstFrom(scoreNumRef.current, resultsAvg >= 70 ? 2 : resultsAvg >= 50 ? 1 : 0, "gold");
    }, 500);
    return () => clearTimeout(timer);
  }, [resultsAvg]);

  // Shares the player's own S tier. The crowd percentages shown in the game are simulated.
  const shareText = hotTakesShare(
    category.name,
    category.items.filter((item) => placements[item.id] === "S").map((item) => item.label),
  );

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

  const resultsBody = results ? (
    <div className="hot-takes-finish">
      <div className="hot-takes-score-banner anim-pop-in">
        <div ref={scoreNumRef} className="hot-takes-score-num">{displayAvg}%</div>
        <div className="hot-takes-score-text">
          average agreement with the crowd across your 15 picks.
        </div>
        {results.hottest && (
          <div className="hot-takes-hot-stamp">
            Hottest take · {results.hottest.label} in {results.hottest.tier} · only{" "}
            {results.hottest.pct}% agree
          </div>
        )}
      </div>

      {results.rows.map(({ item, yourTier, dist }) => (
        <div key={item.id} className="hot-takes-consensus-item">
          <div className="hot-takes-consensus-top">
            <HotTakesImage src={item.imageUrl} alt="" width={28} />
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
                    <span className="hot-takes-bar-pct">{w}%</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  ) : null;

  const intro = useDailyIntro("hot-takes", { ready: checkedPlayed, skip: submitted });

  if (intro.phase !== "game") {
    return (
      <div className="hot-takes-page">
        <HotTakesIntro
          pending={intro.phase === "checking"}
          category={category.name}
          labels={category.items.map((item) => item.label)}
          onPlay={intro.play}
        />
      </div>
    );
  }

  return (
    <>
    <div className="hot-takes-page">
      <div className="hot-takes-wrap">
        <header className="hot-takes-top">
          <Link href="/" className="hot-takes-back">
            &larr; Back
          </Link>
          <h1 className="hot-takes-title">
            <GameTitle game="hot-takes" />
          </h1>
          <p className="hot-takes-category">
            <small>Today&apos;s category</small>
            <b>{category.name}</b>
          </p>
        </header>

        <div className={`hot-takes-game-area${submitted ? " is-locked" : ""}`}>
          <div className="hot-takes-board">
            {TIERS.map((tier) => {
              const tierItems = category.items.filter((item) => placements[item.id] === tier);
              return (
                <div key={tier} className={`hot-takes-tier-row hot-takes-tier-${tier}`}>
                  <div className="hot-takes-tier-label">
                    <span>{tier}</span>
                  </div>
                  <div
                    data-drop-zone={tier}
                    className={`hot-takes-tier-list${dragOverZone === tier ? " drag-over" : ""}${selectedId ? " placeable" : ""}`}
                    onClick={() => handleZoneActivate(tier)}
                  >
                    {tierItems.map((item) => (
                      <TierItem
                        key={item.id}
                        item={item}
                        tilt={tilts.get(item.id) ?? 0}
                        tier={tier}
                        fresh={lastPlacedId === item.id}
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

          {!submitted && (
          <div className="hot-takes-side">
            <div className="hot-takes-tray-panel">
              <div className="hot-takes-tray-head">
                <span className="hot-takes-tray-title">
                  {remaining === 0
                    ? "All fifteen ranked"
                    : selectedId
                      ? "Now tap a tier"
                      : `${remaining} left · drag or tap`}
                </span>
                {remaining > 1 && (
                  <button type="button" className="hot-takes-shuffle" onClick={shuffleTray}>
                    Shuffle
                  </button>
                )}
              </div>
              <div
                data-drop-zone="tray"
                className={`hot-takes-tray-list${dragOverZone === "tray" ? " drag-over" : ""}${selectedId ? " placeable" : ""}`}
                onClick={() => handleZoneActivate("tray")}
              >
                {remaining === 0 && (
                  <p className="hot-takes-tray-empty">Changed your mind? Drag one back here.</p>
                )}
                {trayItems.map((item) => (
                  <TierItem
                    key={item.id}
                    item={item}
                    tilt={tilts.get(item.id) ?? 0}
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
            <button
              type="button"
              className={`hot-takes-btn hot-takes-btn-primary${remaining === 0 ? " is-ready" : ""}`}
              disabled={remaining !== 0}
              onClick={() => {
                setSubmitted(true);
                saveHotTakesPlayed({ category: category.name, placements });
                recordDailyCompletion("hot-takes");
              }}
            >
              {remaining === 0 ? "Lock in my ranking" : `Lock in my ranking (${remaining} left)`}
            </button>
          </div>
          )}
        </div>

        {results && (
          <div className="hot-takes-results" id="hot-takes-results">
            <h2>How you stack up</h2>
            <p className="hot-takes-sub">Here&apos;s how everyone else ranked today&apos;s category.</p>
            {/* The finish screen shows the same breakdown while it is open. */}
            {!completeOpen && (
              <>
                {resultsBody}
                <button
                  type="button"
                  className="hot-takes-btn hot-takes-btn-ghost hot-takes-reopen"
                  onClick={() => setCompleteOpen(true)}
                >
                  Back to today&apos;s summary
                </button>
              </>
            )}
          </div>
        )}

        <footer className="hot-takes-footer">
          Part of the <Link href="/" className="brand">Stim Games</Link> daily lineup
        </footer>
      </div>

    </div>

      <FinishScreen
        gameId="hot-takes"
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        result={resultsBody}
        shareText={shareText}
      />
    </>
  );
}
