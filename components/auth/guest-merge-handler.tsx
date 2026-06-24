"use client";

import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/browser";

export function useGuestMerge() {
  const [merged, setMerged] = useState(false);
  const guestId = null;
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;

    const guestToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("guest_token="))
      ?.split("=")[1];

    if (!guestToken) return;

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;

      attempted.current = true;

      fetch("/api/auth/merge", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data.merged) {
            setMerged(true);
          }
        })
        .catch(() => {});
    });
  }, []);

  return { merged, guestId };
}
