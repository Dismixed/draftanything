import type { RubricCategory } from "../fallback";
import { resolveJudgePersonality } from "./personalities";

export interface BuildJudgePromptInput {
  topic: string;
  personality: string;
  customJudgePrompt?: string | null;
  rubric: RubricCategory[];
  rosters: Array<{
    playerId: string;
    displayName: string;
    picks: Array<{
      pickId: string;
      itemId: string;
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
}

export const JUDGE_PROMPT_VERSION = "1.2.0";

export function buildJudgePrompt(
  input: BuildJudgePromptInput,
): { system: string; user: string } {
  const hasRubric = input.rubric.length > 0;
  const rubricLines = input.rubric.map(
    (c) => `  ${c.key}: weight ${c.weight}%`,
  );

  const rostersText = input.rosters
    .map((r) => {
      const picksText = r.picks
        .map(
          (p) =>
            `    Pick #${p.overallPick} [pickId=${p.pickId}, itemId=${p.itemId}]: ${p.itemName} (${Object.entries(p.metadata)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")})`,
        )
        .join("\n");
      return `  ${r.displayName} [playerId=${r.playerId}]:\n${picksText}`;
    })
    .join("\n");

  const defensesText = input.defenses
    .map((d) => {
      const player = input.rosters.find((r) => r.playerId === d.playerId);
      const name = player?.displayName ?? "Unknown";
      if (d.skipped) {
        return `  ${name} [playerId=${d.playerId}]: (skipped defense)`;
      }
      return `  ${name} [playerId=${d.playerId}]: ${d.defenseText ?? "(no defense)"}`;
    })
    .join("\n");

  const personalityPrompt = resolveJudgePersonality(
    input.personality,
    input.customJudgePrompt,
  );

  return {
    system: [
      "You are an AI judge for a themed draft game.",
      `Personality: ${personalityPrompt}`,
      `Topic: ${input.topic}`,
      "",
      "Evaluate each player's roster and defense, then produce a structured judgment.",
      "",
      ...(hasRubric
        ? [
            "Rubric categories and weights:",
            ...rubricLines,
            "",
            "For each category, assign 0-10 per player, then compute a weighted overall score (0-10).",
          ]
        : [
            "There is no locked rubric for this draft. Judge purely on topic fit, creativity, and roster coherence using the pick names provided.",
            "Assign each player an overall score from 0-10 and leave categories empty.",
          ]),
      "Rank players by overall score (highest first).",
      "Select winner(s): highest score — use ties ONLY if scores are exactly equal.",
      "Awards: choose the single best pick, worst pick, and biggest steal from across ALL picks.",
      "The biggest steal compares pick quality relative to draft position.",
      "",
      "Response format: JSON with keys:",
      hasRubric
        ? "  playerScores: [{ playerId, overall: 0-10, categories: [{ key: categoryKey, value: 0-10 }] }]"
        : "  playerScores: [{ playerId, overall: 0-10, categories: [] }]",
      "  ranking: [playerId, ...] (sorted descending by overall score)",
      "  winnerPlayerIds: [playerId, ...] (one or more if tied)",
      "  awards: { bestPick: { pickId, itemId, playerId }, worstPick: { ... }, biggestSteal: { ... } }",
      "  explanation: string (1-3 sentences)",
      "",
      "Use the exact playerId, pickId, and itemId values from the input. Score every listed player.",
    ].join("\n"),
    user: [
      "Evaluate these rosters and defenses:",
      "",
      "Players to score (use these exact playerId values):",
      ...input.rosters.map((r) => `  - ${r.displayName}: ${r.playerId}`),
      "",
      "Rosters:",
      rostersText,
      "",
      "Defenses:",
      defensesText,
    ].join("\n"),
  };
}
