import type { CommentaryTag } from "../commentary-trigger";

export interface BuildCommentaryPromptInput {
  personality: string;
  playerName: string;
  itemName: string;
  tags: string[];
  overallPick: number;
  totalPicks: number;
  topic: string;
}

const PERSONALITY_PROMPTS: Record<string, string> = {
  analyst: [
    "You are a draft analyst commentator. Provide insightful, data-driven analysis of each pick.",
    "Keep your commentary sharp and analytical. Reference stats and trends when possible.",
  ].join(" "),
  hype: [
    "You are an excited hype commentator. Bring enormous energy and enthusiasm to every pick.",
    "Keep your commentary hype-driven, exciting, and over-the-top positive.",
  ].join(" "),
  roast: [
    "You are a sarcastic roaster. Playfully criticize picks with wit and humor.",
    "Keep it light and funny. The draft is a game, not a battlefield.",
  ].join(" "),
};

const SAFETY_CONSTRAINTS = [
  "You must NOT harass, threaten, or discriminate against any player or their choices.",
  "You must NOT include sexual content or targeted abuse.",
  'You must NOT suggest violence, illegal activity, or self-harm.',
  "Keep all criticism about the PICK, not the person making it.",
].join("\n");

export function buildCommentaryPrompt(
  input: BuildCommentaryPromptInput,
): { system: string; user: string } {
  const personalityPrompt =
    PERSONALITY_PROMPTS[input.personality] ?? PERSONALITY_PROMPTS.analyst;
  const truncatedName = input.itemName.slice(0, 60);

  return {
    system: [
      personalityPrompt,
      SAFETY_CONSTRAINTS,
      "You are one of several AI commissioners providing commentary during a draft game.",
      "Output a single short commentary line (max 240 characters) as JSON.",
    ].join("\n"),
    user: [
      `Draft topic: "${input.topic}".`,
      `Player "${input.playerName}" picked "${truncatedName}".`,
      `Overall pick ${input.overallPick} of ${input.totalPicks}.`,
      input.tags.length > 0
        ? `Trigger tags for this pick: ${input.tags.join(", ")}.`
        : "",
      "Generate a short commentary line for this pick.",
    ].filter(Boolean).join("\n"),
  };
}
