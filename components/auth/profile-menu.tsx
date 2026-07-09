import { createClient } from "@/lib/supabase/server";
import { SHOW_AUTH_UI } from "@/lib/auth/config";
import { ProfileMenuClient } from "./profile-menu-client";

export async function ProfileMenu() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return SHOW_AUTH_UI ? <ProfileMenuClient variant="signed-out" /> : null;
  }

  return (
    <ProfileMenuClient
      variant="signed-in"
      displayName={user.user_metadata?.display_name || user.email?.split("@")[0] || "Player"}
      avatarUrl={user.user_metadata?.avatar_url || null}
      email={user.email || ""}
    />
  );
}
