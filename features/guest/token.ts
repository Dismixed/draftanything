import { createHmac, randomBytes } from "crypto";

/**
 * Generates a cryptographically random guest token with at least 256 bits of
 * entropy. The raw token is sent to the browser exactly once (via the Set-Cookie
 * response header) and must never be persisted to the database.
 */
export function generateGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Derives a stable HMAC-SHA256 hex digest from the raw token and a server-side
 * pepper. Only this hash is ever stored in the database — the raw token stays in
 * the user's HTTP-only cookie.
 */
export function hashGuestToken(token: string, pepper: string): string {
  return createHmac("sha256", pepper).update(token).digest("hex");
}
