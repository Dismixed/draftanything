import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { TransformedQuestion } from "@/lib/brain-dead/trivia-api";
import { fetchDailyQuestions } from "@/lib/brain-dead/trivia-api";

const DAILY_QUESTION_COUNT = 15;
const ONE_DAY_SECONDS = 60 * 60 * 24;

function getCachedDailyQuestions(today: string) {
  return unstable_cache(
    async (): Promise<{ questions: TransformedQuestion[]; error?: string }> =>
      fetchDailyQuestions(DAILY_QUESTION_COUNT),
    ["brain-dead-daily", today],
    {
      revalidate: ONE_DAY_SECONDS,
      tags: [`brain-dead-daily-${today}`],
    },
  )();
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const { questions, error } = await getCachedDailyQuestions(today);

  if (error || !questions.length) {
    return NextResponse.json(
      { error: error ?? "No questions available" },
      { status: 502 },
    );
  }

  return NextResponse.json({ questions });
}
