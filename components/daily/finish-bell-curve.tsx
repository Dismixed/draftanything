"use client";

import type { CSSProperties } from "react";
import { zForPercentile } from "@/lib/games/percentile";
import { useCountUp } from "@/lib/motion/count-up";

const W = 260;
const H = 66;
/** One standard deviation, in plot pixels. */
const SIGMA = 48;

const bellY = (x: number) => H - 2 - 56 * Math.exp(-(((x - W / 2) / SIGMA) ** 2) / 2);
const POINTS = Array.from({ length: 53 }, (_, i) => `${i * 5},${bellY(i * 5).toFixed(1)}`);
const LINE = `M${POINTS.join(" L")}`;
const AREA = `M0,${H} L${POINTS.join(" L")} L${W},${H} Z`;

export interface FinishBellCurveProps {
  /** 0 to 100: the share of players this player did better than. */
  percentile: number;
  lowLabel: string;
  highLabel: string;
}

/** The marker sits where `percentile` percent of the area lies to its left, so the picture agrees with the number. */
export function FinishBellCurve({ percentile, lowLabel, highLabel }: FinishBellCurveProps) {
  const shown = useCountUp(percentile, true, 1200);
  const x = Math.round(W / 2 + zForPercentile(percentile) * SIGMA);

  return (
    <div className="fin-bell" data-testid="finish-bell" style={{ "--x": `${x}px` } as CSSProperties}>
      <div className="fin-bell-plot" aria-hidden="true">
        <div className="fin-bell-shade">
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
            <path d={AREA} />
          </svg>
        </div>
        <svg className="fin-bell-line" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
          <path d={LINE} />
        </svg>
        <div className="fin-bell-me" />
      </div>
      <div className="fin-bell-axis" aria-hidden="true">
        <span>{lowLabel}</span>
        <span>everyone who played today</span>
        <span>{highLabel}</span>
      </div>
      <p className="fin-bell-n" aria-label={`Better than ${percentile}% of players`}>
        Better than <b>{shown}%</b> of players
      </p>
    </div>
  );
}
