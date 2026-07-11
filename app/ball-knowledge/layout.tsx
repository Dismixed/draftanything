import type { Metadata } from "next";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Ball Knowledge — Stim Games",
  description:
    "Name as many things as you can in 60 seconds — any category, any topic. Pizza toppings, cartoons, capitals, and more.",
  alternates: {
    canonical: "/ball-knowledge/daily",
  },
};

export default function BallKnowledgeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("ball-knowledge")} />
      {children}
    </>
  );
}
