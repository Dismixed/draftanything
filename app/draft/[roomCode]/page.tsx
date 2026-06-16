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
import { JudgingPanel } from "@/components/draft/judging-panel";

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
          <>
            <JudgingPanel projection={projection} myPlayerId={myPlayerId} />
            <DraftBoard
              initial={projection}
              myPlayerId={myPlayerId}
            />
          </>
        );
      }

      return (
        <DraftBoard
          initial={projection}
          myPlayerId={myPlayerId}
        />
      );
    }
    case "COMPLETE": {
      const projection = await getDraftRoomProjection(room.draftId);
      const judgment = projection.judgment;

      return (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white rounded-xl border p-4">
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
                Draft Complete
              </h2>
              {judgment ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    The {judgment.source === "ai" ? "AI commissioner" : "community"} has evaluated the rosters.
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`/results/${room.draftId}`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      View Full Results
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  The draft is complete. Results are being processed.
                </p>
              )}
            </div>
            <DraftBoard
              initial={projection}
              myPlayerId={myPlayerId}
            />
          </div>
        </div>
      );
    }
    default:
      return <Lobby initial={room} myPlayerId={myPlayerId} />;
  }
}
