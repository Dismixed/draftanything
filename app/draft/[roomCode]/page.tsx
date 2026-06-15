import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireGuestSession } from "@/features/guest/session";
import { getRoomByCode, getMyPlayerId } from "@/features/room/service";
import { getDraftRoomProjection } from "@/features/draft/projection";
import { Lobby } from "@/components/lobby/lobby";
import { PoolReview } from "@/components/pool/pool-review";
import { DraftBoard } from "@/components/draft/draft-board";
import { DefensePanel } from "@/components/draft/defense-panel";
import { VotingPanel } from "@/components/draft/voting-panel";

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
    case "DEFENSE":
    case "VOTING":
    case "JUDGING": {
      const projection = await getDraftRoomProjection(room.draftId);

      if (room.phase === "DEFENSE") {
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <DefensePanel projection={projection} myPlayerId={myPlayerId} />
              <DraftBoard
                initial={projection}
                myPlayerId={myPlayerId}
              />
            </div>
          </div>
        );
      }

      if (room.phase === "VOTING") {
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <VotingPanel projection={projection} myPlayerId={myPlayerId} />
              <DraftBoard
                initial={projection}
                myPlayerId={myPlayerId}
              />
            </div>
          </div>
        );
      }

      if (room.phase === "JUDGING") {
        return (
          <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white rounded-xl border p-4">
                <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
                  Judging in Progress
                </h2>
                <p className="text-sm text-gray-600">
                  The AI commissioner is evaluating rosters. Results will appear shortly.
                </p>
              </div>
              <DraftBoard
                initial={projection}
                myPlayerId={myPlayerId}
              />
            </div>
          </div>
        );
      }

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
