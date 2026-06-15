import { cookies } from "next/headers";

import { generateGuestToken, hashGuestToken } from "./token";

const COOKIE_NAME = "guest_token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

/**
 * Reads the raw guest token from the request cookie, if present.
 * Returns null when the cookie is absent.
 */
async function readRawToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Derives the guestId (token hash) from a raw token using the server pepper.
 */
function deriveGuestId(rawToken: string): string {
  const pepper = process.env.GUEST_TOKEN_PEPPER;
  if (!pepper) {
    throw new Error("GUEST_TOKEN_PEPPER is not configured");
  }
  return hashGuestToken(rawToken, pepper);
}

/**
 * Ensures a guest session exists. Creates a new one if the cookie is absent.
 * Always returns the guestId (HMAC hash of the raw token).
 *
 * Safe to call from any Server Component, Route Handler, or Server Action.
 */
export async function ensureGuestSession(): Promise<{ guestId: string }> {
  const existing = await readRawToken();

  if (existing) {
    return { guestId: deriveGuestId(existing) };
  }

  // No session yet — mint a fresh token and set the cookie.
  const rawToken = generateGuestToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, rawToken, COOKIE_OPTIONS);

  return { guestId: deriveGuestId(rawToken) };
}

/**
 * Requires a guest session to be present. Throws if the cookie is absent.
 *
 * Use this for routes that must only be reachable by guests who have already
 * bootstrapped (i.e. called POST /api/guest at least once).
 */
export async function requireGuestSession(): Promise<{ guestId: string }> {
  const existing = await readRawToken();

  if (!existing) {
    throw new Error("No guest session found");
  }

  return { guestId: deriveGuestId(existing) };
}
