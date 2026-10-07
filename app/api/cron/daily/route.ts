import { createAdminClient } from "@/lib/supabase/admin";
import { generateAll } from "@/lib/anyguessr/generator";
import { getDailyPuzzle as buildAnyGuessr } from "@/lib/anyguessr/puzzle-service";
import { scheduleDailyCategory as scheduleBallKnowledge } from "@/lib/ball-knowledge/schedule-service";
import { getDailyQuestions as buildBrainDead } from "@/lib/brain-dead/daily-service";
import { topUpDailyChains } from "@/lib/chainlink/top-up";
import { runJobs } from "@/lib/cron/run-jobs";
import { generatePuzzleBundles } from "@/lib/freezeframes/generator";
import {
  countUnscheduledApproved as freezeFramesQueue,
  scheduleDailyPuzzle as scheduleFreezeFrames,
} from "@/lib/freezeframes/schedule-service";
import { scheduleDailyPuzzle as scheduleGettingWarmer } from "@/lib/getting-warmer/schedule-service";
import { scheduleDailyCategory as scheduleHotTakes } from "@/lib/hot-takes/schedule-service";

export const maxDuration = 300;

/** A game with fewer unused days of content than this is flagged in the report. */
const LOW_QUEUE_DAYS = 7;

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
 * question sets are fetched and stored a day ahead. FreezeFrames reports how
 * many unused days of content remain and is flagged when that runs low.
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

  /** Days of never-used content left; logged when low so a dry queue is seen coming. */
  const queueDepth = (game: string, unusedDays: number) => {
    const low = unusedDays < LOW_QUEUE_DAYS;
    if (low) console.warn(`[cron/daily] ${game} has ${unusedDays} unused day(s) of content left`);
    return { unusedDays, low };
  };

  const report = await runJobs({
    chainlink: () => topUpDailyChains(db),
    // Store today's and tomorrow's lineups before rebuilding puzzles, so the
    // rebuild can only affect days that do not exist yet.
    anyguessr: async () => {
      const stored = {
        today: (await buildAnyGuessr(db, today))?.rounds.length ?? 0,
        tomorrow: (await buildAnyGuessr(db, tomorrow))?.rounds.length ?? 0,
      };
      const generate = await generateAll(db);
      return { stored, generated: `${generate.succeeded}/${generate.total}` };
    },
    freezeframes: async () => {
      // Approved clips become puzzles here, so approving them is the only manual step.
      const bundled = (await generatePuzzleBundles(db, { maxBundles: 50 })).bundlesCreated;
      const scheduled = await todayAndTomorrow((date) => scheduleFreezeFrames(db, date))();
      return { bundled, ...scheduled, ...queueDepth("freezeframes", await freezeFramesQueue(db)) };
    },
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
