import type { RubricCategory } from "../fallback";

export interface BuildJudgePromptInput {
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
}

export const JUDGE_PROMPT_VERSION = "1.0.0";

export function buildJudgePrompt(
  input: BuildJudgePromptInput,
): { system: string; user: string } {
  const rubricLines = input.rubric.map(
    (c) => `  ${c.key}: weight ${c.weight}%`,
  );

  const rostersText = input.rosters
    .map((r) => {
      const picksText = r.picks
        .map(
          (p) =>
            `    Pick #${p.overallPick}: ${p.itemName} (${Object.entries(p.metadata)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")})`,
        )
        .join("\n");
      return `  ${r.displayName}:\n${picksText}`;
    })
    .join("\n");

  const defensesText = input.defenses
    .map((d) => {
      const player = input.rosters.find((r) => r.playerId === d.playerId);
      const name = player?.displayName ?? "Unknown";
      if (d.skipped) {
        return `  ${name}: (skipped defense)`;
      }
      return `  ${name}: ${d.defenseText ?? "(no defense)"}`;
    })
    .join("\n");

  return {
    system: [
      "You are an AI judge for a themed draft game.",
      `Personality: ${input.personality}.`,
      `Topic: ${input.topic}`,
      "",
      "Evaluate each player's roster and defense, then produce a structured judgment.",
      "",
      "Rubric categories and weights:",
      ...rubricLines,
      "",
      "For each category, assign 0-10 per player, then compute a weighted overall score (0-10).",
      "Rank players by overall score (highest first).",
      "Select winner(s): highest score — use ties ONLY if scores are exactly equal.",
      "Awards: choose the single best pick, worst pick, and biggest steal from across ALL picks.",
      "The biggest steal compares pick quality relative to draft position.",
      "",
      "Response format: JSON with keys:",
      "  playerScores: { [playerId]: { overall: 0-10, categories: { [categoryKey]: 0-10 } } }",
      "  ranking: [playerId, ...] (sorted descending by overall score)",
      "  winnerPlayerIds: [playerId, ...] (one or more if tied)",
      "  awards: { bestPick: { pickId, itemId, playerId }, worstPick: { ... }, biggestSteal: { ... } }",
      "  explanation: string (1-3 sentences)",
    ].join("\n"),
    user: [
      "Evaluate these rosters and defenses:",
      "",
      "Rosters:",
      rostersText,
      "",
      "Defenses:",
      defensesText,
    ].join("\n"),
  };
}
