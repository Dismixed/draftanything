export function boardSquare(pos: number): number {
  return pos === 0 ? 1 : pos;
}

export function buildBoardRows(): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < 5; r++) {
    const base = (4 - r) * 10;
    const cells = Array.from({ length: 10 }, (_, i) => base + i + 1);
    if ((4 - r) % 2 === 1) cells.reverse();
    rows.push(cells);
  }
  return rows;
}

export const BOARD_ROWS = buildBoardRows();

export function parseSlMap(slMap: Record<string, number>): Record<number, number> {
  const m: Record<number, number> = {};
  for (const [k, v] of Object.entries(slMap)) {
    m[Number(k)] = v;
  }
  return m;
}
