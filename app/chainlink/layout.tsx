import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chainlink — Stim Labs",
  description: "Guess the word chain. Solve the theme. Daily word puzzle.",
};

export default function ChainlinkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
