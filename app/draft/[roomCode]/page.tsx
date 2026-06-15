import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireGuestSession } from "@/features/guest/session";
import { getRoomByCode } from "@/features/room/service";
import { Lobby } from "@/components/lobby/lobby";

interface DraftLobbyPageProps {
  params: Promise<{ roomCode: string }>;
}

/**
 * /draft/[roomCode]
 *
 * Server Component that:
 * 1. Requires a guest session (redirects to / if missing).
 * 2. Fetches the room by code.
 * 3. Renders the Lobby client component with initial data.
 */
export default async function DraftLobbyPage({ params }: DraftLobbyPageProps) {
  const { roomCode } = await params;

  let guestId: string;
  try {
    ({ guestId } = await requireGuestSession());
  } catch {
    // No session — redirect to home so they can establish one first
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

  return <Lobby initial={room} currentGuestId={guestId} />;
}
