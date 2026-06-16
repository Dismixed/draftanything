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
  completedAt: string | null;
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
  createdAt: string;
}

export interface SafeDefense {
  id: string;
  playerId: string;
  defenseText: string | null;
  skipped: boolean;
  submittedAt: string;
}

export interface SafeVote {
  id: string;
  voterPlayerId: string;
  selectedPlayerId: string;
}

export interface SafeJudgment {
  id: string;
  source: "ai" | "fallback";
  playerScores: Record<string, number>;
  ranking: string[];
  winnerPlayerIds: string[];
  awards: Record<string, unknown>;
  explanation: string;
  model: string | null;
  createdAt: string;
}

export interface DraftRoomProjection {
  draft: SafeDraft;
  players: SafePlayer[];
  availableItems: SafeItem[];
  picks: SafePick[];
  commentary: SafeCommentary[];
  defenses: SafeDefense[];
  votes: SafeVote[];
  judgment: SafeJudgment | null;
  serverNow: string;
}
