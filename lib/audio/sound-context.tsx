"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  INTERACTIVE_BUTTON_SELECTOR,
  SELF_SOUNDCING_SELECTOR,
} from "./interactive-buttons";
import { playSound } from "./play";
import { preloadSamples } from "./samples";
import { SAMPLE_SRCS } from "./sounds";
import { resumeAudioContext } from "./synth";
import type { PlayOptions, SoundId } from "./types";

const STORAGE_KEY = "stim-sound-muted";

type SoundContextValue = {
  unlocked: boolean;
  muted: boolean;
  play: (id: SoundId, options?: PlayOptions) => void;
  toggleMute: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setMuted(false);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;

    void resumeAudioContext();
    preloadSamples(SAMPLE_SRCS);
  }, [unlocked]);

  useEffect(() => {
    if (unlocked) return;

    const unlock = () => {
      setUnlocked(true);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked || muted) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest(SELF_SOUNDCING_SELECTOR)) return;

      const el = target.closest(INTERACTIVE_BUTTON_SELECTOR);
      if (!el || el instanceof HTMLButtonElement && el.disabled) return;
      if (el.getAttribute("aria-disabled") === "true") return;

      playSound(
        "ui.tap",
        { unlocked, muted, reducedMotion },
        { volumeScale: 0.75 },
      );
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [unlocked, muted, reducedMotion]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const play = useCallback(
    (id: SoundId, options?: PlayOptions) => {
      playSound(id, { unlocked, muted, reducedMotion }, options);
    },
    [unlocked, muted, reducedMotion],
  );

  const value = useMemo(
    () => ({ unlocked, muted, play, toggleMute }),
    [unlocked, muted, play, toggleMute],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSound must be used within SoundProvider");
  }
  return ctx;
}
