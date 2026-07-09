import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { categoryDisplayName } from "./topic-hint";

const BATCH_SIZE = 8;
const MAX_CONCURRENT_BATCHES = 2;
const MAX_CONCURRENT_SINGLES = 6;

const batchTopicsSchema = z.object({
  topics: z.array(z.string().min(2).max(60)),
});

const singleTopicSchema = z.object({
  topic: z.string().min(2).max(60),
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
  questions: Array<{ q: string }>,
): { system: string; user: string } {
  const categoryName = categoryDisplayName(category);
  const lines = questions.map((q, i) => `${i + 1}. ${q.q}`);

  return {
    system: [
      "You label trivia questions with a specific sub-topic for a wagering game.",
      `The game category is "${categoryName}".`,
      "Return exactly one short, specific topic label (2-5 words) per question, in the same order.",
      "Examples for Sports: NBA, Olympic Swimming, Premier League, Formula 1.",
      "Examples for Movies: 80s Action Films, Disney Animation, Horror Classics.",
      "Be specific to each question's content. Do not use the broad category name alone.",
      "Return JSON only.",
    ].join(" "),
    user: [
      `Categorize these ${categoryName} trivia questions:`,
      ...lines,
      "",
      `Return exactly ${questions.length} topics in a JSON array called "topics".`,
    ].join("\n"),
  };
}

function buildSinglePrompt(
  category: string,
  question: string,
): { system: string; user: string } {
  const categoryName = categoryDisplayName(category);

  return {
    system: [
      "You label a trivia question with a specific sub-topic for a wagering game.",
      `The game category is "${categoryName}".`,
      "Return one short, specific topic label (2-5 words).",
      "Be specific to the question content, not the broad category name alone.",
      "Return JSON only.",
    ].join(" "),
    user: `Question: ${question}`,
  };
}

async function categorizeSingle(
  category: string,
  question: string,
): Promise<string | null> {
  const prompt = buildSinglePrompt(category, question);

  try {
    const ai = await generateJson({
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      schema: singleTopicSchema,
      schemaName: "trivia_topic_single",
      maxOutputTokens: 64,
      timeoutMs: 8_000,
    });
    return ai.topic.trim() || null;
  } catch (err) {
    console.warn("[slippery-slope/topic] single categorization failed:", err);
    return null;
  }
}

async function categorizeBatch(
  category: string,
  questions: Array<{ id: string; q: string }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!questions.length) return result;

  const prompt = buildBatchPrompt(
    category,
    questions.map((q) => ({ q: q.q })),
  );

  try {
    const ai = await generateJson({
      systemPrompt: prompt.system,
      userPrompt: prompt.user,
      schema: batchTopicsSchema,
      schemaName: "trivia_topics_batch",
      maxOutputTokens: Math.min(1024, 32 + questions.length * 24),
      timeoutMs: 15_000,
    });

    if (ai.topics.length !== questions.length) {
      throw new Error(
        `expected ${questions.length} topics, got ${ai.topics.length}`,
      );
    }

    for (let i = 0; i < questions.length; i++) {
      const topic = ai.topics[i]?.trim();
      if (!topic) continue;
      result.set(questions[i].id, topic);
      topicCache.set(cacheKey(category, questions[i].id), topic);
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

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
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
    if (q.topic && q.topic !== categoryDisplayName(category) && q.topic !== q.cat) {
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

  const stillMissing = uncached.filter((q) => !fresh.has(q.id));
  if (stillMissing.length) {
    const singles = await runWithConcurrency(
      stillMissing,
      MAX_CONCURRENT_SINGLES,
      async (q) => {
        const topic = await categorizeSingle(category, q.q);
        return { id: q.id, topic };
      },
    );

    for (const entry of singles) {
      if (!entry.topic) continue;
      fresh.set(entry.id, entry.topic);
      topicCache.set(cacheKey(category, entry.id), entry.topic);
    }
  }

  const fallback = categoryDisplayName(category);

  return questions.map((q) => {
    const id = q.id ?? q.q;
    const topic =
      prefilled.get(id) ??
      fresh.get(id) ??
      q.topic ??
      fallback;
    return { ...q, topic };
  });
}
