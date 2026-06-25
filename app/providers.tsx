"use client";

import { SoundProvider } from "@/lib/audio/sound-context";
import { StreakProvider } from "@/lib/streak/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SoundProvider>
      <StreakProvider>{children}</StreakProvider>
    </SoundProvider>
  );
}
