import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyCategoryForPlay } from "@/lib/hot-takes/daily-service";
import HotTakesGame from "@/components/hot-takes/game";

export const metadata: Metadata = {
  title: "Hot Takes — Daily Tier Game",
  description:
    "Fifteen items, one ranking. Drag them S to D, then see how your takes compare to the crowd.",
};

export default async function HotTakesPage() {
  const db = createAdminClient();
  const category = await getDailyCategoryForPlay(db);
  return <HotTakesGame initialCategory={category} />;
}
