import type { RoundKey } from "./types";

/** What a proposal intended to find. */
export interface ExpectedMedia {
  /** Movie, show, song or album title. */
  title: string;
  artist?: string;
  year?: number;
}

/** What the media lookup actually returned. */
export interface FoundMedia {
  /** The answer players must give: a title, or the artist for an album. */
  answer: string;
  artist?: string | null;
  albumName?: string | null;
  year?: number | null;
}

/** Lowercase letters and digits only, without a leading article or bracketed notes. */
function fold(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s*[([].*?[)\]]/g, "")
    .replace(/\s+-\s+(single|ep)$/i, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}

const sameText = (a: string, b: string) => fold(a) === fold(b);

/** True when one credit contains the other ("Prince" / "Prince & The Revolution"). */
const overlaps = (a: string, b: string) => fold(a).includes(fold(b)) || fold(b).includes(fold(a));

/**
 * Reasons to doubt that a lookup found the intended title. A search returns
 * its best guess, which for a shared title can be a remake, a spin-off or a
 * cover version. Empty means the match looks right.
 */
export function matchProblems(roundKey: RoundKey, expected: ExpectedMedia, found: FoundMedia): string[] {
  const problems: string[] = [];

  if (roundKey === "album") {
    if (expected.artist && !overlaps(found.answer, expected.artist)) {
      problems.push(`Matched artist "${found.answer}", expected "${expected.artist}"`);
    }
    if (found.albumName && !sameText(found.albumName, expected.title)) {
      problems.push(`Matched album "${found.albumName}", expected "${expected.title}"`);
    }
    return problems;
  }

  if (!sameText(found.answer, expected.title)) {
    problems.push(`Matched "${found.answer}", expected "${expected.title}"`);
  }

  if (roundKey === "song") {
    if (expected.artist && found.artist && !overlaps(found.artist, expected.artist)) {
      problems.push(`Matched artist "${found.artist}", expected "${expected.artist}"`);
    }
    return problems;
  }

  if (expected.year && found.year && Math.abs(found.year - expected.year) > 1) {
    problems.push(`Matched the ${found.year} release, expected ${expected.year}`);
  }
  return problems;
}

/**
 * Chooses among search results. A store search for "Nevermind Nirvana" can
 * rank a tribute album first, so prefer the result that matches the intended
 * artist and title, then the right artist alone, then the store's own order.
 */
export function pickItunesHit<T extends { artistName?: string; collectionName?: string; trackName?: string }>(
  results: readonly T[],
  entity: "song" | "album",
  expected?: ExpectedMedia,
): T | null {
  if (!expected?.artist) return results[0] ?? null;

  const byArtist = results.filter((hit) => hit.artistName && overlaps(hit.artistName, expected.artist!));
  const titleOf = (hit: T) => (entity === "song" ? hit.trackName : hit.collectionName) ?? "";
  return byArtist.find((hit) => sameText(titleOf(hit), expected.title)) ?? byArtist[0] ?? results[0] ?? null;
}
