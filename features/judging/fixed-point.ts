export const FIXED_POINT_SCALE = 1_000_000;

export const toFixedUnits = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw new RangeError("numeric comparison requires a finite value");
  }
  return Math.round(value * FIXED_POINT_SCALE);
};

export const compareFixed = (left: number, right: number): number =>
  toFixedUnits(left) - toFixedUnits(right);

export const fixedEqual = (left: number, right: number): boolean =>
  compareFixed(left, right) === 0;
