import { create } from "zustand";
import type { DraftRoomProjection } from "./types";

export interface DraftStore {
  projection: DraftRoomProjection | null;
  connectionStatus: "connecting" | "connected" | "disconnected";
  setProjection: (projection: DraftRoomProjection) => void;
  setConnectionStatus: (status: "connecting" | "connected" | "disconnected") => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  projection: null,
  connectionStatus: "connecting",
  setProjection: (projection) => set({ projection }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
}));
