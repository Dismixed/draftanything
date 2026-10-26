import {
  Bebas_Neue,
  IBM_Plex_Mono,
  Inter,
  JetBrains_Mono,
  Outfit,
  Playfair_Display,
  Space_Grotesk,
  Space_Mono,
  Syne,
  Syne_Mono,
  Teko,
} from "next/font/google";

// Self-hosted by next/font, so no page waits on a Google Fonts stylesheet. Every family is
// declared here because finish screens and game-card previews show other games' type on any
// route. A browser only downloads a family that text on the page uses; only Outfit and
// Playfair (home and AnyGuessr above the fold) are preloaded.
// Weights match the old Google Fonts request, so text renders exactly as before.

const playfairDisplay = Playfair_Display({
  weight: ["700", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair-display",
});

const outfit = Outfit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const syne = Syne({
  weight: ["700", "800"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-syne",
});

const syneMono = Syne_Mono({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-syne-mono",
});

const inter = Inter({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-space-grotesk",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-space-mono",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-bebas-neue",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-ibm-plex-mono",
});

const teko = Teko({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-teko",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-jetbrains-mono",
});

export const fontVariables = [
  playfairDisplay,
  outfit,
  syne,
  syneMono,
  inter,
  spaceGrotesk,
  spaceMono,
  bebasNeue,
  ibmPlexMono,
  teko,
  jetbrainsMono,
]
  .map((font) => font.variable)
  .join(" ");
