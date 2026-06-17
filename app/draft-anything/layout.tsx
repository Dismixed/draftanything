import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Draft Anything",
  description: "A live draft room for any topic.",
};

export default function DraftAnythingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
