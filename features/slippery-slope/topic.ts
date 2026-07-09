import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { categoryDisplayName } from "./topic-hint";

const BATCH_SIZE = 15;
const MAX_CONCURRENT_BATCHES = 2;

const batchTopicsSchema = z.object({
  topics: z.array(
    z.object({
      id: z.string(),
      topic: z.string().min(2).max(60),
    }),
  ),
});

const topicCache = new Map<string, string>();

function cacheKey(category: string, questionId: string): string {
  return `${category}:${questionId}`;
}

function needsAiTopic(category: string): boolean {
  return category !== "general" && category !== "random";
}

function buildBatchPrompt(
  category: string,
  questions: Array<{ id: string; q: string }>,
): { system: string; user: string } {
  const categoryName = categoryDisplayName(category);
  const lines = questions.map((q, i) => `${i + 1}. [${q.id}] ${q.q}`);

  return {
    system: [
      "You label trivia questions with a specific sub-topic for a wagering game.",
      `The game category is "${categoryName}".`,
      "For each question, return a short, specific topic label (2-5 words) that tells a player what niche the question is about.",
      "Examples for Sports: NBA, Olympic Swimming, Premier League, Formula 1.",
      "Examples for Movies: 80s Action Films, Disney Animation, Horror Classics.",
      "Be specific to the question content, not the broad category.",
      "Do not repeat the broad category name alone.",
      "Return JSON only.",
    ].join(" "),
    user: [
      `Categorize these ${categoryName} trivia questions:`,
      ...lines,
      "",
      "Return one topic per question id.",
    ].join("\n"),
  };
}

async function categorizeBatch(
  category: string,
  questions: Array<{ id: string; q: string }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!questions.length) return result;

  const prompt = buildBatchPrompt(category, questions);

  try {
    const ai = await generateJson({
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      schema: batchTopicsSchema,
      schemaName: "trivia_topics_batch",
      maxOutputTokens: Math.min(2048, 64 + questions.length * 32),
      timeoutMs: 12_000,
    });

    for (const entry of ai.topics) {
      const topic = entry.topic.trim();
      if (!topic) continue;
      result.set(entry.id, topic);
      topicCache.set(cacheKey(category, entry.id), topic);
    }
  } catch (err) {
    console.warn("[slippery-slope/topic] batch categorization failed:", err);
  }

  return result;
}

async function runBatches<T, R>(
  items: T[],
  batchSize: number,
  maxConcurrent: number,
  fn: (batch: T[]) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize * maxConcurrent) {
    const wave = [];
    for (let j = 0; j < maxConcurrent; j++) {
      const start = i + j * batchSize;
      const batch = items.slice(start, start + batchSize);
      if (batch.length) wave.push(fn(batch));
    }
    results.push(...(await Promise.all(wave)));
  }
  return results;
}

export interface TopicEnrichableQuestion {
  id?: string;
  q: string;
  cat: string;
  topic?: string;
}

/** Attach AI sub-topics to questions for category-specific games. */
export async function enrichQuestionsWithTopics<T extends TopicEnrichableQuestion>(
  questions: T[],
  category: string,
): Promise<T[]> {
  if (!needsAiTopic(category) || !questions.length) {
    return questions.map((q) => ({
      ...q,
      topic: q.topic ?? q.cat,
    }));
  }

  const uncached: Array<{ id: string; q: string }> = [];
  const prefilled = new Map<string, string>();

  for (const q of questions) {
    const id = q.id ?? q.q;
    if (q.topic) {
      prefilled.set(id, q.topic);
      topicCache.set(cacheKey(category, id), q.topic);
      continue;
    }
    const cached = topicCache.get(cacheKey(category, id));
    if (cached) {
      prefilled.set(id, cached);
      continue;
    }
    uncached.push({ id, q: q.q });
  }

  const batchResults = await runBatches(
    uncached,
    BATCH_SIZE,
    MAX_CONCURRENT_BATCHES,
    (batch) => categorizeBatch(category, batch),
  );

  const fresh = new Map<string, string>();
  for (const batch of batchResults) {
    for (const [id, topic] of batch) {
      fresh.set(id, topic);
    }
  }

  const fallback = categoryDisplayName(category);

  return questions.map((q) => {
    const id = q.id ?? q.q;
    const topic =
      q.topic ??
      prefilled.get(id) ??
      fresh.get(id) ??
      fallback;
    return { ...q, topic };
  });
}
