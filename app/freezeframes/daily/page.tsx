import type { Metadata } from "next";
import FreezeFramesGame from "@/components/freezeframes/game";

export const metadata: Metadata = {
  title: "FreezeFrames — Daily Challenge",
  description:
    "Four rounds. Four frames. Name the movie, song, show, and album artist.",
};

export default function FreezeFramesDailyPage() {
  return <FreezeFramesGame />;
}
