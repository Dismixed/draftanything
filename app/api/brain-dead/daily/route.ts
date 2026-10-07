import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getDailyQuestions } from "@/lib/brain-dead/daily-service";
import { createAdminClient } from "@/lib/supabase/admin";

const ONE_DAY_SECONDS = 60 * 60 * 24;

/**
 * The stored set never changes once written, so caching it is only a speed
 * win. A failed build throws rather than returning an error object, so the
 * failure is not cached for the rest of the day.
 */
function getCachedDailyQuestions(today: string) {
  return unstable_cache(
    async () => getDailyQuestions(createAdminClient(), today),
    ["brain-dead-daily", today],
    {
      revalidate: ONE_DAY_SECONDS,
      tags: [`brain-dead-daily-${today}`],
    },
  )();
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const questions = await getCachedDailyQuestions(today);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Failed to load the Brain Dead daily:", err);
    return NextResponse.json({ error: "No questions available" }, { status: 502 });
  }
}
