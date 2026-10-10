"use client";

import { useEffect, useState } from "react";

const HOLD_MS = 1700;
const TYPE_MS = 70;
const DELETE_MS = 35;

/** The topic in the landing heading. Types and deletes itself; stays put under reduced motion. */
export function RotatingTopic({ topics }: { topics: string[] }) {
  const [text, setText] = useState(topics[0]);

  useEffect(() => {
    if (topics.length < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let index = 0;
    let length = topics[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    function step() {
      length += deleting ? -1 : 1;
      const word = topics[index];
      setText(word.slice(0, length));

      let wait = deleting ? DELETE_MS : TYPE_MS;
      if (deleting && length === 0) {
        deleting = false;
        index = (index + 1) % topics.length;
        wait = 300;
      } else if (!deleting && length === word.length) {
        deleting = true;
        wait = HOLD_MS;
      }
      timer = setTimeout(step, wait);
    }

    timer = setTimeout(step, HOLD_MS);
    return () => clearTimeout(timer);
  }, [topics]);

  return (
    <>
      <span className="dal-rot" aria-hidden>
        {text}
      </span>
      <span className="dal-sr"> {topics[0]}</span>
    </>
  );
}
