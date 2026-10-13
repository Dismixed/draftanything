import { z } from "zod/v4";
import { ensureGuestSession, requireGuestSession } from "@/features/guest/session";
import {
  dayCounts,
  findOwnScore,
  recordFinish,
  scoreBounds,
  type FinishPlayer,
} from "@/lib/games/daily-finish-service";
import { COMPETITIVE_GAMES, DIRECTION, percentileFor, type CompetitiveGameId } from "@/lib/games/percentile";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDateString } from "@/lib/streak/date";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Schema-level ceiling; each game's real limits are checked against `scoreBounds`. */
const SCORE_CEILING = 100_000;

const postSchema = z.object({
  game: z.enum(COMPETITIVE_GAMES),
  score: z.number().int().min(0).max(SCORE_CEILING),
});

const getSchema = z.object({
  game: z.enum(COMPETITIVE_GAMES),
  score: z
    .string()
    .regex(/^\d{1,6}$/)
    .transform(Number),
});

const invalid = () => Response.json({ error: "INVALID_INPUT" }, { status: 400 });

function rateLimited(key: string, max: number): Response | null {
  const result = checkRateLimit(key, max, 60 * 1000);
  if (result.allowed) return null;
  return Response.json(
    { error: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } },
  );
}

/** First hop of `x-forwarded-for`, else `x-real-ip`, else "unknown". */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

async function signedInUserId(): Promise<string | null> {
  const supa = await createClient();
  const { data } = await supa.auth.getUser();
  return data.user?.id ?? null;
}

/** `record` stores the finish first (the game just ended); otherwise this only reads. */
async function answer(game: CompetitiveGameId, score: number, player: FinishPlayer, record: boolean): Promise<Response> {
  try {
    const db = createAdminClient();
    const playDate = getDateString();

    const bounds = await scoreBounds(db, game, playDate);
    if (score < bounds.min || score > bounds.max) return invalid();

    // A player's first finish of the day is the one that counts, so a repeat post is
    // answered for the stored score, not the one just sent.
    const counted = record ? await recordFinish(db, game, playDate, score, player) : score;
    const ownCounted = record || (await findOwnScore(db, game, playDate, player)) !== null;
    const counts = await dayCounts(db, game, playDate, counted, DIRECTION[game]);

    return Response.json({
      ...percentileFor({ game, score: counted, max: bounds.max, total: counts.total, worse: counts.worse, ownCounted }),
      max: bounds.max,
    });
  } catch (err) {
    // The finish screen shows the result without the curve when this fails.
    console.error("Could not work out a daily percentile:", err);
    return Response.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const limited =
    rateLimited(`daily-finish-post:${clientKey(request)}`, 20) ?? rateLimited("daily-finish-post", 300);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return invalid();

  const userId = await signedInUserId();
  let guestId: string | null = null;
  if (!userId) {
    try {
      guestId = (await ensureGuestSession()).guestId;
    } catch {
      return Response.json({ error: "INVALID_GUEST_SESSION" }, { status: 400 });
    }
  }

  return answer(parsed.data.game, parsed.data.score, { userId, guestId }, true);
}

export async function GET(request: Request) {
  const limited =
    rateLimited(`daily-finish-get:${clientKey(request)}`, 60) ?? rateLimited("daily-finish-get", 600);
  if (limited) return limited;

  const parsed = getSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return invalid();

  const userId = await signedInUserId();
  let guestId: string | null = null;
  if (!userId) {
    try {
      guestId = (await requireGuestSession()).guestId;
    } catch {
      // No guest session yet. Reading a percentile is not a reason to create one.
    }
  }

  return answer(parsed.data.game, parsed.data.score, { userId, guestId }, false);
}
