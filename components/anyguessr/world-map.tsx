"use client";

import dynamic from "next/dynamic";
import type { WorldMapProps } from "./world-map-leaflet";

export type { MapReveal, MapSelection } from "./world-map-leaflet";

// Leaflet touches `window` on import, so it only loads in the browser.
const WorldMapLeaflet = dynamic(() => import("./world-map-leaflet"), {
  ssr: false,
  loading: () => <div className="ag-map-loading">Loading map…</div>,
});

export default function WorldMap(props: WorldMapProps) {
  return <WorldMapLeaflet {...props} />;
}
