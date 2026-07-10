import type { Metadata } from "next";
import BallKnowledgeGame from "@/components/ball-knowledge/game";
import { getTodayCategory } from "@/lib/ball-knowledge/game-logic";

export const metadata: Metadata = {
  title: "Ball Knowledge — Daily Challenge",
  description:
    "60 seconds. One random category — anything from pizza toppings to state capitals. Type as many correct answers as you can.",
};

export default function BallKnowledgeDailyPage() {
  const category = getTodayCategory();
  return <BallKnowledgeGame category={category} />;
}
