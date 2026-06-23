import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Chainlink — Stim Labs",
  description: "Daily word chain puzzle. Guess the chain, solve the theme.",
};

export default function DailyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
