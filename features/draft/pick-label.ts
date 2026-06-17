import type { SafeItem, SafePick } from "./types";

export function getPickItemLabel(
  pick: SafePick,
  itemMap?: Map<string, SafeItem>,
): string {
  if (pick.forfeited) return "Forfeited";
  if (pick.itemName) return pick.itemName;
  const item = pick.itemId ? itemMap?.get(pick.itemId) : undefined;
  return item?.name ?? "?";
}
