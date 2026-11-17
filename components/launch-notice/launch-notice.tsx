"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GameCardPreview } from "@/components/daily/game-card-preview";
import { track } from "@/lib/analytics/track";
import { getGame } from "@/lib/games/registry";
import {
  isNewGamePath,
  markDone,
  noticeFor,
  readDone,
  rememberEntry,
  type NoticeKind,
} from "@/lib/launch-notice";
import { getDateString } from "@/lib/streak/date";
import { readStreakStore } from "@/lib/streak/storage";

/** The pop-up waits a moment, so the home page is seen first. */
const POPUP_DELAY_MS = 700;

export function LaunchNotice() {
  const pathname = usePathname() ?? "/";
  const [kind, setKind] = useState<NoticeKind | null>(null);

  useEffect(() => {
    const entry = rememberEntry(pathname);
    if (isNewGamePath(pathname)) markDone();
    const next = noticeFor({
      pathname,
      entry,
      done: readDone(),
      playedNewGame: readStreakStore().games["dead-reckoning"].playDates.length > 0,
      today: getDateString(),
    });
    // Decided in the browser, after the first paint: the server cannot see the visitor's storage.
    const id = window.setTimeout(() => setKind(next), next === "popup" ? POPUP_DELAY_MS : 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    if (kind) track("launch_notice_shown", { game: "dead-reckoning", kind });
  }, [kind]);

  const close = (how: "dismissed" | "clicked") => {
    markDone();
    if (kind) track(`launch_notice_${how}`, { game: "dead-reckoning", kind });
    setKind(null);
  };

  if (kind === "popup") return <Popup onClose={close} />;
  if (kind === "banner") return <Banner onClose={close} />;
  return null;
}

type Close = (how: "dismissed" | "clicked") => void;

function Popup({ onClose }: { onClose: Close }) {
  const game = getGame("dead-reckoning");
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the card, not its button, so keyboard users start inside it without a ring on open.
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose("dismissed");
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="ln-scrim" onClick={(e) => e.target === e.currentTarget && onClose("dismissed")}>
      <div ref={dialog} tabIndex={-1} className="ln-modal" role="dialog" aria-modal="true" aria-labelledby="ln-title" data-testid="launch-popup">
        <div className="ln-art">
          <GameCardPreview gameId="dead-reckoning" size="lg" />
          <button type="button" className="ln-x" aria-label="Close" onClick={() => onClose("dismissed")}>
            ×
          </button>
        </div>
        <div className="ln-body">
          <span className="ln-kick">New daily game</span>
          <h2 id="ln-title" className="ln-title">
            Dead <span>Reckoning</span>
          </h2>
          <p>{game.pitch}</p>
          <div className="ln-tags">
            <span>{game.duration}</span>
            <span>Counts toward your Sweep</span>
          </div>
          <div className="ln-row">
            <Link href={game.playHref} className="ln-cta" onClick={() => onClose("clicked")}>
              Play today&apos;s voyage →
            </Link>
            <button type="button" className="ln-later" onClick={() => onClose("dismissed")}>
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Banner({ onClose }: { onClose: Close }) {
  const game = getGame("dead-reckoning");
  const ref = useRef<HTMLDivElement>(null);

  // The corner buttons are pinned to the top of the window; move them below the banner.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const update = () => root.style.setProperty("--notice-h", `${el.offsetHeight}px`);
    update();
    // Without ResizeObserver (old browsers), the height is still right for the common case of no resize.
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      root.style.removeProperty("--notice-h");
    };
  }, []);

  return (
    <div ref={ref} className="ln-banner" role="region" aria-label="New game" data-testid="launch-banner">
      <span className="ln-new">New</span>
      <span>
        <b>Dead Reckoning</b>
        <span className="ln-long"> is here: seven questions, one number each.</span>
      </span>
      <Link href={game.playHref} onClick={() => onClose("clicked")}>
        Set sail →
      </Link>
      <button type="button" className="ln-x" aria-label="Close" onClick={() => onClose("dismissed")}>
        ×
      </button>
    </div>
  );
}
