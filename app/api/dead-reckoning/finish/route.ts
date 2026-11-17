import { z } from "zod/v4";
import { ensureGuestSession } from "@/features/guest/session";
import { dailyDate } from "@/lib/daily-day";
import { legsFor } from "@/lib/dead-reckoning/daily-service";
import { buildFleet, type Fleet } from "@/lib/dead-reckoning/fleet";
import { loadDay, recordPlay, type Player } from "@/lib/dead-reckoning/play-service";
import { LEGS, totalDays, type Guess } from "@/lib/dead-reckoning/scoring";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const positive = z.number().positive().finite().max(1e15);

const guessSchema = z.union([z.null(), positive]);

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guesses: z.array(guessSchema).length(LEGS),
});

const invalid = (error = "INVALID_INPUT", status = 400) => Response.json({ error }, { status });

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

async function signedInUserId(): Promise<string | null> {
  try {
    const supa = await createClient();
    const { data } = await supa.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Three significant figures is plenty for a histogram, and keeps the response small. */
function compact(fleet: Fleet): Fleet {
  return { ...fleet, guesses: fleet.guesses.map((leg) => leg.map((g) => Number(g.toPrecision(3)))) };
}

/**
 * Records today's voyage (the first one counts) and answers with the days at sea that
 * count and the day's fleet. The days are worked out here from the guesses.
 * If the database can't be reached, the voyage is not stored and the fleet is the
 * estimated one.
 */
export async function POST(request: Request) {
  for (const [key, max] of [[`dr-finish:${clientKey(request)}`, 20], ["dr-finish", 300]] as const) {
    const limit = checkRateLimit(key, max, 60_000);
    if (!limit.allowed) {
      return Response.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return invalid();

  const date = dailyDate();
  // A voyage started before midnight belongs to a day that is over; it is not stored.
  if (parsed.data.date !== date) return invalid("DAY_OVER", 409);

  const legs = legsFor(date);
  const answers = legs.map((l) => l.answer);
  const guesses = parsed.data.guesses as Guess[];
  let counted = { guesses, days: totalDays(guesses, answers) };
  let real: Guess[][] = [];
  let stored = false;

  try {
    const db = createAdminClient();
    const userId = await signedInUserId();
    const player: Player = { userId, guestId: userId ? null : (await ensureGuestSession()).guestId };
    counted = await recordPlay(db, date, guesses, counted.days, player);
    stored = true;
    real = await loadDay(db, date);
  } catch (err) {
    console.error("Dead Reckoning could not store or read the day's voyages:", err);
  }

  return Response.json({
    days: counted.days,
    guesses: counted.guesses,
    fleet: compact(buildFleet(date, legs, stored ? real : [])),
  });
}
