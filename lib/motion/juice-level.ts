export type JuiceLevel = 0 | 1 | 2 | 3;

export function juiceLevel(streak: number): JuiceLevel {
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}
