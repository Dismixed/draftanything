import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unlimited Chainlink — Stim Labs",
  description: "Endless word chain puzzles. Play as many as you want.",
};

export default function UnlimitedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
