"use client";

import { SoundProvider } from "@/lib/audio/sound-context";
import { StreakProvider } from "@/lib/streak/context";
import { ThemeProvider } from "@/lib/theme/theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SoundProvider>
        <StreakProvider>{children}</StreakProvider>
      </SoundProvider>
    </ThemeProvider>
  );
}
