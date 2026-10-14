import { z } from "zod/v4";
import { introCount } from "@/lib/daily-intro/count-service";
import { DAILY_GAMES } from "@/lib/games/registry";
import { getDateString } from "@/lib/streak/date";
import { createAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({ game: z.enum(DAILY_GAMES) });

/** Today's player count for a game's intro. Shared through the CDN for a minute. */
export async function GET(request: Request): Promise<Response> {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });

  try {
    const count = await introCount(createAdminClient(), parsed.data.game, getDateString());
    return Response.json(
      { count },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    // The intro falls back to its line without a number.
    console.error("Could not count today's players:", err);
    return Response.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}
