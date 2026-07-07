import { NextRequest, NextResponse } from "next/server";
import { fetchQuestions } from "@/lib/brain-dead/trivia-api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Number(searchParams.get("count")) || 20;
  const category = searchParams.get("category");
  const token = searchParams.get("token") || "";
  const seenIds = searchParams.get("seen")?.split(",").filter(Boolean) ?? [];

  const result = await fetchQuestions({ count, category, token, seenIds });

  if (result.error) {
    return NextResponse.json(
      { error: result.error, questions: [], token: result.token },
      { status: 502 },
    );
  }

  return NextResponse.json({
    questions: result.questions,
    token: result.token,
  });
}
