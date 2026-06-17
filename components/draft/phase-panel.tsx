"use client";

import type { DraftRoomProjection } from "@/features/draft/types";
import { useLiveProjection } from "@/features/draft/use-live-projection";
import { DefensePanel } from "./defense-panel";
import { VotingPanel } from "./voting-panel";
import { JudgingPanel } from "./judging-panel";
import { CompletePanel } from "./complete-panel";

interface PhasePanelProps {
  initial: DraftRoomProjection;
  myPlayerId: string;
}

export function PhasePanel({ initial, myPlayerId }: PhasePanelProps) {
  const projection = useLiveProjection(initial);

  switch (projection.draft.phase) {
    case "DEFENSE":
      return <DefensePanel projection={projection} myPlayerId={myPlayerId} />;
    case "VOTING":
      return <VotingPanel projection={projection} myPlayerId={myPlayerId} />;
    case "JUDGING":
      return <JudgingPanel projection={projection} myPlayerId={myPlayerId} />;
    case "COMPLETE":
      return <CompletePanel projection={projection} />;
    default:
      return null;
  }
}
