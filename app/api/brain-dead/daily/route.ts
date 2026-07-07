import { NextResponse } from "next/server";
import type { TransformedQuestion } from "@/lib/brain-dead/trivia-api";
import { fetchDailyQuestions } from "@/lib/brain-dead/trivia-api";

/* ------------------------------------------------------------------ */
/*  In-memory cache: same 15 questions for everyone on a given day     */
/* ------------------------------------------------------------------ */

const dailyCache = new Map<string, TransformedQuestion[]>();

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const cached = dailyCache.get(today);
  if (cached) {
    return NextResponse.json({ questions: cached });
  }

  const { questions, error } = await fetchDailyQuestions(15);

  if (error || !questions.length) {
    return NextResponse.json(
      { error: error ?? "No questions available" },
      { status: 502 },
    );
  }

  dailyCache.set(today, questions);

  return NextResponse.json({ questions });
}
