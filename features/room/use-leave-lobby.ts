"use client";

import { useEffect, useRef } from "react";

let lobbyMountGeneration = 0;

function requestLeaveLobby(draftId: string) {
  void fetch(`/api/drafts/${draftId}/leave`, {
    method: "POST",
    keepalive: true,
  });
}

/**
 * Removes the current player from a LOBBY when they navigate away or close the
 * tab. Skips leave when the draft advances to another phase (e.g. pool review).
 */
export function useLeaveLobbyOnExit(draftId: string, phase: string) {
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const generation = ++lobbyMountGeneration;

    function leaveIfStillInLobby() {
      if (phaseRef.current !== "LOBBY") return;
      requestLeaveLobby(draftId);
    }

    function onPageHide() {
      leaveIfStillInLobby();
    }

    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      const mountGeneration = generation;
      window.setTimeout(() => {
        if (mountGeneration !== lobbyMountGeneration) return;
        leaveIfStillInLobby();
      }, 100);
    };
  }, [draftId]);
}
