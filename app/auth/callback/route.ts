import { NextResponse } from "next/server";

import { hashGuestToken } from "@/features/guest/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const guestToken = searchParams.get("guest_token");
      if (guestToken) {
        try {
          const pepper = process.env.GUEST_TOKEN_PEPPER;
          if (pepper) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const tokenHash = hashGuestToken(guestToken, pepper);
              const admin = createAdminClient();
              await admin.rpc("link_guest_to_account", {
                p_token_hash: tokenHash,
                p_user_id: user.id,
              });
            }
          }
        } catch {
          // Best-effort — don't break the OAuth flow
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
