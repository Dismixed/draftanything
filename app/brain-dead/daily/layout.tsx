import type { Metadata } from "next";

export const metadata: Metadata = {
  // A parent layout sets a plain title, which stops the root "%s | Stim Games" template reaching this page.
  title: { absolute: "Brain Dead Daily | Stim Games" },
  description: "Today's Brain Dead trivia challenge. One wrong answer and you're out.",
};

export default function DailyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
