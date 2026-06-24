import { NextRequest, NextResponse } from "next/server";
import { transformQuestion, CATEGORY_MAP } from "@/lib/brain-dead/opentdb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const count = Math.min(Number(searchParams.get("count")) || 20, 50);
  const category = searchParams.get("category");
  const token = searchParams.get("token") || "";

  // Build the OpenTDB URL
  const catId = category && CATEGORY_MAP[category] ? CATEGORY_MAP[category] : null;

  let url = `https://opentdb.com/api.php?amount=${count}&type=multiple`;
  if (token) url += `&token=${encodeURIComponent(token)}`;
  if (catId) url += `&category=${catId}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach OpenTDB", questions: [], token },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "OpenTDB returned non-200", questions: [], token },
      { status: 502 },
    );
  }

  const data: {
    response_code: number;
    results: unknown[];
    token?: string;
  } = await res.json();

  let currentToken = data.token ?? token;

  // response_code 3 = token exhausted — reset and retry
  if (data.response_code === 3 && token) {
    try {
      await fetch(
        `https://opentdb.com/api_token.php?command=reset&token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(5_000) },
      );
    } catch {
      // non-fatal — will retry with a fresh token instead
    }

    // Get a fresh token
    try {
      const tokenRes = await fetch(
        "https://opentdb.com/api_token.php?command=request",
        { signal: AbortSignal.timeout(5_000) },
      );
      const tokenData = (await tokenRes.json()) as { token?: string };
      currentToken = tokenData.token ?? "";

      // Retry with fresh token
      let retryUrl = `https://opentdb.com/api.php?amount=${count}&type=multiple&token=${encodeURIComponent(currentToken)}`;
      if (catId) retryUrl += `&category=${catId}`;
      const retryRes = await fetch(retryUrl, { signal: AbortSignal.timeout(10_000) });
      if (retryRes.ok) {
        const retryData = (await retryRes.json()) as {
          response_code: number;
          results: unknown[];
        };
        if (retryData.response_code === 0 && retryData.results?.length) {
          const questions = retryData.results
            .map((raw) => {
              try {
                return transformQuestion(
                  raw as Parameters<typeof transformQuestion>[0],
                );
              } catch {
                return null;
              }
            })
            .filter((q) => q !== null)
            .sort((a, b) => a.d - b.d);
          return NextResponse.json({ questions, token: currentToken });
        }
      }
    } catch {
      // Fall through — return empty
    }

    return NextResponse.json({
      questions: [],
      token: currentToken,
      responseCode: data.response_code,
    });
  }

  if (data.response_code !== 0 || !data.results?.length) {
    return NextResponse.json({
      questions: [],
      token: currentToken,
      responseCode: data.response_code,
    });
  }

  const questions = data.results
    .map((raw) => {
      try {
        return transformQuestion(
          raw as Parameters<typeof transformQuestion>[0],
        );
      } catch {
        return null;
      }
    })
    .filter((q) => q !== null)
    .sort((a, b) => a.d - b.d);

  return NextResponse.json({ questions, token: currentToken });
}
