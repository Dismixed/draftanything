import { NextResponse } from "next/server";
import type { TransformedQuestion } from "@/lib/brain-dead/opentdb";
import { transformQuestion } from "@/lib/brain-dead/opentdb";

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

  // Fetch from OpenTDB — mixed difficulties, all categories
  const url = "https://opentdb.com/api.php?amount=15&type=multiple";

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach OpenTDB" },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "OpenTDB returned non-200" },
      { status: 502 },
    );
  }

  const data: {
    response_code: number;
    results: unknown[];
  } = await res.json();

  if (data.response_code !== 0 || !data.results?.length) {
    return NextResponse.json(
      { error: "OpenTDB returned no questions", code: data.response_code },
      { status: 502 },
    );
  }

  // Sort by difficulty so easier questions come first (progressive)
  const questions = data.results
    .map((raw) => {
      try {
        return transformQuestion(raw as Parameters<typeof transformQuestion>[0]);
      } catch {
        return null;
      }
    })
    .filter((q): q is TransformedQuestion => q !== null)
    .sort((a, b) => a.d - b.d);

  dailyCache.set(today, questions);

  return NextResponse.json({ questions });
}
