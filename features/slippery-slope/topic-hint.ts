import { CATS } from "@/components/slippery-slope/data";

export interface TopicHintQuestion {
  cat: string;
  topic?: string;
}

export function categoryDisplayName(categoryId: string): string {
  return CATS.find((c) => c.id === categoryId)?.name ?? categoryId;
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
