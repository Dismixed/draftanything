export type DraftType = "standard" | "snake" | "random";

export type JudgingMode = "ai" | "community" | "hybrid";

export enum DraftPhase {
  LOBBY = "LOBBY",
  POOL_REVIEW = "POOL_REVIEW",
  DRAFTING = "DRAFTING",
  DEFENSE = "DEFENSE",
  VOTING = "VOTING",
  JUDGING = "JUDGING",
  COMPLETE = "COMPLETE",
}

export interface PickSlot {
  overallPick: number;
  round: number;
  pickInRound: number;
  seat: number;
}
