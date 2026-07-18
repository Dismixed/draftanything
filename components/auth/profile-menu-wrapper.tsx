import { Suspense } from "react";
import { SHOW_AUTH_UI } from "@/lib/auth/config";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfileMenu } from "./profile-menu";
import { ProfileMenuClient } from "./profile-menu-client";

export function ProfileMenuWrapper() {
  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 100,
        display: "flex",
        gap: "10px",
        alignItems: "center",
      }}
    >
      <SoundToggle />
      <ThemeToggle />
      <Suspense fallback={SHOW_AUTH_UI ? <ProfileMenuClient variant="signed-out" /> : null}>
        <ProfileMenu />
      </Suspense>
    </div>
  );
}
