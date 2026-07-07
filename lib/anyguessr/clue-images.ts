import type { Clue, ClueImageOption, ClientClue } from "./types";

const IMAGE_CLUE_TYPES = new Set([
  "landmark",
  "person",
  "food",
  "environment",
  "flag",
  "jersey",
  "brand",
  "currency",
]);

export function isImageClueType(type: string): boolean {
  return IMAGE_CLUE_TYPES.has(type);
}

export function getImageOptions(clue: Clue): ClueImageOption[] {
  const stored = clue.metadata?.image_options;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored.filter((option) => option.image_url || option.thumb_url);
  }

  const image = clue.metadata?.image_url ?? clue.metadata?.thumb_url;
  if (!image) return [];

  return [
    {
      image_url: clue.metadata?.image_url,
      thumb_url: clue.metadata?.thumb_url,
      source: clue.metadata?.source,
      source_url: clue.metadata?.source_url,
      label: typeof clue.metadata?.label === "string" ? clue.metadata.label : undefined,
    },
  ];
}

function variantHash(seed: string, puzzleId: string, clueType: string): number {
  let h = 0x811c9dc5;
  const input = `${seed}:${puzzleId}:${clueType}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickImageVariantIndex(
  clue: Clue,
  variantSeed: string,
  puzzleId: string,
): number {
  const count = getImageOptions(clue).length;
  if (count <= 1) return 0;
  return variantHash(variantSeed, puzzleId, clue.type) % count;
}

export function imageUrlForVariant(clue: Clue, variantIndex: number): string | undefined {
  const options = getImageOptions(clue);
  const option = options[variantIndex] ?? options[0];
  return option?.image_url ?? option?.thumb_url;
}

export function dailyImageUrlForClue(
  clue: Clue,
  puzzleId: string,
  date: string,
): string | undefined {
  const variantIndex = pickImageVariantIndex(clue, date, puzzleId);
  return imageUrlForVariant(clue, variantIndex);
}

export function redactClueForClient(clue: Clue, variantIndex?: number): ClientClue {
  const options = getImageOptions(clue);
  const selected =
    variantIndex !== undefined && options.length > 0
      ? options[variantIndex] ?? options[0]
      : undefined;

  const hideLabel = clue.metadata?.hide_label === true;
  const metadata = { ...clue.metadata };

  if (selected) {
    metadata.image_url = selected.image_url;
    metadata.thumb_url = selected.thumb_url ?? selected.image_url;
    metadata.source = selected.source;
    metadata.source_url = selected.source_url;
    metadata.label = selected.label;
  }

  delete metadata.image_options;
  delete metadata.hide_label;

  return {
    type: clue.type,
    content: hideLabel ? "" : clue.content,
    metadata: {
      ...metadata,
      source: hideLabel ? undefined : metadata.source,
      source_url: hideLabel ? undefined : metadata.source_url,
      label: hideLabel ? undefined : metadata.label,
    },
    difficulty_rank: clue.difficulty_rank,
  };
}
