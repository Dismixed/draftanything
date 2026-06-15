export interface BuildPoolPromptInput {
  topic: string;
  targetCount: number;
  existingItems: string[];
}

export function buildPoolPrompt(input: BuildPoolPromptInput): { system: string; user: string } {
  const avoidClause =
    input.existingItems.length > 0
      ? `\nDo NOT suggest any of these existing items:\n${input.existingItems.map((n) => `  - ${n}`).join("\n")}`
      : "";

  return {
    system: [
      "You are a creative assistant that generates draft pools for themed draft games.",
      "Each item must have a name (max 60 chars) and numeric metadata (0-10) for every rubric category you define.",
      'The rubric must have 3-6 categories with weights summing to exactly 100.',
      "Generate unique, interesting, and thematically appropriate items.",
    ].join(" "),
    user: [
      `Generate a pool for the topic: "${input.topic}".`,
      `Target ${input.targetCount} items.`,
      `You must generate at least ${input.targetCount} items.`,
      avoidClause,
    ].filter(Boolean).join("\n"),
  };
}
