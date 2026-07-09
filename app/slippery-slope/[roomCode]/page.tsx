import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireGuestSession } from "@/features/guest/session";
import {
  getMySsPlayerId,
  getSsRoomByCode,
} from "@/features/slippery-slope/service";
import { SlipperySlopeLobby } from "@/components/slippery-slope/lobby";
import { MultiplayerGame } from "@/components/slippery-slope/multiplayer-game";

interface SlipperySlopeRoomPageProps {
  params: Promise<{ roomCode: string }>;
}

export default async function SlipperySlopeRoomPage({
  params,
}: SlipperySlopeRoomPageProps) {
  const { roomCode } = await params;

  let guestId: string;
  try {
    ({ guestId } = await requireGuestSession());
  } catch {
    redirect("/slippery-slope");
  }

  let room;
  try {
    room = await getSsRoomByCode(roomCode, guestId);
  } catch (e) {
    if (e instanceof AppError && e.code === "ROOM_NOT_FOUND") {
      notFound();
    }
    throw e;
  }

  const myPlayerId = await getMySsPlayerId(room.roomId, guestId);

  if (room.phase === "LOBBY") {
    return <SlipperySlopeLobby initial={room} myPlayerId={myPlayerId} />;
  }

  return <MultiplayerGame initial={room} myPlayerId={myPlayerId} />;
}
