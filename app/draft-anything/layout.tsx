import type { Metadata } from "next";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Draft Anything",
  description: "A room-code party game where friends draft any topic, defend every pick, and vote on the best roster.",
  alternates: {
    canonical: "/draft-anything",
  },
};

export default function DraftAnythingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("draft-anything")} />
      {children}
    </>
  );
}
