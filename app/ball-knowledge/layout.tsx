import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ball Knowledge — Stim Games",
  description:
    "Name as many things as you can in 60 seconds — any category, any topic. Pizza toppings, cartoons, capitals, and more.",
};

export default function BallKnowledgeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
