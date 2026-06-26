"use client";

import dynamic from "next/dynamic";

const GuessMapLeaflet = dynamic(() => import("./guess-map-leaflet"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: 240,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "10px",
        border: "1px solid #1d2440",
        background: "#0a1628",
        color: "#707790",
        fontSize: "12px",
      }}
    >
      Loading map…
    </div>
  ),
});

interface Props {
  answerLat: number;
  answerLng: number;
  guessLat: number | null;
  guessLng: number | null;
  answerCca3: string;
  guessCca3: string | null;
  answerLabel: string;
  guessLabel: string;
}

export default function GuessMap(props: Props) {
  return <GuessMapLeaflet {...props} />;
}
