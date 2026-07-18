"use client";

import type { CSSProperties, ReactNode } from "react";
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";

interface DailyCompleteShellProps {
  open: boolean;
  onClose: () => void;
  enabled?: boolean;
  ariaLabel?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** Renders children in the fullscreen daily-complete overlay when open. */
export function DailyCompleteShell({
  open,
  onClose,
  enabled = true,
  ariaLabel,
  style,
  children,
}: DailyCompleteShellProps) {
  if (!enabled) return <>{children}</>;

  if (open) {
    return (
      <DailyCompleteOverlay
        open
        onClose={onClose}
        ariaLabel={ariaLabel}
        style={style}
      >
        {children}
      </DailyCompleteOverlay>
    );
  }

  return <>{children}</>;
}
