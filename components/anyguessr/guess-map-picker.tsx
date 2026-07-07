"use client";

import dynamic from "next/dynamic";

const GuessMapPickerLeaflet = dynamic(() => import("./guess-map-picker-leaflet"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ag-surface)",
        color: "var(--ag-muted)",
        fontSize: "12px",
      }}
    >
      Loading map…
    </div>
  ),
});

interface Props {
  roundKey: number;
  onPick: (countryName: string) => void;
  embedded?: boolean;
}

export default function GuessMapPicker(props: Props) {
  return <GuessMapPickerLeaflet {...props} />;
}
