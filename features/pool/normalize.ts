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
  const normalized = name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");

  if (normalized.length === 0) {
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

export const poolTargetSize = (players: number, rounds: number): number => {
  validateRange(players, 2, 6, "players");
  validateRange(rounds, 1, 10, "rounds");
  return players * rounds * 2;
};
