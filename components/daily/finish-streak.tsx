"use client";

import { MILESTONE_PIPS, milestoneLabel, milestonePips, nextMilestone } from "@/lib/streak/milestones";

/** `streak` is the current game's streak including today. */
export function FinishStreak({ streak }: { streak: number }) {
  const days = Math.max(1, streak);
  const milestone = nextMilestone(days);
  const filled = milestonePips(days);

  return (
    <div className="fin-streak" data-testid="finish-streak">
      {days === 1 ? (
        <p>
          <b>Day 1 of your streak.</b> Come back tomorrow to make it 2.
        </p>
      ) : (
        <p>
          <b>
            <span className="fin-flame" aria-hidden="true">
              🔥
            </span>{" "}
            {days} day streak.
          </b>
          {milestone ? ` ${milestone.remaining} more for ${milestoneLabel(milestone.target)}.` : null}
        </p>
      )}
      <div className="fin-pips" aria-hidden="true">
        {Array.from({ length: MILESTONE_PIPS }, (_, i) => (
          <i key={i} className={i < filled ? "is-on" : undefined} />
        ))}
      </div>
    </div>
  );
}
