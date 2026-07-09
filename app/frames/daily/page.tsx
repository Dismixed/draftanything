import type { Metadata } from "next";
import FramesGame from "@/components/frames/game";

export const metadata: Metadata = {
  title: "Frames — Daily Challenge",
  description:
    "Four rounds. Four frames. Name the movie, song, show, and album artist.",
};

export default function FramesDailyPage() {
  return <FramesGame />;
}
