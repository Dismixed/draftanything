import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Providers } from "./providers";
import { ProfileMenuWrapper } from "@/components/auth/profile-menu-wrapper";
import "./globals.css";
import "./slippery-slope.css";
import "./anyguessr.css";
import "./frames.css";

export const metadata: Metadata = {
  title: "Stim Games",
  description: "Party games for any crowd.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Outfit:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Syne+Mono&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <ProfileMenuWrapper />
          {children}
        </Providers>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
