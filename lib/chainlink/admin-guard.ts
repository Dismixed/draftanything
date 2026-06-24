import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Admin allowlist — users whose email is in this list can access admin features.
 * Configure via ADMIN_EMAILS env var (comma-separated).
 */
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

/**
 * Checks whether the current user session is an admin.
 * Returns the user email if admin, null otherwise.
 *
 * Local dev skips auth unless ADMIN_REQUIRE_AUTH=true.
 * Production requires a signed-in user whose email is in ADMIN_EMAILS.
 */
export async function checkAdmin(): Promise<{ email: string } | null> {
  const adminEmails = getAdminEmails();
  const requireAuth =
    process.env.NODE_ENV === "production" ||
    process.env.ADMIN_REQUIRE_AUTH === "true";

  if (!requireAuth) {
    return { email: "dev@localhost" };
  }

  if (adminEmails.length === 0) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  if (adminEmails.includes(email)) {
    return { email };
  }

  return null;
}
