import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  fetchQuestionsByDifficulty,
  type ApiDifficulty,
  type TransformedQuestion,
} from "./trivia-api";

/** Every daily has the same mix, so every day has the same maximum score. */
const TIERS: ApiDifficulty[] = ["easy", "medium", "hard"];
const QUESTIONS_PER_TIER = 5;

/** API batches requested per tier before giving up on it. */
const MAX_TIER_FETCHES = 3;

/** A question stays out of the daily for this many days after it runs. */
const RECENT_DAYS = 30;

/** Best possible points for one question: base plus the full speed bonus. */
const MAX_POINTS_PER_DIFFICULTY = 150;

type FetchTier = (difficulty: ApiDifficulty) => Promise<TransformedQuestion[]>;

/**
 * Picks the day's questions: five per difficulty, easiest first, none from
 * `recentIds`. `fetchTier` returns a random batch for one difficulty.
 */
export async function buildDailySet(
  fetchTier: FetchTier,
  recentIds: ReadonlySet<string>,
): Promise<TransformedQuestion[]> {
  const set: TransformedQuestion[] = [];
  const used = new Set(recentIds);

  for (const tier of TIERS) {
    const picked: TransformedQuestion[] = [];
    for (let attempt = 0; attempt < MAX_TIER_FETCHES && picked.length < QUESTIONS_PER_TIER; attempt++) {
      for (const question of await fetchTier(tier)) {
        if (used.has(question.id)) continue;
        used.add(question.id);
        picked.push(question);
        if (picked.length === QUESTIONS_PER_TIER) break;
      }
    }
    if (picked.length < QUESTIONS_PER_TIER) {
      throw new Error(`Only found ${picked.length} unused ${tier} questions for the daily`);
    }
    set.push(...picked);
  }

  return set;
}

export function maxDailyScore(questions: ReadonlyArray<{ d: number }>): number {
  return questions.reduce((sum, question) => sum + question.d * MAX_POINTS_PER_DIFFICULTY, 0);
}

async function loadStoredSet(
  db: SupabaseClient<Database>,
  date: string,
): Promise<TransformedQuestion[] | null> {
  const { data, error } = await db
    .from("brain_dead_daily")
    .select("questions")
    .eq("play_date", date)
    .maybeSingle();
  if (error) throw new Error(`Failed to load the daily: ${error.message}`);
  return data ? (data.questions as unknown as TransformedQuestion[]) : null;
}

async function loadRecentQuestionIds(
  db: SupabaseClient<Database>,
  date: string,
): Promise<Set<string>> {
  const since = new Date(`${date}T12:00:00Z`);
  since.setUTCDate(since.getUTCDate() - RECENT_DAYS);

  const { data, error } = await db
    .from("brain_dead_daily")
    .select("questions")
    .gte("play_date", since.toISOString().slice(0, 10))
    .lt("play_date", date);
  if (error) throw new Error(`Failed to load recent dailies: ${error.message}`);

  const ids = new Set<string>();
  for (const row of data ?? []) {
    for (const question of row.questions as unknown as TransformedQuestion[]) ids.add(question.id);
  }
  return ids;
}

/**
 * The questions for `date`. The first caller builds the set and stores it;
 * the stored row is what makes it the same for every player, whatever
 * happens to caches or deploys during the day.
 */
export async function getDailyQuestions(
  db: SupabaseClient<Database>,
  date: string,
): Promise<TransformedQuestion[]> {
  const stored = await loadStoredSet(db, date);
  if (stored) return stored;

  const questions = await buildDailySet(
    fetchQuestionsByDifficulty,
    await loadRecentQuestionIds(db, date),
  );

  const { error } = await db
    .from("brain_dead_daily")
    .insert({ play_date: date, questions: questions as unknown as Json });
  // Another request stored the date first; everyone gets theirs.
  if (error?.code === "23505") {
    const winner = await loadStoredSet(db, date);
    if (winner) return winner;
  }
  if (error) throw new Error(`Failed to store the daily: ${error.message}`);

  return questions;
}
