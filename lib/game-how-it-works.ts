"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "how-it-works-seen-";

export function isHowItWorksSeen(gameId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${STORAGE_PREFIX}${gameId}`) === "true";
}

export function markHowItWorksSeen(gameId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_PREFIX}${gameId}`, "true");
}

export function useGameHowItWorks(gameId: string) {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    setShowHowItWorks(!isHowItWorksSeen(gameId));
  }, [gameId]);

  const dismissHowItWorks = useCallback(() => {
    markHowItWorksSeen(gameId);
    setShowHowItWorks(false);
  }, [gameId]);

  return { showHowItWorks, dismissHowItWorks };
}
