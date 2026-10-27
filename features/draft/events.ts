import "server-only";

import type { RoomProjection } from "@/features/room/schema";
import { getPostHogClient, withRequestIdentity } from "@/lib/posthog-server";

/** Analytics properties for a draft's lifecycle events: how the room is set up and who is seated. */
export function draftEventProperties(room: RoomProjection) {
  const bots = room.players.filter((player) => player.isBot).length;
  return {
    draft_id: room.draftId,
    picking_mode: room.pickingMode,
    judging_mode: room.judgingMode,
    rounds: room.rounds,
    human_players: room.players.length - bots,
    bots,
  };
}

/**
 * `draft_started` when the first pick opens (a locked pool, or an off-the-dome room commencing)
 * and `draft_completed` when the draft reaches its results. Both are credited to the host, who is
 * the only one who can take either step.
 */
export async function captureDraftEvent(
  request: Request,
  event: "draft_started" | "draft_completed",
  room: RoomProjection,
  guestId: string,
): Promise<void> {
  const posthog = getPostHogClient();
  posthog.capture(withRequestIdentity(request, { event, properties: draftEventProperties(room) }, guestId));
  await posthog.flush();
}
