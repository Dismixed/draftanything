export type DraftType = "standard" | "snake" | "random";

export type JudgingMode = "ai" | "community" | "hybrid";

export type DraftPhase =
  | "LOBBY"
  | "POOL_REVIEW"
  | "DRAFTING"
  | "DEFENSE"
  | "VOTING"
  | "JUDGING"
  | "COMPLETE";

export interface PickSlot {
  overallPick: number;
  round: number;
  pickInRound: number;
  seat: number;
}
