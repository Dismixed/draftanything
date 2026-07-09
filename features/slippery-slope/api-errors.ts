import { AppError, type ApiErrorCode } from "@/lib/errors";

export function ssErrorStatus(code: ApiErrorCode): number {
  const statusMap: Record<string, number> = {
    UNAUTHORIZED: 401,
    ROOM_NOT_FOUND: 404,
    ROOM_FULL: 409,
    NAME_TAKEN: 409,
    INVALID_PHASE: 409,
    STALE_STATE: 409,
    NOT_HOST: 403,
  };
  return statusMap[code] ?? 400;
}

export function handleSsRouteError(e: unknown): Response {
  if (e instanceof AppError) {
    return Response.json(
      { error: e.code, message: e.message },
      { status: ssErrorStatus(e.code) },
    );
  }
  console.error("[slippery-slope api]", e);
  return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}
