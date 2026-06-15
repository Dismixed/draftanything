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

export interface SafeDraft {
  id: string;
  roomCode: string;
  topic: string;
  phase: DraftPhase;
  hostPlayerId: string;
  maxPlayers: number;
  rounds: number;
  draftType: DraftType;
  judgingMode: JudgingMode;
  aiPersonality: string;
  timerSeconds: number | null;
  pickOrder: PickSlot[];
  currentPickIndex: number;
  turnDeadline: string | null;
}

export interface SafePlayer {
  id: string;
  displayName: string;
  seat: number;
  isReady: boolean;
  isHost: boolean;
}

export interface SafeItem {
  id: string;
  name: string;
  source: "ai" | "manual";
  isAvailable: boolean;
}

export interface SafePick {
  id: string;
  playerId: string;
  itemId: string;
  overallPick: number;
  round: number;
  pickInRound: number;
  isAutoPick: boolean;
}

export interface SafeCommentary {
  id: string;
  pickId: string | null;
  personality: string;
  text: string;
  triggerTags: string[];
}

export interface DraftRoomProjection {
  draft: SafeDraft;
  players: SafePlayer[];
  availableItems: SafeItem[];
  picks: SafePick[];
  commentary: SafeCommentary[];
  serverNow: string;
}
