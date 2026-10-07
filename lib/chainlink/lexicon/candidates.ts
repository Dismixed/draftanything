/**
 * Candidate two-word links for the Chain Link lexicon, built from corpus
 * counts: single words that split into two ordinary words ("football" →
 * foot + ball) and frequent two-word sequences ("hot dog").
 *
 * Everything here is a cheap pre-filter. Whether a candidate actually reads
 * as a phrase is decided later by the LLM gate.
 */

export type LinkForm = "closed" | "open" | "both";

export interface LinkCandidate {
  word_a: string;
  word_b: string;
  /** Corpus occurrences, summed across the closed and open spellings. */
  count: number;
  form: LinkForm;
}

export interface CandidateOptions {
  /** A half must be among this many most frequent words. */
  maxHalfRank: number;
  /** Minimum corpus count for a closed compound. */
  minClosedCount: number;
  /** An open phrase needs both words to appear in this many closed compounds. */
  minVocabUses: number;
  /** Hand-picked pairs to carry through regardless of the floors above. */
  extraPairs?: ReadonlyArray<readonly [string, string]>;
}

const MAX_HALF_LENGTH = 8;

/** Two-letter words that genuinely form links ("pick up", "black out"). */
const SHORT_WORDS = new Set(["up", "in", "on", "out", "off"]);

const FUNCTION_WORDS = new Set(
  (
    "the of and to a for is that by this with i you it not or be are from at as your all have " +
    "more an was we will can us about if my has but our one other do no they he she his her its " +
    "their them what which who when where how why there here been were would could should than " +
    "then so some any each these those had did does am im into only also very just such most " +
    "may must might shall per him every through upon"
  ).split(" "),
);

/** Prefixes, suffixes and abbreviations that show up as "words" in web text. */
const AFFIX_FRAGMENTS = new Set(
  (
    "non dis inter pro pre sub mis anti semi multi mini micro mega ultra bio geo eco neo tele " +
    "trans uni tri con com ext div reg pol lat spec mil mac nyc phi ver ies est ing ings ion " +
    "ions tion ness ful ment able ible ism ist ity ous ive ize ise ally wards ers ted ess ory " +
    "ary ent des res der ter ber ger ler ner ser mer ana dia epi iso oxy poly mono para meta " +
    "hypo hyper intra extra infra supra"
  ).split(" "),
);

const BLOCKED_WORDS = new Set(
  (
    "sex sexy porn porno nude naked xxx gay lesbian milf milfs teen teens cock cocks pussy fuck " +
    "fucking suck sucking slut sluts whore dildo dildos cum tits boobs ass anal rape nazi " +
    "viagra cialis valium casino poker fetish murder"
  ).split(" "),
);

/** British spellings; the game is American English. */
const NON_AMERICAN_SPELLINGS = new Set(
  "centre colour grey theatre tyre metre favour programme honour labour harbour".split(" "),
);

const BLOCKED_PAIRS = new Set(["strip club"]);

export function parseCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of text.split("\n")) {
    const tab = line.lastIndexOf("\t");
    if (tab <= 0) continue;
    const count = Number(line.slice(tab + 1));
    if (!Number.isFinite(count)) continue;
    counts.set(line.slice(0, tab), count);
  }
  return counts;
}

const isBlockedWord = (word: string) =>
  BLOCKED_WORDS.has(word) || NON_AMERICAN_SPELLINGS.has(word);

function isLinkWord(word: string): boolean {
  if (!/^[a-z]+$/.test(word)) return false;
  if (word.length > MAX_HALF_LENGTH) return false;
  if (word.length < 3 && !SHORT_WORDS.has(word)) return false;
  if (FUNCTION_WORDS.has(word) || AFFIX_FRAGMENTS.has(word)) return false;
  return !isBlockedWord(word);
}

/**
 * Words allowed as either half of a link. `unigrams` must iterate from most
 * to least frequent, as the source file does.
 */
export function buildVocabulary(unigrams: Map<string, number>, maxRank: number): Set<string> {
  const vocab = new Set<string>();
  let rank = 0;
  for (const word of unigrams.keys()) {
    if (rank++ >= maxRank) break;
    if (isLinkWord(word)) vocab.add(word);
  }
  return vocab;
}

export function splitCompound(word: string, vocab: ReadonlySet<string>): [string, string][] {
  const splits: [string, string][] = [];
  for (let i = 2; i <= word.length - 2; i++) {
    const a = word.slice(0, i);
    const b = word.slice(i);
    if (vocab.has(a) && vocab.has(b)) splits.push([a, b]);
  }
  return splits;
}

const pairKey = (a: string, b: string) => `${a} ${b}`;

export function buildCandidates(
  unigrams: Map<string, number>,
  bigrams: Map<string, number>,
  options: CandidateOptions,
): LinkCandidate[] {
  const vocab = buildVocabulary(unigrams, options.maxHalfRank);
  const candidates = new Map<string, LinkCandidate>();
  const uses = new Map<string, number>();

  for (const [word, count] of unigrams) {
    if (count < options.minClosedCount || !/^[a-z]+$/.test(word)) continue;
    for (const [a, b] of splitCompound(word, vocab)) {
      if (a === b) continue;
      candidates.set(pairKey(a, b), { word_a: a, word_b: b, count, form: "closed" });
      uses.set(a, (uses.get(a) ?? 0) + 1);
      uses.set(b, (uses.get(b) ?? 0) + 1);
    }
  }

  for (const [phrase, count] of bigrams) {
    const [a, b, ...rest] = phrase.split(" ");
    if (!a || !b || rest.length > 0 || a === b) continue;
    const existing = candidates.get(phrase);
    if (existing) {
      existing.count += count;
      existing.form = "both";
      continue;
    }
    if ((uses.get(a) ?? 0) < options.minVocabUses) continue;
    if ((uses.get(b) ?? 0) < options.minVocabUses) continue;
    candidates.set(phrase, { word_a: a, word_b: b, count, form: "open" });
  }

  for (const [a, b] of options.extraPairs ?? []) {
    if (a === b || candidates.has(pairKey(a, b))) continue;
    if (isBlockedWord(a) || isBlockedWord(b)) continue;
    const closed = unigrams.get(a + b) ?? 0;
    const open = bigrams.get(pairKey(a, b)) ?? 0;
    const form: LinkForm = closed > 0 ? (open > 0 ? "both" : "closed") : "open";
    candidates.set(pairKey(a, b), { word_a: a, word_b: b, count: closed + open, form });
  }

  return [...candidates.values()]
    .filter((c) => !BLOCKED_PAIRS.has(pairKey(c.word_a, c.word_b)))
    .sort((x, y) => y.count - x.count);
}

/** Drops "fire places" when "fire place" is also a candidate. */
export function dropInflectedDuplicates(candidates: LinkCandidate[]): LinkCandidate[] {
  const keys = new Set(candidates.map((c) => pairKey(c.word_a, c.word_b)));
  return candidates.filter(({ word_a, word_b }) => {
    if (!word_b.endsWith("s")) return true;
    if (keys.has(pairKey(word_a, word_b.slice(0, -1)))) return false;
    return !(word_b.endsWith("es") && keys.has(pairKey(word_a, word_b.slice(0, -2))));
  });
}
