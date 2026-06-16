"use client";

import type { ApiErrorCode } from "@/lib/errors";

type Severity = "error" | "warning" | "info";

interface ErrorBannerProps {
  code: ApiErrorCode | "RECONNECTING" | "STALE_TURN" | "TAKEN_ITEM" | "ROOM_FULL" | "CONFIG_CHANGED" | "AI_UNAVAILABLE" | "FALLBACK_JUDGING" | "IMAGE_RETRY" | "NETWORK_ERROR";
  onDismiss?: () => void;
  onAction?: () => void;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string; severity: Severity }> = {
  RECONNECTING: {
    title: "Reconnecting",
    message: "Connection lost. Trying to reconnect…",
    severity: "warning",
  },
  STALE_TURN: {
    title: "Stale turn",
    message: "Your turn information is out of date. The page will refresh.",
    severity: "warning",
  },
  TAKEN_ITEM: {
    title: "Item already taken",
    message: "That item was just picked by someone else. Please choose another.",
    severity: "warning",
  },
  ROOM_FULL: {
    title: "Room full",
    message: "This room has reached its maximum capacity.",
    severity: "error",
  },
  CONFIG_CHANGED: {
    title: "Configuration changed",
    message: "The room settings have changed. Refreshing view.",
    severity: "info",
  },
  AI_UNAVAILABLE: {
    title: "AI unavailable",
    message: "The AI service is temporarily unavailable. Please try again in a moment.",
    severity: "warning",
  },
  FALLBACK_JUDGING: {
    title: "Fallback judging",
    message: "AI judging failed. Falling back to community vote.",
    severity: "info",
  },
  IMAGE_RETRY: {
    title: "Image generation failed",
    message: "Could not generate the result image. You can try again or share the results link instead.",
    severity: "warning",
  },
  NETWORK_ERROR: {
    title: "Network error",
    message: "Something went wrong. Please check your connection and try again.",
    severity: "error",
  },
  RATE_LIMITED: {
    title: "Too many requests",
    message: "You've made too many requests. Please wait a moment before trying again.",
    severity: "warning",
  },
  STALE_STATE: {
    title: "Out of date",
    message: "Your view is out of date. Refreshing with the latest data.",
    severity: "info",
  },
  UNAUTHORIZED: {
    title: "Not authorized",
    message: "You don't have permission to do that.",
    severity: "error",
  },
  NOT_HOST: {
    title: "Host only",
    message: "Only the room host can do that.",
    severity: "warning",
  },
  ROOM_NOT_FOUND: {
    title: "Room not found",
    message: "This room doesn't exist or has been removed.",
    severity: "error",
  },
  INVALID_INPUT: {
    title: "Invalid input",
    message: "Please check your input and try again.",
    severity: "warning",
  },
  INVALID_PHASE: {
    title: "Wrong phase",
    message: "This action isn't available in the current phase.",
    severity: "warning",
  },
  NAME_TAKEN: {
    title: "Name taken",
    message: "That name is already in use. Please choose another.",
    severity: "warning",
  },
  INSUFFICIENT_ITEMS: {
    title: "Not enough items",
    message: "There aren't enough items available for this action.",
    severity: "warning",
  },
};

const SEVERITY_STYLES: Record<Severity, string> = {
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

export function ErrorBanner({ code, onDismiss, onAction }: ErrorBannerProps) {
  const config = ERROR_MESSAGES[code] ?? {
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    severity: "error" as Severity,
  };

  return (
    <div
      role="alert"
      className={`rounded-lg border p-4 ${SEVERITY_STYLES[config.severity]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{config.title}</p>
          <p className="text-sm mt-1">{config.message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAction && (
            <button
              onClick={onAction}
              className="text-sm font-medium underline underline-offset-2 hover:opacity-80"
            >
              Refresh
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm font-medium hover:opacity-80"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
