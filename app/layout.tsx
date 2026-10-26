import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Providers } from "./providers";
import { ProfileMenuWrapper } from "@/components/auth/profile-menu-wrapper";
import { shareImage } from "@/lib/og/metadata";
import { SITE_URL } from "@/lib/seo";
import { fontVariables } from "./fonts";
import "./globals.css";
import "./slippery-slope.css";
import "./anyguessr.css";
import "./brain-dead.css";
import "./chainlink.css";
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
  openGraph: {
    title: "Stim Games",
    description: "Quick daily games across geography, movies, trivia, chains, hot takes, and group-chat arguments.",
    url: "/",
    siteName: "Stim Games",
    type: "website",
    images: [shareImage("home", "Stim Games: free daily games")],
  },
  // Title, description and image are left out so each page's own are used.
  twitter: { card: "summary_large_image" },
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
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("stim-theme");t=t==="light"||t==="dark"?t:"light";document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m);}m.setAttribute("content",t==="light"?"#fffdfa":"#07090f");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`,
          }}
        />
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
