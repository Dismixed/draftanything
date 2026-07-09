"use client";

import { create } from "zustand";
import type { SsRoomProjection } from "./schema";

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface SlipperySlopeStore {
  projection: SsRoomProjection | null;
  connectionStatus: ConnectionStatus;
  setProjection: (projection: SsRoomProjection) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useSlipperySlopeStore = create<SlipperySlopeStore>((set) => ({
  projection: null,
  connectionStatus: "connecting",
  setProjection: (projection) => set({ projection }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));

export function useLiveSsProjection(initial: SsRoomProjection): SsRoomProjection {
  const live = useSlipperySlopeStore((s) => s.projection);
  return live ?? initial;
}
