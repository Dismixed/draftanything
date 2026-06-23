import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brain Dead — Stim Labs",
  description:
    "Answer until you can't. Get it wrong once — it's over. Questions get harder the deeper you go.",
};

export default function BrainDeadLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
