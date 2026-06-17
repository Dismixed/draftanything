import { cookies } from "next/headers";

import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
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

function getPepper(): string {
  const pepper = process.env.GUEST_TOKEN_PEPPER;
  if (!pepper) {
    throw new AppError("INVALID_INPUT", "GUEST_TOKEN_PEPPER is not configured");
  }
  return pepper;
}

async function getActiveGuestSessionId(tokenHash: string): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("get_active_guest_session_id", {
    p_token_hash: tokenHash,
  });

  if (error) {
    throw new AppError("INVALID_INPUT", error.message);
  }

  return data ?? null;
}

async function ensureGuestSessionRow(tokenHash: string): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("ensure_guest_session", {
    p_token_hash: tokenHash,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("GUEST_SESSION_EXPIRED")) {
      throw new AppError("UNAUTHORIZED", "Guest session expired");
    }
    throw new AppError("INVALID_INPUT", error.message);
  }

  if (!data) {
    throw new AppError("INVALID_INPUT", "Failed to create guest session");
  }

  return data;
}

async function resolveGuestSession(rawToken: string): Promise<string> {
  const tokenHash = hashGuestToken(rawToken, getPepper());

  const activeId = await getActiveGuestSessionId(tokenHash);
  if (activeId) {
    return activeId;
  }

  try {
    return await ensureGuestSessionRow(tokenHash);
  } catch (e) {
    if (e instanceof AppError && e.code === "UNAUTHORIZED") {
      throw e;
    }
    throw e;
  }
}

/**
 * Ensures a guest session exists. Creates a new one if the cookie is absent.
 * Persists the session in guest_sessions and returns its UUID primary key.
 *
 * Safe to call from any Server Component, Route Handler, or Server Action.
 */
export async function ensureGuestSession(): Promise<{ guestId: string }> {
  const existing = await readRawToken();

  if (existing) {
    try {
      return { guestId: await resolveGuestSession(existing) };
    } catch (e) {
      if (!(e instanceof AppError && e.code === "UNAUTHORIZED")) {
        throw e;
      }
      // Expired session — mint a fresh token below.
    }
  }

  const rawToken = generateGuestToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, rawToken, COOKIE_OPTIONS);

  return { guestId: await resolveGuestSession(rawToken) };
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
    throw new AppError("UNAUTHORIZED", "No guest session found");
  }

  const tokenHash = hashGuestToken(existing, getPepper());
  const sessionId = await getActiveGuestSessionId(tokenHash);

  if (!sessionId) {
    throw new AppError("UNAUTHORIZED", "Guest session expired or invalid");
  }

  return { guestId: sessionId };
}
