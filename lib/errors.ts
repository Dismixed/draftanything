export type ApiErrorCode =
  | "INVALID_INPUT"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "NAME_TAKEN"
  | "NOT_HOST"
  | "INVALID_PHASE"
  | "STALE_STATE"
  | "RATE_LIMITED"
  | "UNAUTHORIZED";

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}
