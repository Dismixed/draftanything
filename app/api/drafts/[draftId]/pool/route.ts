import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { requireGuestSession } from "@/features/guest/session";
import { getMyPlayerId, getRoom } from "@/features/room/service";
import {
  startPoolReview,
  getPool,
  generateAndAddPoolItems,
  addItem,
  editItem,
  removeItem,
  lockPool,
} from "@/features/pool/service";

/**
 * GET /api/drafts/[draftId]/pool
 *
 * Returns the current pool state.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    await requireGuestSession();
    const { draftId } = await params;
    const pool = await getPool(draftId);
    return Response.json(pool);
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "ROOM_NOT_FOUND" ? 404 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[GET /api/drafts/:draftId/pool]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

const addItemSchema = z.object({
  action: z.literal("add-item"),
  name: z.string().min(1).max(60),
});

const editItemSchema = z.object({
  action: z.literal("edit-item"),
  itemId: z.string().uuid(),
  name: z.string().min(1).max(60),
});

const removeItemSchema = z.object({
  action: z.literal("remove-item"),
  itemId: z.string().uuid(),
});

const generatePoolSchema = z.object({
  action: z.literal("generate"),
  topic: z.string().min(1).max(200),
  targetCount: z.number().int().min(2).max(60),
  existingItems: z.array(z.string()).default([]),
});

const startReviewSchema = z.object({
  action: z.literal("start-review"),
});

const lockPoolSchema = z.object({
  action: z.literal("lock"),
});

const poolActionSchema = z.discriminatedUnion("action", [
  addItemSchema,
  editItemSchema,
  removeItemSchema,
  generatePoolSchema,
  startReviewSchema,
  lockPoolSchema,
]);

/**
 * POST /api/drafts/[draftId]/pool
 *
 * Pool mutations: start-review, generate, add-item, edit-item, remove-item, lock.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const myPlayerId = await getMyPlayerId(draftId, guestId);
    if (!myPlayerId) {
      return Response.json(
        { error: "UNAUTHORIZED", message: "You are not a player in this room" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parseResult = poolActionSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { action } = parseResult.data;

    switch (action) {
      case "start-review": {
        await startPoolReview(draftId, guestId);
        const room = await getRoom(draftId);
        return Response.json(room);
      }
      case "generate": {
        const { topic, targetCount, existingItems } = parseResult.data;
        const pool = await generateAndAddPoolItems(draftId, guestId, {
          topic,
          targetCount,
          existingItems,
        });
        return Response.json(pool);
      }
      case "add-item": {
        const currentPool = await getPool(draftId);
        const pool = await addItem(draftId, guestId, parseResult.data.name, currentPool.rubric);
        return Response.json(pool);
      }
      case "edit-item": {
        const pool = await editItem(draftId, guestId, parseResult.data.itemId, parseResult.data.name);
        return Response.json(pool);
      }
      case "remove-item": {
        const pool = await removeItem(draftId, guestId, parseResult.data.itemId);
        return Response.json(pool);
      }
      case "lock": {
        await lockPool(draftId, guestId);
        const room = await getRoom(draftId);
        return Response.json(room);
      }
    }
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        ROOM_NOT_FOUND: 404,
        NOT_HOST: 403,
        INVALID_PHASE: 400,
        NAME_TAKEN: 409,
        RATE_LIMITED: 429,
      };
      const status = statusMap[e.code] ?? 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/pool]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
