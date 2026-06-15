import "server-only";

import { z } from "zod/v4";
import { zodTextFormat } from "openai/helpers/zod";
import OpenAI from "openai";

import { buildJudgePrompt, JUDGE_PROMPT_VERSION } from "./prompts/judge";
import { fallbackJudge } from "./fallback";
import type {
  RubricCategory,
  RosterPick,
} from "./fallback";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

const categoryScoreSchema = z.object({
  overall: z.number().min(0).max(10),
  categories: z.record(z.string(), z.number().min(0).max(10)),
});

const awardReferenceSchema = z.object({
  pickId: z.string(),
  itemId: z.string(),
  playerId: z.string(),
});

const judgeOutputSchema = z.object({
  playerScores: z.record(z.string(), categoryScoreSchema),
  ranking: z.array(z.string()),
  winnerPlayerIds: z.array(z.string()).min(1),
  awards: z.object({
    bestPick: awardReferenceSchema,
    worstPick: awardReferenceSchema,
    biggestSteal: awardReferenceSchema,
  }),
  explanation: z.string().min(1).max(4000),
});

export type JudgeOutput = z.infer<typeof judgeOutputSchema>;

export interface JudgeInput {
  topic: string;
  personality: string;
  rubric: RubricCategory[];
  rosters: Array<{
    playerId: string;
    displayName: string;
    picks: Array<{
      itemName: string;
      metadata: Record<string, number>;
      overallPick: number;
    }>;
  }>;
  defenses: Array<{
    playerId: string;
    defenseText: string | null;
    skipped: boolean;
  }>;
  picks: readonly RosterPick[];
  playerIds: readonly string[];
}

export interface AwardRef {
  pickId: string;
  itemId: string;
  playerId: string;
}

export interface JudgeResult {
  source: "ai" | "fallback";
  playerScores: Record<string, { overall: number; categories: Record<string, number> }>;
  ranking: string[];
  winnerPlayerIds: string[];
  awards: { bestPick: AwardRef; worstPick: AwardRef; biggestSteal: AwardRef };
  explanation: string;
  model: string | null;
  promptVersion: string;
  idempotencyKey: string;
}

export function validateJudgeOutput(
  output: unknown,
  playerIds: readonly string[],
  rubric: readonly RubricCategory[],
): JudgeOutput {
  const parsed = judgeOutputSchema.parse(output);

  const playerSet = new Set(playerIds);
  const outputPlayerIds = Object.keys(parsed.playerScores);

  // Every active player must appear in scores
  for (const pid of playerIds) {
    if (!outputPlayerIds.includes(pid)) {
      throw new Error(`missing score for player ${pid}`);
    }
  }

  // No extra player IDs in scores
  for (const pid of outputPlayerIds) {
    if (!playerSet.has(pid)) {
      throw new Error(`unexpected player ${pid} in scores`);
    }
  }

  // Category scores must use locked rubric keys
  const rubricKeys = rubric.map((r) => r.key);
  for (const [, score] of Object.entries(parsed.playerScores)) {
    const cats = Object.keys(score.categories);
    if (cats.length !== rubricKeys.length || !rubricKeys.every((k) => cats.includes(k))) {
      throw new Error("category scores must match rubric keys exactly");
    }
  }

  // Winners must reference real players
  for (const winnerId of parsed.winnerPlayerIds) {
    if (!playerSet.has(winnerId)) {
      throw new Error(`winner ${winnerId} is not an active player`);
    }
  }

  // Ranking must contain all players
  if (parsed.ranking.length !== playerIds.length) {
    throw new Error("ranking must contain all active players");
  }
  for (const pid of parsed.ranking) {
    if (!playerSet.has(pid)) {
      throw new Error(`ranking contains non-player ${pid}`);
    }
  }

  // Winners must be the top of the ranking
  const topScore = parsed.playerScores[parsed.ranking[0]].overall;
  const topPlayers = parsed.ranking.filter(
    (pid) => parsed.playerScores[pid].overall === topScore,
  );
  if (
    parsed.winnerPlayerIds.length !== topPlayers.length ||
    !parsed.winnerPlayerIds.every((wid) => topPlayers.includes(wid))
  ) {
    throw new Error("winners must match the top of the ranking");
  }

  // Awards must reference valid players
  for (const award of [parsed.awards.bestPick, parsed.awards.worstPick, parsed.awards.biggestSteal]) {
    if (!playerSet.has(award.playerId)) {
      throw new Error(`award references non-player ${award.playerId}`);
    }
  }

  return parsed;
}

function generateIdempotencyKey(): string {
  return `judge-${crypto.randomUUID()}`;
}

export async function judgeRosters(input: JudgeInput): Promise<JudgeResult> {
  const idempotencyKey = generateIdempotencyKey();

  const prompt = buildJudgePrompt({
    topic: input.topic,
    personality: input.personality,
    rubric: input.rubric,
    rosters: input.rosters,
    defenses: input.defenses,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = getClient();
      const response = await client.responses.create(
        {
          model: MODEL,
          input: [
            { role: "system", content: [{ type: "input_text", text: prompt.system }] },
            { role: "user", content: [{ type: "input_text", text: prompt.user }] },
          ],
          text: { format: zodTextFormat(judgeOutputSchema, "judge_output") },
          reasoning: { effort: "low" },
          max_output_tokens: 4096,
        },
        { signal: AbortSignal.timeout(TIMEOUT_MS) },
      );

      const raw = response.output_text;
      if (!raw) {
        throw new Error("AI returned empty response");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("AI returned invalid JSON");
      }

      const validated = validateJudgeOutput(parsed, input.playerIds, input.rubric);

      return {
        source: "ai",
        playerScores: validated.playerScores,
        ranking: validated.ranking,
        winnerPlayerIds: validated.winnerPlayerIds,
        awards: validated.awards,
        explanation: validated.explanation,
        model: response.model ?? MODEL,
        promptVersion: JUDGE_PROMPT_VERSION,
        idempotencyKey,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        continue;
      }
    }
  }

  // Fallback: compute deterministic judgment
  const fallbackResult = fallbackJudge(input.playerIds, input.picks, input.rubric);

  const fallbackScores: Record<string, { overall: number; categories: Record<string, number> }> = {};
  for (const pid of input.playerIds) {
    fallbackScores[pid] = {
      overall: fallbackResult.rosterScores[pid],
      categories: {},
    };
  }

  const ranking = [...input.playerIds].sort(
    (a, b) => (fallbackResult.rosterScores[b] ?? 0) - (fallbackResult.rosterScores[a] ?? 0),
  );

  return {
    source: "fallback",
    playerScores: fallbackScores,
    ranking,
    winnerPlayerIds: fallbackResult.winnerIds,
    awards: fallbackResult.awards,
    explanation: `Fallback judgment after AI ${lastError ? lastError.message : "failure"}.`,
    model: null,
    promptVersion: JUDGE_PROMPT_VERSION,
    idempotencyKey,
  };
}
