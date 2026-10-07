/**
 * The rules every Chain Link chain must pass, wherever it was generated:
 * the phrase-graph generator, LLM proposals and the batch script all check
 * candidates against these.
 */

export type Difficulty = "easy" | "medium" | "hard";

export interface ChainRules {
  /** Lowercase "first second" keys of links a player cannot tell apart. */
  ambiguous: ReadonlySet<string>;
  /** Lowercase "first second" keys of links used in recent dailies. */
  recentLinks: ReadonlySet<string>;
}

/** A chain may contain this many particle words at most. */
export const MAX_PARTICLES = 1;

/**
 * Particles link to almost anything, so chains built from them
 * ("bang > on > off > side > bar") give the player nothing to reason from.
 */
const PARTICLES = new Set(["up", "down", "in", "out", "on", "off", "over", "under", "back"]);

export const linkKey = (first: string, second: string) => `${first} ${second}`.toLowerCase();

/**
 * The player sees the first word plus only the first letter and length of
 * the second, and a guess must match exactly. Two links from the same first
 * word whose second words share that shape ("river boat" / "river bank")
 * cannot be told apart, so neither is safe to use.
 */
export function findAmbiguousLinks(
  links: Iterable<{ word_a: string; word_b: string }>,
): Set<string> {
  const byShape = new Map<string, Set<string>>();
  for (const { word_a, word_b } of links) {
    const second = word_b.toLowerCase();
    const shape = `${word_a.toLowerCase()}|${second[0]}|${second.length}`;
    const seconds = byShape.get(shape) ?? new Set<string>();
    seconds.add(linkKey(word_a, word_b));
    byShape.set(shape, seconds);
  }

  const ambiguous = new Set<string>();
  for (const keys of byShape.values()) {
    if (keys.size < 2) continue;
    for (const key of keys) ambiguous.add(key);
  }
  return ambiguous;
}

const particlesIn = (words: readonly string[]) =>
  words.filter((word) => PARTICLES.has(word.toLowerCase()));

export function countParticles(words: readonly string[]): number {
  return particlesIn(words).length;
}

/** Difficulty follows the weakest link: 8+ easy, 5+ medium, otherwise hard. */
export function classifyDifficulty(linkScores: readonly number[]): Difficulty {
  const weakest = Math.min(...linkScores);
  if (weakest >= 8) return "easy";
  if (weakest >= 5) return "medium";
  return "hard";
}

/** Hard-reject reasons for a chain. Empty means it passes. */
export function chainProblems(words: readonly string[], rules: ChainRules): string[] {
  const problems: string[] = [];
  const lower = words.map((word) => word.toLowerCase());

  const repeated = lower.filter((word, i) => lower.indexOf(word) !== i);
  if (repeated.length > 0) {
    problems.push(`Repeats a word: ${[...new Set(repeated)].join(", ")}.`);
  }

  for (let i = 0; i < lower.length - 1; i++) {
    const key = linkKey(lower[i], lower[i + 1]);
    if (rules.ambiguous.has(key)) {
      problems.push(`"${key}" is ambiguous: another link from "${lower[i]}" has the same first letter and length.`);
    }
    if (rules.recentLinks.has(key)) {
      problems.push(`"${key}" was used in a recent daily.`);
    }
  }

  const particles = particlesIn(lower);
  if (particles.length > MAX_PARTICLES) {
    problems.push(`Uses ${particles.length} particle words (${particles.join(", ")}); the limit is ${MAX_PARTICLES}.`);
  }

  return problems;
}
