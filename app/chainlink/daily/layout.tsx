import type { Metadata } from "next";
import { gameMetadata, getGameContent } from "@/lib/games/content";

// Same puzzle as /chainlink, so it carries the same title and points search engines there.
// A parent layout sets a plain title, which stops the root "%s | Stim Games" template
// reaching this page, hence the absolute title.
export const metadata: Metadata = {
  ...gameMetadata("chainlink"),
  title: { absolute: `${getGameContent("chainlink").title} | Stim Games` },
};

export default function DailyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
