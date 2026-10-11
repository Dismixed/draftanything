export const STREAK_MILESTONES = [7, 14, 30, 50, 100] as const;

/** Pips drawn under the streak line. */
export const MILESTONE_PIPS = 7;

export interface Milestone {
  target: number;
  /** The milestone before `target`, or 0. */
  previous: number;
  remaining: number;
}

export function nextMilestone(streak: number): Milestone | null {
  const days = Math.max(0, Math.floor(streak));
  const index = STREAK_MILESTONES.findIndex((milestone) => milestone > days);
  if (index === -1) return null;
  const target = STREAK_MILESTONES[index];
  return { target, previous: index === 0 ? 0 : STREAK_MILESTONES[index - 1], remaining: target - days };
}

export function milestoneLabel(target: number): string {
  if (target === 7) return "a full week";
  if (target === 14) return "two weeks";
  return `${target} days`;
}

/** How many of the seven pips are filled: progress from the last milestone to the next. */
export function milestonePips(streak: number): number {
  const days = Math.max(0, Math.floor(streak));
  const milestone = nextMilestone(days);
  if (!milestone) return MILESTONE_PIPS;
  const span = milestone.target - milestone.previous;
  return Math.floor((MILESTONE_PIPS * (days - milestone.previous)) / span);
}
