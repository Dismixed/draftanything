const TILTS = [-4, 3, -2, 5, -5, 2, 4, -3, 6, -6, 3, -2, 5, -4, 2] as const;

/** A small fixed rotation in degrees for the item at `index`, so snapshots sit crooked but never jump about. */
export function tiltFor(index: number): number {
  const i = ((Math.trunc(index) % TILTS.length) + TILTS.length) % TILTS.length;
  return TILTS[i];
}
