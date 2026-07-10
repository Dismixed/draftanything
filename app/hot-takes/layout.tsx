import type { Metadata } from "next";
import "../hot-takes.css";

export const metadata: Metadata = {
  title: "Hot Takes — Stim Games",
  description: "Rank fifteen items S through D in today's debatable category.",
};

export default function HotTakesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
