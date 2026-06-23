import { normalizeItemName } from "@/features/pool/normalize";

export interface AwardRef {
  pickId: string;
  itemId: string;
  playerId: string;
}

export interface PickLike {
  id: string;
  playerId: string;
  itemId: string;
  itemName: string | null;
  overallPick: number;
}

export function readAwardRef(raw: unknown): AwardRef {
  const award = (raw ?? {}) as Record<string, unknown>;
  return {
    pickId: String(award.pickId ?? award.pick_id ?? ""),
    itemId: String(award.itemId ?? award.item_id ?? ""),
    playerId: String(award.playerId ?? award.player_id ?? ""),
  };
}

export function resolvePickForAward(
  award: AwardRef,
  picks: readonly PickLike[],
): PickLike | undefined {
  if (award.pickId) {
    const byId = picks.find((pick) => pick.id === award.pickId);
    if (byId) return byId;
  }

  if (award.itemId) {
    const byItemId = picks.find(
      (pick) => pick.itemId.length > 0 && pick.itemId === award.itemId,
    );
    if (byItemId) return byItemId;

    try {
      const normalized = normalizeItemName(award.itemId);
      const byName = picks.find(
        (pick) =>
          pick.itemName != null &&
          normalizeItemName(pick.itemName) === normalized,
      );
      if (byName) return byName;
    } catch {
      // itemId was not a valid item name
    }
  }

  return undefined;
}

export function normalizeAwardRef(
  raw: unknown,
  picks: readonly PickLike[],
): AwardRef {
  const award = readAwardRef(raw);
  const pick = resolvePickForAward(award, picks);
  if (!pick) return award;

  return {
    pickId: pick.id,
    itemId: pick.itemId,
    playerId: pick.playerId,
  };
}

export function resolveAwardItemName(
  raw: unknown,
  picks: readonly PickLike[],
  itemNameById: ReadonlyMap<string, string>,
): string {
  const pick = resolvePickForAward(readAwardRef(raw), picks);
  if (!pick) return "Unknown";
  if (pick.itemName) return pick.itemName;
  if (pick.itemId) {
    const name = itemNameById.get(pick.itemId);
    if (name) return name;
  }
  return "Unknown";
}
