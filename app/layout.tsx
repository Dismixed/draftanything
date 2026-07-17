import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Providers } from "./providers";
import { ProfileMenuWrapper } from "@/components/auth/profile-menu-wrapper";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";
import "./slippery-slope.css";
import "./anyguessr.css";
import "./freezeframes.css";
import "./ball-knowledge.css";
import "./getting-warmer.css";
import "./hot-takes.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Stim Games",
    template: "%s | Stim Games",
  },
  description: "A fresh rotation of quick daily games across geography, movies, trivia, chains, hot takes, and group-chat arguments.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Stim Games",
    description: "Quick daily games across geography, movies, trivia, chains, hot takes, and group-chat arguments.",
    url: "/",
    siteName: "Stim Games",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Stim Games",
    description: "Quick daily games across geography, movies, trivia, chains, hot takes, and group-chat arguments.",
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("stim-theme");document.documentElement.setAttribute("data-theme",t==="light"||t==="dark"?t:"dark");}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Outfit:wght@300;400;500;600;700&family=Syne:wght@700;800&family=Syne+Mono&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Teko:wght@500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
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
