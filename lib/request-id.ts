import { randomUUID } from "crypto";

export function generateRequestId(): string {
  return randomUUID().slice(0, 8);
}

export function setRequestIdHeader(response: Response, requestId: string): void {
  response.headers.set("X-Request-Id", requestId);
}
