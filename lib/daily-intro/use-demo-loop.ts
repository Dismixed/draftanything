"use client";

import { useEffect, useRef } from "react";

const STOPPED = Symbol("stopped");

export type DemoWait = (ms: number) => Promise<void>;

/**
 * Runs an intro demo's timeline while `enabled`. `wait` throws once the component unmounts or
 * `enabled` turns false, which unwinds the timeline, so a demo is written as a plain loop.
 */
export function useDemoLoop(run: (wait: DemoWait) => Promise<void>, enabled: boolean): void {
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const timers = new Set<number>();
    const wait: DemoWait = (ms) =>
      new Promise((resolve, reject) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          if (stopped) reject(STOPPED);
          else resolve();
        }, ms);
        timers.add(id);
      });

    runRef.current(wait).catch((err) => {
      if (err !== STOPPED) console.error("Intro demo failed:", err);
    });

    return () => {
      stopped = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [enabled]);
}
