import { getDateString, getTodayCategory } from "@/lib/ball-knowledge/game-logic";

export async function GET() {
  const playDate = getDateString();
  return Response.json({
    playDate,
    category: getTodayCategory(),
  });
}
