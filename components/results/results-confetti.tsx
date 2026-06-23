"use client";

import { useEffect } from "react";
import { fireConfetti } from "@/lib/motion/confetti";

export function ResultsConfetti() {
  useEffect(() => {
    void fireConfetti("gold");
  }, []);

  return null;
}
