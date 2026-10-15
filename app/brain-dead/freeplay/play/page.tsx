import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";
import FreeplayGame from "./game";

export const metadata: Metadata = {
  title: "Free Play — Brain Dead",
  description: "Brain Dead trivia free play.",
  // Every category shares this page, so search engines are pointed at the picker.
  alternates: { canonical: "/brain-dead/freeplay" },
  robots: NOINDEX,
};

export default function FreeplayPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  return <FreeplayGame searchParams={searchParams} />;
}
