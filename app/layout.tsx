import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Draft Anything",
  description: "A live draft room for any topic.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
