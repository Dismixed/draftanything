"use client";

import { usePathname } from "next/navigation";
import { StreakBadge } from "@/components/streak/streak-notifier";

export function HomeStreakBadge() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <StreakBadge />;
}
