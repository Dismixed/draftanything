import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { getMyPlayerId } from "@/features/room/service";
import {
  getSuggestions,
  submitSuggestion,
  acceptSuggestion,
  rejectSuggestion,
} from "@/features/pool/service";

/**
 * GET /api/drafts/[draftId]/suggestions
 *
 * Returns all pool suggestions for the given draft.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    await requireGuestSession();
    const { draftId } = await params;
    const suggestions = await getSuggestions(draftId);
    return Response.json(suggestions);
  } catch (e) {
    if (e instanceof AppError) {
      return Response.json({ error: e.code, message: e.message }, { status: 400 });
    }
    console.error("[GET /api/drafts/:draftId/suggestions]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

const submitSuggestionSchema = z.object({
  action: z.literal("submit"),
  suggestionAction: z.enum(["add", "remove"]),
  suggestedName: z.string().min(1).max(60).optional(),
  targetItemId: z.string().uuid().optional(),
});

const acceptSuggestionSchema = z.object({
  action: z.literal("accept"),
  suggestionId: z.string().uuid(),
});

const rejectSuggestionSchema = z.object({
  action: z.literal("reject"),
  suggestionId: z.string().uuid(),
});

const suggestionActionSchema = z.discriminatedUnion("action", [
  submitSuggestionSchema,
  acceptSuggestionSchema,
  rejectSuggestionSchema,
]);

/**
 * POST /api/drafts/[draftId]/suggestions
 *
 * Submit, accept, or reject pool suggestions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `suggestion:${draftId}:${guestId}`,
      30,
      60 * 60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many suggestions. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const myPlayerId = await getMyPlayerId(draftId, guestId);
    if (!myPlayerId) {
      return Response.json(
        { error: "UNAUTHORIZED", message: "You are not a player in this room" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parseResult = suggestionActionSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { action } = parseResult.data;

    switch (action) {
      case "submit": {
        await submitSuggestion(
          draftId,
          myPlayerId,
          parseResult.data.suggestionAction,
          {
            suggestedName: parseResult.data.suggestedName,
            targetItemId: parseResult.data.targetItemId,
          },
        );
        const suggestions = await getSuggestions(draftId);
        return Response.json(suggestions, { status: 201 });
      }
      case "accept": {
        const pool = await acceptSuggestion(draftId, guestId, parseResult.data.suggestionId);
        return Response.json(pool);
      }
      case "reject": {
        await rejectSuggestion(draftId, guestId, parseResult.data.suggestionId);
        return Response.json({ success: true });
      }
    }
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        NOT_HOST: 403,
        INVALID_PHASE: 400,
        NAME_TAKEN: 409,
      };
      const status = statusMap[e.code] ?? 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/suggestions]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
