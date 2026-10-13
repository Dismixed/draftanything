import { getAnswerBank } from "./answer-banks";
import { normKey } from "./normalize";

/**
 * Answers on the category's curated list that the player never named, in list
 * order. Null when the category has no list. The list is not exhaustive: the
 * judge also accepts correct answers that are not on it.
 */
export function getMissedAnswers(
  category: string,
  accepted: string[],
): string[] | null {
  const bank = getAnswerBank(category);
  if (!bank) return null;
  const got = new Set(accepted.map((a) => normKey(a)));
  return bank
    .filter((entry) => ![...entry.aliases].some((alias) => got.has(alias)))
    .map((entry) => entry.canonical);
}
