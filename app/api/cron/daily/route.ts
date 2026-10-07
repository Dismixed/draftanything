import { createAdminClient } from "@/lib/supabase/admin";
import { generateAll, scheduleDailyPuzzle as scheduleAnyGuessr } from "@/lib/anyguessr/generator";
import { scheduleDailyCategory as scheduleBallKnowledge } from "@/lib/ball-knowledge/schedule-service";
import { getDailyQuestions as buildBrainDead } from "@/lib/brain-dead/daily-service";
import { topUpDailyChains } from "@/lib/chainlink/top-up";
import { runJobs } from "@/lib/cron/run-jobs";
import { scheduleDailyPuzzle as scheduleFreezeFrames } from "@/lib/freezeframes/schedule-service";
import { scheduleDailyPuzzle as scheduleGettingWarmer } from "@/lib/getting-warmer/schedule-service";
import { scheduleDailyCategory as scheduleHotTakes } from "@/lib/hot-takes/schedule-service";

export const maxDuration = 300;

/**
 * GET /api/cron/daily
 *
 * The one scheduled job for every daily game, invoked by Vercel Cron. Each
 * game gets its own job so a failure in one does not hold up the rest; the
 * response reports every outcome.
 *
 * Games that pick their daily from a stored pool have today's and tomorrow's
 * rows created here, so no visitor triggers the pick. Chain Link is topped up
 * a week ahead because its chains are generated and LLM-checked. Brain Dead's
 * question sets are fetched and stored a day ahead.
 *
 * Security: requires `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  /** Runs a game's own lazy scheduler for today and tomorrow. */
  const todayAndTomorrow =
    <T>(schedule: (date: string) => Promise<T>) =>
    async () => ({ today: await schedule(today), tomorrow: await schedule(tomorrow) });

  const report = await runJobs({
    chainlink: () => topUpDailyChains(db),
    anyguessr: async () => ({ generate: await generateAll(db), daily: await scheduleAnyGuessr(db) }),
    freezeframes: todayAndTomorrow((date) => scheduleFreezeFrames(db, date)),
    "getting-warmer": todayAndTomorrow((date) => scheduleGettingWarmer(db, date)),
    "ball-knowledge": todayAndTomorrow((date) => scheduleBallKnowledge(db, date)),
    "hot-takes": todayAndTomorrow((date) => scheduleHotTakes(db, date)),
    "brain-dead": todayAndTomorrow(async (date) => (await buildBrainDead(db, date)).length),
  });

  const failed = Object.entries(report).filter(([, outcome]) => !outcome.ok);
  for (const [name, outcome] of failed) {
    console.error(`[cron/daily] ${name} failed:`, outcome.ok ? "" : outcome.error);
  }

  return Response.json({ date: today, report }, { status: failed.length > 0 ? 500 : 200 });
}
