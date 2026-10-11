import { seededRandom } from "@/features/draft/order";
import type { DomePickInput } from "./dome-pick";
import { pickFromPool, specialistCategory, type ScoredItem } from "./pool-pick";
import { profileForStyle, type BotProfile, type BotStyle } from "./roster";

/** Everything needed to decide an AI drafter's pick, as read from the database. */
export interface BotTurnState {
  draft: {
    id: string;
    phase: string;
    topic: string;
    pickingMode: string;
    currentPickIndex: number;
    pickOrder: Array<{ seat: number; overallPick: number }>;
    rubric: Record<string, number>;
    vetoedNames: string[];
  };
  players: Array<{ id: string; seat: number; isBot: boolean; botStyle: string | null }>;
  picks: Array<{
    playerId: string;
    itemId: string | null;
    itemName: string | null;
    forfeited: boolean;
  }>;
  items: Array<{
    id: string;
    name: string;
    isAvailable: boolean;
    scores: Record<string, number>;
  }>;
}

export type BotTurnPlan =
  /** Not this turn any more, or not an AI drafter's turn: nothing to do. */
  | { kind: "stale" }
  | { kind: "pool"; bot: BotProfile; itemId: string }
  | { kind: "dome"; bot: BotProfile; input: DomePickInput }
  | { kind: "forfeit"; bot: BotProfile };

/** Works out what the AI drafter on the clock should do. Pure. */
export function planBotTurn(state: BotTurnState, expectedPick: number): BotTurnPlan {
  const { draft, players, picks, items } = state;

  if (draft.phase !== "DRAFTING" || draft.currentPickIndex !== expectedPick) {
    return { kind: "stale" };
  }

  const slot = draft.pickOrder[draft.currentPickIndex];
  const player = slot ? players.find((p) => p.seat === slot.seat) : undefined;
  if (!slot || !player || !player.isBot) {
    return { kind: "stale" };
  }

  const bot = profileForStyle(player.botStyle);
  const ownPicks = picks.filter((p) => p.playerId === player.id && !p.forfeited);

  if (draft.pickingMode === "off_the_dome") {
    return {
      kind: "dome",
      bot,
      input: {
        topic: draft.topic,
        bot,
        takenNames: picks
          .filter((p) => !p.forfeited && p.itemName)
          .map((p) => p.itemName as string),
        ownLineup: ownPicks.filter((p) => p.itemName).map((p) => p.itemName as string),
        vetoedNames: draft.vetoedNames,
      },
    };
  }

  const toScored = (item: BotTurnState["items"][number]): ScoredItem => ({
    id: item.id,
    name: item.name,
    scores: item.scores,
  });
  const available = items.filter((item) => item.isAvailable).map(toScored);
  if (available.length === 0) {
    return { kind: "forfeit", bot };
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const ownLineup = ownPicks
    .map((p) => (p.itemId ? itemById.get(p.itemId) : undefined))
    .filter((item): item is BotTurnState["items"][number] => item !== undefined)
    .map(toScored);

  const choice = pickFromPool({
    style: bot.style as BotStyle,
    available,
    rubric: draft.rubric,
    ownLineup,
    specialistKey: specialistCategory(draft.rubric, draft.id, player.seat),
    random: seededRandom(`${draft.id}:${slot.overallPick}`),
  });

  return { kind: "pool", bot, itemId: choice.id };
}
