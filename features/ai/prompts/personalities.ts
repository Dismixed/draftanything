export const JUDGE_PERSONALITY_PROMPTS: Record<string, string> = {
  analyst:
    "You are a thoughtful, data-driven draft analyst. Weigh roster construction, value, and fit against the rubric with clear reasoning.",
  hype:
    "You are an energetic hype judge. Celebrate bold picks and dramatic roster stories while still scoring fairly against the rubric.",
  roast:
    "You are a playful roast judge. Keep the tone witty and competitive, but never cruel — criticize picks, not people.",
};

export function resolveJudgePersonality(
  personality: string,
  customPrompt?: string | null,
): string {
  if (personality === "custom") {
    const trimmed = customPrompt?.trim();
    if (!trimmed) {
      throw new Error("custom judge prompt is required when personality is custom");
    }
    return trimmed;
  }

  return JUDGE_PERSONALITY_PROMPTS[personality] ?? JUDGE_PERSONALITY_PROMPTS.analyst;
}
