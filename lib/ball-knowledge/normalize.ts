import type { CategoryName } from "./categories";
import { getAnswerBank } from "./answer-banks";

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripArticle(s: string): string {
  return s.replace(/^(the|a|an)\s+/, "");
}

export function normKey(s: string): string {
  return stripArticle(normalize(s));
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(
        dp[j]! + 1,
        dp[j - 1]! + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[n]!;
}

export interface BankEntry {
  canonical: string;
  aliases: Set<string>;
}

export function findMatch(
  category: CategoryName | string,
  text: string,
): BankEntry | null {
  const bank = getAnswerBank(category);
  if (!bank) return null;
  const norm = normKey(text);
  if (!norm) return null;

  for (const entry of bank) {
    if (entry.aliases.has(norm)) return entry;
  }

  for (const entry of bank) {
    for (const alias of entry.aliases) {
      if (
        Math.abs(alias.length - norm.length) <= 1 &&
        alias.length >= 4 &&
        levenshtein(alias, norm) <= 1
      ) {
        return entry;
      }
    }
  }

  return null;
}
