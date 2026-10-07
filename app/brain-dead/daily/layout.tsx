import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brain Dead Daily",
  description: "Today's Brain Dead trivia challenge. One wrong answer and you're out.",
};

export default function DailyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
