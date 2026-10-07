const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Most rows one bulk request may change. */
const MAX_BULK_IDS = 200;

/**
 * Validates a "set these rows to this status" request body, so a review page
 * can approve a screenful in one request instead of one per row.
 */
export function parseBulkStatus<S extends string>(
  body: unknown,
  allowed: readonly S[],
): { ids: string[]; status: S } | null {
  if (!body || typeof body !== "object") return null;
  const { ids, status } = body as { ids?: unknown; status?: unknown };
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK_IDS) return null;
  if (!ids.every((id): id is string => typeof id === "string" && UUID.test(id))) return null;
  if (typeof status !== "string" || !(allowed as readonly string[]).includes(status)) return null;
  return { ids, status: status as S };
}
