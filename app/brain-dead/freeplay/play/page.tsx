import type { Metadata } from "next";
import FreeplayGame from "./game";

export const metadata: Metadata = {
  title: "Free Play — Brain Dead",
  description: "Brain Dead trivia free play.",
  // Every category shares this page, so search engines are pointed at the picker.
  alternates: { canonical: "/brain-dead/freeplay" },
};

export default function FreeplayPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  return <FreeplayGame searchParams={searchParams} />;
}
