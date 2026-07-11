import type { Metadata } from "next";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Brain Dead — Stim Labs",
  description:
    "Answer until you can't. Get it wrong once — it's over. Questions get harder the deeper you go.",
  alternates: {
    canonical: "/brain-dead",
  },
};

export default function BrainDeadLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("brain-dead")} />
      {children}
    </>
  );
}
