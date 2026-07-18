import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Chain Link — Stim Labs",
  description: "Daily word chain puzzle. Link 5 words — apple juice, juice box, and so on.",
};

export default function DailyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
