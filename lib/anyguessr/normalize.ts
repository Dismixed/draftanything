/**
 * Normalize an answer string for fuzzy comparison.
 */
export function normalizeAnswer(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STRIP_PREFIXES = [
  "the ",
  "kingdom of ",
  "republic of ",
  "united states of ",
  "federated states of ",
  "state of ",
];

function stripPrefixes(s: string): string {
  for (const p of STRIP_PREFIXES) {
    if (s.startsWith(p)) return s.slice(p.length);
  }
  return s;
}

export function looseEqual(guess: string, candidate: string): boolean {
  const g = normalizeAnswer(guess);
  const c = normalizeAnswer(candidate);
  if (!g || !c) return false;
  if (g === c) return true;
  return stripPrefixes(g) === stripPrefixes(c);
}
