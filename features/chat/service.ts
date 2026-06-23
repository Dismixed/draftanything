import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type { SafeRoomMessage } from "./types";

const MESSAGE_LIMIT = 100;

interface RoomMessageRow {
  id: string;
  player_id: string;
  text: string;
  created_at: string;
}

export async function getRoomMessages(
  draftId: string,
  limit = MESSAGE_LIMIT,
): Promise<SafeRoomMessage[]> {
  const db = createAdminClient();

  const [messagesResult, playersResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from as any)("room_messages")
      .select("id, player_id, text, created_at")
      .eq("draft_id", draftId)
      .order("created_at", { ascending: true })
      .limit(limit),
    db
      .from("draft_players")
      .select("id, display_name")
      .eq("draft_id", draftId),
  ]);

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message);
  }
  if (playersResult.error) {
    throw new Error(playersResult.error.message);
  }

  const playerNames = new Map(
    (playersResult.data ?? []).map((p) => [p.id, p.display_name]),
  );

  return ((messagesResult.data ?? []) as RoomMessageRow[]).map((row) => ({
    id: row.id,
    playerId: row.player_id,
    playerName: playerNames.get(row.player_id) ?? "Unknown",
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function sendRoomMessage(
  draftId: string,
  guestId: string,
  text: string,
): Promise<SafeRoomMessage> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messageId, error } = await (db.rpc as any)("send_room_message", {
    p_draft_id: draftId,
    p_guest_id: guestId,
    p_text: text,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) {
      throw new AppError("ROOM_NOT_FOUND", "Draft not found");
    }
    if (msg.includes("NOT_A_PLAYER")) {
      throw new AppError("UNAUTHORIZED", "You are not a player in this room");
    }
    if (msg.includes("INVALID_INPUT")) {
      throw new AppError("INVALID_INPUT", msg.replace(/^INVALID_INPUT:\s*/, ""));
    }
    throw new Error(msg);
  }

  const messages = await getRoomMessages(draftId);
  const created = messages.find((m) => m.id === messageId);
  if (!created) {
    throw new Error("Message created but not found");
  }

  return created;
}
