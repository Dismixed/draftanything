import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { getMyPlayerId, getRoom } from "@/features/room/service";
import { startDraft } from "@/features/draft/service";
import {
  startPoolReview,
  getPool,
  generateAndAddPoolItems,
  addItem,
  editItem,
  removeItem,
  lockPool,
} from "@/features/pool/service";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";

/**
 * GET /api/drafts/[draftId]/pool
 *
 * Returns the current pool state.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const requestId = generateRequestId();
  const start = performance.now();
  let draftId: string | undefined;

  try {
    await requireGuestSession();
    draftId = (await params).draftId;
    const pool = await getPool(draftId);
    const res = Response.json(pool);
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "get_pool", draftId, result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "ROOM_NOT_FOUND" ? 404 : 400;
      const res = Response.json({ error: e.code, message: e.message }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "get_pool", draftId, result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[GET /api/drafts/:draftId/pool]", e);
    const res = Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "get_pool", draftId, result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
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

const commenceDraftSchema = z.object({
  action: z.literal("commence-draft"),
});

const poolActionSchema = z.discriminatedUnion("action", [
  addItemSchema,
  editItemSchema,
  removeItemSchema,
  generatePoolSchema,
  startReviewSchema,
  lockPoolSchema,
  commenceDraftSchema,
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
  const requestId = generateRequestId();
  const start = performance.now();
  let draftId: string | undefined;

  try {
    const { guestId } = await requireGuestSession();
    draftId = (await params).draftId;

    const rateResult = checkRateLimit(
      `pool:${draftId}:${guestId}`,
      10,
      60 * 60 * 1000,
    );

    if (!rateResult.allowed) {
      const res = Response.json(
        { error: "RATE_LIMITED", message: "Too many pool operations. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "pool_action", draftId, result: "RATE_LIMITED", durationMs: performance.now() - start });
      return res;
    }

    const myPlayerId = await getMyPlayerId(draftId, guestId);
    if (!myPlayerId) {
      const res = Response.json(
        { error: "UNAUTHORIZED", message: "You are not a player in this room" },
        { status: 401 },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "pool_action", draftId, result: "UNAUTHORIZED", durationMs: performance.now() - start });
      return res;
    }

    const body = await request.json();
    const parseResult = poolActionSchema.safeParse(body);

    if (!parseResult.success) {
      const res = Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "pool_action", draftId, result: "INVALID_INPUT", durationMs: performance.now() - start });
      return res;
    }

    const { action } = parseResult.data;
    let responseData: unknown;

    switch (action) {
      case "start-review": {
        await startPoolReview(draftId, guestId);
        const room = await getRoom(draftId);
        responseData = room;
        break;
      }
      case "generate": {
        const { topic, targetCount, existingItems } = parseResult.data;
        const pool = await generateAndAddPoolItems(draftId, guestId, {
          topic,
          targetCount,
          existingItems,
        });
        responseData = pool;
        break;
      }
      case "add-item": {
        const currentPool = await getPool(draftId);
        const pool = await addItem(draftId, guestId, parseResult.data.name, currentPool.rubric);
        responseData = pool;
        break;
      }
      case "edit-item": {
        const pool = await editItem(draftId, guestId, parseResult.data.itemId, parseResult.data.name);
        responseData = pool;
        break;
      }
      case "remove-item": {
        const pool = await removeItem(draftId, guestId, parseResult.data.itemId);
        responseData = pool;
        break;
      }
      case "lock": {
        await lockPool(draftId, guestId);
        await startDraft(draftId, guestId);
        const room = await getRoom(draftId);
        responseData = room;
        break;
      }
      case "commence-draft": {
        const { createAdminClient: getAdmin } = await import("@/lib/supabase/admin");
        const adminDb = getAdmin();
        const { data: draftRow } = await adminDb
          .from("drafts")
          .select("picking_mode, phase")
          .eq("id", draftId)
          .single();
        if (!draftRow || draftRow.picking_mode !== "off_the_dome") {
          throw new AppError("INVALID_INPUT", "commence-draft is only available for off_the_dome mode");
        }
        if (draftRow.phase !== "LOBBY") {
          throw new AppError("INVALID_PHASE", "Draft is not in lobby phase");
        }
        await adminDb
          .from("drafts")
          .update({ phase: "DRAFTING" })
          .eq("id", draftId);
        await startDraft(draftId, guestId);
        const room = await getRoom(draftId);
        responseData = room;
        break;
      }
    }

    const res = Response.json(responseData);
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: `pool_${action}`, draftId, result: "success", durationMs: performance.now() - start });
    return res;
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
      const res = Response.json({ error: e.code, message: e.message }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "pool_action", draftId, result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[POST /api/drafts/:draftId/pool]", e);
    const res = Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "pool_action", draftId, result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
