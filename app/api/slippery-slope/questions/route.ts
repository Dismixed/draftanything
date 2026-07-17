import { NextRequest, NextResponse } from "next/server";
import { enrichQuestionsWithTopics } from "@/features/slippery-slope/topic";
import { resolveSsFetchCategory } from "@/features/slippery-slope/topic-hint";
import { fetchQuestions } from "@/lib/brain-dead/trivia-api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Number(searchParams.get("count")) || 20;
  const category = searchParams.get("category") ?? "general";
  const token = searchParams.get("token") || "";
  const seenIds = searchParams.get("seen")?.split(",").filter(Boolean) ?? [];

  const result = await fetchQuestions({
    count,
    category: resolveSsFetchCategory(category),
    token,
    seenIds,
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error, questions: [], token: result.token },
      { status: 502 },
    );
  }

  const questions = await enrichQuestionsWithTopics(result.questions, category);

  return NextResponse.json({
    questions,
    token: result.token,
  });
}
