import type { Metadata } from "next";
import FreeplayGame from "./game";

export const metadata: Metadata = {
  title: "Free Play — Brain Dead",
  description: "Brain Dead trivia free play.",
};

export default function FreeplayPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  return <FreeplayGame searchParams={searchParams} />;
}
