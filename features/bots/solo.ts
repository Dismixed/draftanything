import "server-only";

import { createRoom, getRoom } from "@/features/room/service";
import type { RoomProjection, SoloRoomInput } from "@/features/room/schema";
import { startPoolReview } from "@/features/pool/service";
import { commenceOffTheDome } from "@/features/draft/service";
import { addBot } from "./service";

/**
 * Creates a room for one person, fills every other seat with an AI drafter
 * and moves straight past the waiting lobby: to pool review for a pool draft,
 * or to the first pick for off-the-dome.
 */
export async function createSoloRoom(
  input: SoloRoomInput,
  guestId: string,
): Promise<RoomProjection> {
  const room = await createRoom(
    {
      displayName: input.displayName,
      topic: input.topic,
      maxPlayers: input.opponents + 1,
      rounds: input.rounds,
      timerSeconds: null,
      draftType: input.draftType,
      pickingMode: input.pickingMode,
      judgingMode: "ai",
      aiPersonality: input.aiPersonality,
      customJudgePrompt: input.customJudgePrompt ?? null,
    },
    guestId,
  );

  // One at a time: each AI drafter's name and style depend on who is seated.
  for (let i = 0; i < input.opponents; i += 1) {
    await addBot(room.draftId, guestId);
  }

  if (input.pickingMode === "off_the_dome") {
    await commenceOffTheDome(room.draftId, guestId);
  } else {
    await startPoolReview(room.draftId, guestId);
  }

  return getRoom(room.draftId);
}
