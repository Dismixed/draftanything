"use client";

import { useEffect, useRef } from "react";

let lobbyMountGeneration = 0;

function requestLeaveLobby(roomId: string) {
  void fetch(`/api/slippery-slope/${roomId}/leave`, {
    method: "POST",
    keepalive: true,
  });
}

export function useLeaveSsLobbyOnExit(roomId: string, phase: string) {
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const generation = ++lobbyMountGeneration;

    function leaveIfStillInLobby() {
      if (phaseRef.current !== "LOBBY") return;
      requestLeaveLobby(roomId);
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
  }, [roomId]);
}
