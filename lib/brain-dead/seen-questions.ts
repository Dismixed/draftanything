import type { CategoryId } from "./types";

const MAX_SEEN_IDS = 500;

function storageKey(category: CategoryId): string {
  return `bd_seen_${category}`;
}

export function loadSeenQuestionIds(category: CategoryId): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(category));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export function saveSeenQuestionIds(
  category: CategoryId,
  ids: string[],
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    storageKey(category),
    JSON.stringify(ids.slice(-MAX_SEEN_IDS)),
  );
}

export function recordSeenQuestionIds(
  category: CategoryId,
  ids: string[],
): string[] {
  const merged = [...loadSeenQuestionIds(category)];
  for (const id of ids) {
    if (!id || merged.includes(id)) continue;
    merged.push(id);
  }
  const trimmed = merged.slice(-MAX_SEEN_IDS);
  saveSeenQuestionIds(category, trimmed);
  return trimmed;
}
