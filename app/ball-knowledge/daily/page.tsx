import type { Metadata } from "next";
import BallKnowledgeGame from "@/components/ball-knowledge/game";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyCategory } from "@/lib/ball-knowledge/puzzle-service";

export const metadata: Metadata = {
  title: "Ball Knowledge — Daily Challenge",
  description:
    "60 seconds. One random category — anything from pizza toppings to state capitals. Type as many correct answers as you can.",
};

export default async function BallKnowledgeDailyPage() {
  let category: string;
  try {
    const db = createAdminClient();
    category = await getDailyCategory(db);
  } catch {
    // Fall back to the deterministic rotation if the DB is unavailable.
    const { getTodayCategory } = await import("@/lib/ball-knowledge/game-logic");
    category = getTodayCategory();
  }
  return <BallKnowledgeGame category={category} />;
}
