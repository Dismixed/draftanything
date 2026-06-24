import { Suspense } from "react";
import { ProfileMenu } from "./profile-menu";
import { ProfileMenuClient } from "./profile-menu-client";

export function ProfileMenuWrapper() {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100, display: "flex", gap: "10px", alignItems: "center" }}>
      <Suspense fallback={<ProfileMenuClient variant="signed-out" />}>
        <ProfileMenu />
      </Suspense>
    </div>
  );
}
