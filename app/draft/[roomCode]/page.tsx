import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireGuestSession } from "@/features/guest/session";
import { getRoomByCode, getMyPlayerId } from "@/features/room/service";
import { getDraftRoomProjection } from "@/features/draft/projection";
import { Lobby } from "@/components/lobby/lobby";
import { PoolReview } from "@/components/pool/pool-review";
import { DraftBoard } from "@/components/draft/draft-board";

interface DraftLobbyPageProps {
  params: Promise<{ roomCode: string }>;
}

/**
 * /draft/[roomCode]
 *
 * Server Component that:
 * 1. Requires a guest session (redirects to / if missing).
 * 2. Fetches the room by code.
 * 3. Resolves the current user's player ID.
 * 4. Renders the appropriate phase component.
 */
export default async function DraftLobbyPage({ params }: DraftLobbyPageProps) {
  const { roomCode } = await params;

  let guestId: string;
  try {
    ({ guestId } = await requireGuestSession());
  } catch {
    redirect("/");
  }

  let room;
  try {
    room = await getRoomByCode(roomCode);
  } catch (e) {
    if (e instanceof AppError && e.code === "ROOM_NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  const myPlayerId = await getMyPlayerId(room.draftId, guestId);

  switch (room.phase) {
    case "LOBBY":
      return <Lobby initial={room} myPlayerId={myPlayerId} />;
    case "POOL_REVIEW":
      return (
        <PoolReview
          draftId={room.draftId}
          myPlayerId={myPlayerId}
          hostPlayerId={room.hostPlayerId}
          room={room}
        />
      );
    case "DRAFTING":
    case "VETO_VOTING":
    case "DRAFT_COMPLETE":
    case "DEFENSE":
    case "VOTING":
    case "JUDGING":
    case "COMPLETE": {
      const projection = await getDraftRoomProjection(room.draftId);

      return (
        <DraftBoard
          initial={projection}
          myPlayerId={myPlayerId}
        />
      );
    }
    default:
      return <Lobby initial={room} myPlayerId={myPlayerId} />;
  }
}
