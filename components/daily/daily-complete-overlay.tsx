"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

interface DailyCompleteOverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabel?: string;
  /** Optional theme vars for games that don't use global --bg/--text */
  style?: CSSProperties;
}

export function DailyCompleteOverlay({
  open,
  onClose,
  children,
  ariaLabel = "Daily complete",
  style,
}: DailyCompleteOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="daily-complete-overlay anim-fade-slide-up"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      style={style}
    >
      <Link href="/" className="daily-complete-home">
        ← Home
      </Link>
      <button
        type="button"
        className="daily-complete-close"
        onClick={onClose}
        aria-label="Close and view game"
      >
        ×
      </button>
      <div className="daily-complete-body">{children}</div>
    </div>,
    document.body,
  );
}
