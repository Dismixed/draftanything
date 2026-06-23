"use client";

import type { DraftRoomProjection } from "@/features/draft/types";
import { DraftCompletePanel } from "./draft-complete-panel";
import { DefensePanel } from "./defense-panel";
import { VotingPanel } from "./voting-panel";
import { JudgingPanel } from "./judging-panel";
import { CompletePanel } from "./complete-panel";

interface PhasePanelProps {
  projection: DraftRoomProjection;
  myPlayerId: string;
  onVoteSubmitted?: () => Promise<void>;
  onJudgingComplete?: () => Promise<void>;
}

export function PhasePanel({
  projection,
  myPlayerId,
  onVoteSubmitted,
  onJudgingComplete,
}: PhasePanelProps) {
  switch (projection.draft.phase) {
    case "DRAFT_COMPLETE":
      return <DraftCompletePanel projection={projection} myPlayerId={myPlayerId} />;
    case "DEFENSE":
      return <DefensePanel projection={projection} myPlayerId={myPlayerId} />;
    case "VOTING":
      return (
        <VotingPanel
          projection={projection}
          myPlayerId={myPlayerId}
          onVoteSubmitted={onVoteSubmitted}
        />
      );
    case "JUDGING":
      return (
        <JudgingPanel
          projection={projection}
          myPlayerId={myPlayerId}
          onJudgingComplete={onJudgingComplete}
        />
      );
    case "COMPLETE":
      return <CompletePanel projection={projection} myPlayerId={myPlayerId} />;
    default:
      return null;
  }
}
