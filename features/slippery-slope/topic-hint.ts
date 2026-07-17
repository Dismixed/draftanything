import { CATS } from "@/components/slippery-slope/data";

export interface TopicHintQuestion {
  cat: string;
  topic?: string;
}

export function categoryDisplayName(categoryId: string): string {
  return CATS.find((c) => c.id === categoryId)?.name ?? categoryId;
}

/**
 * Map a Slippery Slope game category to a Trivia API fetch category.
 * General (and random) omit the filter so questions come from every category;
 * the wager UI then shows each question's own category via resolveWagerTopicHint.
 */
export function resolveSsFetchCategory(category: string): string | null {
  if (category === "general" || category === "random") return null;
  return category;
}

/** Topic shown during the wager phase before the question is revealed. */
export function resolveWagerTopicHint(
  gameCategory: string,
  question: TopicHintQuestion,
): string {
  if (gameCategory === "general" || gameCategory === "random") {
    return question.cat;
  }
  return question.topic ?? categoryDisplayName(gameCategory);
}
