import type { Metadata } from "next";
import FreezeFramesGame from "@/components/freezeframes/game";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FreezeFrames — Daily Challenge",
  description:
    "Four rounds. Four frames. Name the movie, song, show, and album artist.",
  alternates: {
    canonical: "/freezeframes/daily",
  },
};

export default function FreezeFramesDailyPage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("freezeframes")} />
      <FreezeFramesGame />
    </>
  );
}
