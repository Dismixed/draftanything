import { z } from "zod/v4";
import { ensureGuestSession } from "@/features/guest/session";
import { dailyDate } from "@/lib/daily-day";
import { legsFor, treasureFor } from "@/lib/dead-reckoning/daily-service";
import { buildFleet, type Fleet } from "@/lib/dead-reckoning/fleet";
import { loadDay, recordPlay, type Player } from "@/lib/dead-reckoning/play-service";
import { LEGS, PAR, grade, voyage, type Guess } from "@/lib/dead-reckoning/scoring";
import { voyageNumber } from "@/lib/dead-reckoning/voyage";
import { getPostHogClient, withRequestIdentity } from "@/lib/posthog-server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const positive = z.number().positive().finite().max(1e15);

const guessSchema = z.union([z.null(), positive]);

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // The seven crossings, then the treasure island's guess if the voyage reached it.
  guesses: z.array(guessSchema).min(LEGS).max(LEGS + 1),
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
 * count and the day's fleet. The days are worked out here from the guesses, the treasure
 * island included when the crossings earned it.
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
  const treasure = treasureFor(date);
  const answers = legs.map((l) => l.answer);
  const posted = parsed.data.guesses as Guess[];
  const crossings = posted.slice(0, LEGS);
  // A treasure guess counts only when the crossings really came in under par.
  const result = voyage(crossings, answers, posted[LEGS], treasure.answer);
  const guesses = result.treasure && posted.length > LEGS ? [...crossings, posted[LEGS]] : crossings;
  let counted = { guesses, days: result.days };
  let real: Guess[][] = [];
  let stored = false;

  try {
    const db = createAdminClient();
    const userId = await signedInUserId();
    const player: Player = { userId, guestId: userId ? null : (await ensureGuestSession()).guestId };
    const play = await recordPlay(db, date, guesses, counted.days, player);
    counted = { guesses: play.guesses, days: play.days };
    stored = true;
    // Once per player per day: the end screen posts again on every reload.
    if (play.created) {
      // The seven crossings only; a treasure guess is scored separately.
      const tiers = crossings.map((g, i) => grade(g, answers[i]).index);
      const posthog = getPostHogClient();
      posthog.capture(
        withRequestIdentity(
          request,
          {
            event: "dead_reckoning_voyage_finished",
            properties: {
              date,
              voyage: voyageNumber(date),
              days: play.days,
              crossing_days: result.crossings,
              par: PAR,
              over_par: play.days - PAR,
              tiers: tiers.join(","),
              // Top tier: within 1% of the answer.
              dead_reckonings: tiers.filter((t) => t === 0).length,
              blanks: crossings.filter((g) => g === null).length,
              treasure_earned: result.treasure,
              treasure_guessed: result.treasure && posted.length > LEGS && posted[LEGS] !== null,
              treasure_days_saved: result.saved,
              signed_in: userId !== null,
            },
          },
          userId ?? player.guestId ?? undefined,
        ),
      );
      await posthog.flush();
    }
    real = await loadDay(db, date);
  } catch (err) {
    console.error("Dead Reckoning could not store or read the day's voyages:", err);
  }

  return Response.json({
    days: counted.days,
    guesses: counted.guesses,
    fleet: compact(buildFleet(date, [...legs, treasure], stored ? real : [])),
  });
}
