"use client";

import { SoundProvider } from "@/lib/audio/sound-context";
import { StreakProvider } from "@/lib/streak/context";
import { StreakNotifier } from "@/components/streak/streak-notifier";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SoundProvider>
      <StreakProvider>
        <StreakNotifier />
        {children}
      </StreakProvider>
    </SoundProvider>
  );
}
