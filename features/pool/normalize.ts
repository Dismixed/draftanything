const validateRange = (
  value: number,
  minimum: number,
  maximum: number,
  name: string,
): void => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
};

export const normalizeItemName = (name: string): string => {
  let folded = "";
  let markCanAttach = false;

  for (const character of name.normalize("NFKD").toLowerCase()) {
    if (/[\p{L}\p{N}]/u.test(character)) {
      folded += character;
      markCanAttach = true;
    } else if (/\p{M}/u.test(character)) {
      if (markCanAttach) {
        folded += character;
      }
    } else if (/[\p{P}\p{S}\s]/u.test(character)) {
      folded += " ";
      markCanAttach = false;
    } else {
      markCanAttach = false;
    }
  }

  const normalized = folded.trim().replace(/\s+/gu, " ");

  if (!/[\p{L}\p{N}]/u.test(normalized)) {
    throw new Error("item name must contain letters or numbers");
  }

  return normalized;
};

export const assertUniqueItems = (names: readonly string[]): void => {
  const normalizedNames = new Set<string>();

  for (const name of names) {
    const normalized = normalizeItemName(name);
    if (normalizedNames.has(normalized)) {
      throw new Error(`duplicate item name: ${name}`);
    }
    normalizedNames.add(normalized);
  }
};

/** Keep the first occurrence of each normalized name; optionally skip names already in the pool. */
export function dedupeItemNames<T extends { name: string }>(
  items: readonly T[],
  options?: { exclude?: readonly string[] },
): T[] {
  const seen = new Set<string>();

  for (const name of options?.exclude ?? []) {
    seen.add(normalizeItemName(name));
  }

  const result: T[] = [];
  for (const item of items) {
    const normalized = normalizeItemName(item.name);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(item);
  }
  return result;
}

export const poolTargetSize = (players: number, rounds: number): number => {
  validateRange(players, 2, 6, "players");
  validateRange(rounds, 1, 10, "rounds");
  return players * rounds * 2;
};
