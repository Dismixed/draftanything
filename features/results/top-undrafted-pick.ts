import {
  selectAutoPick,
  type DraftItem,
  type RubricCategory,
} from "@/features/ai/fallback";
import type { PickingMode } from "@/features/draft/types";

export function rubricFromDraftRecord(
  rubricRaw: Record<string, number> | null | undefined,
): RubricCategory[] {
  if (!rubricRaw) return [];
  return Object.entries(rubricRaw).map(([key, weight]) => ({ key, weight }));
}

export function computeTopUndraftedPick(
  items: Array<{
    id: string;
    name: string;
    is_available: boolean;
    hidden_metadata: Record<string, number>;
  }>,
  rubric: RubricCategory[],
  pickingMode: PickingMode,
): string | null {
  if (pickingMode === "off_the_dome" || rubric.length === 0) {
    return null;
  }

  const available = items.filter((item) => item.is_available);
  if (available.length === 0) {
    return null;
  }

  try {
    const draftItems: DraftItem[] = available.map((item) => ({
      id: item.id,
      name: item.name,
      available: true,
      metadata: item.hidden_metadata ?? {},
    }));
    return selectAutoPick(draftItems, rubric).name;
  } catch {
    return null;
  }
}
