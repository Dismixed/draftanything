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
      "Each item must have a name (max 60 chars) and a scores array with a value (0-10) for every rubric category.",
      "The rubric must be an array of 3-6 categories, each with a category name and weight, summing to exactly 100.",
      "Generate unique, interesting, and thematically appropriate items.",
      "Every item name must be distinct — no duplicates, even with different capitalization or punctuation.",
    ].join(" "),
    user: [
      `Generate a pool for the topic: "${input.topic}".`,
      `Target ${input.targetCount} items.`,
      `You must generate at least ${input.targetCount} items.`,
      avoidClause,
    ].filter(Boolean).join("\n"),
  };
}
