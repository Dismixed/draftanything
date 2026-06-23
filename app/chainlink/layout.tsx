import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chainlink — Stim Labs",
  description: "Link words together in a chain. Each word pairs with the one before it.",
};

export default function ChainlinkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
