/**
 * The Trivia API utilities for Brain Dead trivia.
 * @see https://the-trivia-api.com/docs/
 */
import type { Difficulty } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TriviaApiTextChoiceQuestion {
  id: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  type: "text_choice";
  question: { text: string };
  correctAnswer: string;
  incorrectAnswers: string[];
}

export interface TransformedQuestion {
  id: string;
  q: string;
  a: string[];
  c: number;
  d: Difficulty;
  cat: string;
}

/* ------------------------------------------------------------------ */
/*  Category mapping                                                   */
/* ------------------------------------------------------------------ */

export const CATEGORY_MAP: Record<string, string> = {
  general: "general_knowledge",
  sports: "sport_and_leisure",
  movies: "film_and_tv",
  music: "music",
  arts: "arts_and_literature",
  science: "science",
  history: "history",
  food: "food_and_drink",
  culture: "society_and_culture",
  geography: "geography",
};

const CATEGORY_LABELS: Record<string, string> = {
  general_knowledge: "General Knowledge",
  sport_and_leisure: "Sports",
  film_and_tv: "Film & TV",
  arts_and_literature: "Arts & Literature",
  history: "History",
  society_and_culture: "Society & Culture",
  science: "Science",
  geography: "Geography",
  food_and_drink: "Food & Drink",
  music: "Music",
};

/* ------------------------------------------------------------------ */
/*  Session deduplication                                              */
/* ------------------------------------------------------------------ */

const MAX_TRACKED_SEEN_IDS = 500;

function mergeSeenIds(
  token: string,
  clientSeenIds: string[] | undefined,
): Set<string> {
  const seen = getOrCreateSeenSet(token);
  for (const id of clientSeenIds ?? []) {
    if (id) seen.add(id);
  }
  return seen;
}

function trimSeenSet(seen: Set<string>): void {
  if (seen.size <= MAX_TRACKED_SEEN_IDS) return;
  const trimmed = [...seen].slice(-MAX_TRACKED_SEEN_IDS);
  seen.clear();
  for (const id of trimmed) seen.add(id);
}

const seenByToken = new Map<string, Set<string>>();

function getOrCreateSeenSet(token: string): Set<string> {
  let seen = seenByToken.get(token);
  if (!seen) {
    seen = new Set();
    seenByToken.set(token, seen);
  }
  return seen;
}

function createToken(): string {
  return crypto.randomUUID();
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mapDifficulty(d: string): Difficulty {
  switch (d) {
    case "easy":
      return 1;
    case "medium":
      return 2;
    case "hard":
      return 3;
    default:
      return 2;
  }
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const DIFFICULTY_ORDER: Difficulty[] = [1, 2, 3, 4];

/** Keep easy → hard progression, but shuffle topics within each tier. */
export function orderQuestionsByDifficulty(
  questions: TransformedQuestion[],
): TransformedQuestion[] {
  const buckets = new Map<Difficulty, TransformedQuestion[]>(
    DIFFICULTY_ORDER.map((d) => [d, []]),
  );

  for (const q of questions) {
    buckets.get(q.d)?.push(q);
  }

  return DIFFICULTY_ORDER.flatMap((d) => shuffleArray(buckets.get(d)!));
}

export function formatCategory(raw: string): string {
  return (
    CATEGORY_LABELS[raw] ??
    raw
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function transformQuestion(
  raw: TriviaApiTextChoiceQuestion,
): TransformedQuestion {
  const answers = [raw.correctAnswer, ...raw.incorrectAnswers];
  const shuffled = shuffleArray(answers);
  const correctIndex = shuffled.indexOf(raw.correctAnswer);

  return {
    id: raw.id,
    q: raw.question.text,
    a: shuffled,
    c: correctIndex,
    d: mapDifficulty(raw.difficulty),
    cat: formatCategory(raw.category),
  };
}

function isTextChoiceQuestion(
  raw: unknown,
): raw is TriviaApiTextChoiceQuestion {
  if (!raw || typeof raw !== "object") return false;
  const q = raw as TriviaApiTextChoiceQuestion;
  return (
    q.type === "text_choice" &&
    typeof q.id === "string" &&
    typeof q.question?.text === "string" &&
    typeof q.correctAnswer === "string" &&
    Array.isArray(q.incorrectAnswers)
  );
}

function parseQuestions(results: unknown[]): {
  questions: TransformedQuestion[];
  ids: string[];
} {
  const questions: TransformedQuestion[] = [];
  const ids: string[] = [];

  for (const raw of results) {
    if (!isTextChoiceQuestion(raw)) continue;
    try {
      questions.push(transformQuestion(raw));
      ids.push(raw.id);
    } catch {
      // skip malformed questions
    }
  }

  return { questions, ids };
}

function apiHeaders(): HeadersInit {
  const key = process.env.TRIVIA_API_KEY?.trim();
  return key ? { "X-API-Key": key } : {};
}

async function fetchRawQuestions(options: {
  limit: number;
  category?: string | null;
}): Promise<{ results: unknown[]; error?: string }> {
  const limit = Math.min(Math.max(options.limit, 1), 50);
  const params = new URLSearchParams({
    limit: String(limit),
    types: "text_choice",
    difficulties: "easy,medium,hard",
  });

  const category = options.category;
  const apiCategory =
    category && CATEGORY_MAP[category] ? CATEGORY_MAP[category] : null;
  if (apiCategory) params.set("categories", apiCategory);

  const url = `https://the-trivia-api.com/v2/questions?${params}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { results: [], error: "Failed to reach The Trivia API" };
  }

  if (!res.ok) {
    return { results: [], error: "The Trivia API returned non-200" };
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0) {
    return { results: [], error: "The Trivia API returned no questions" };
  }

  return { results: data };
}

/* ------------------------------------------------------------------ */
/*  API fetch                                                          */
/* ------------------------------------------------------------------ */

export interface FetchQuestionsResult {
  questions: TransformedQuestion[];
  token: string;
  error?: string;
}

export function appendUniqueQuestions<T extends { id?: string; q: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const seen = new Set(existing.map((q) => q.id ?? q.q));
  const fresh = incoming.filter((q) => !seen.has(q.id ?? q.q));
  return fresh.length ? [...existing, ...fresh] : existing;
}

export async function fetchQuestions(options: {
  count?: number;
  category?: string | null;
  token?: string;
  seenIds?: string[];
}): Promise<FetchQuestionsResult> {
  const count = Math.min(options.count ?? 20, 50);
  const token = options.token?.trim() || createToken();
  const seen = mergeSeenIds(token, options.seenIds);

  const collected: TransformedQuestion[] = [];

  const maxAttempts = seen.size > 100 ? 6 : 3;

  for (let attempt = 0; attempt < maxAttempts && collected.length < count; attempt++) {
    const { results, error } = await fetchRawQuestions({
      limit: 50,
      category: options.category,
    });

    if (error) {
      return {
        questions: collected,
        token,
        error: collected.length ? undefined : error,
      };
    }

    const { questions, ids } = parseQuestions(results);
    for (let i = 0; i < questions.length; i++) {
      const id = ids[i];
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push(questions[i]);
      if (collected.length >= count) break;
    }
    trimSeenSet(seen);
  }

  return {
    questions: orderQuestionsByDifficulty(collected),
    token,
  };
}

export async function fetchDailyQuestions(
  count = 15,
): Promise<{ questions: TransformedQuestion[]; error?: string }> {
  const { results, error } = await fetchRawQuestions({ limit: count });
  if (error) return { questions: [], error };

  const questions = orderQuestionsByDifficulty(parseQuestions(results).questions);

  return { questions };
}
