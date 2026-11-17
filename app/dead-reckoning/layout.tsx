import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Work_Sans } from "next/font/google";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";
import "./dead-reckoning.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-dr-display" });
const body = Work_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-dr-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-dr-mono" });

export const metadata: Metadata = gameMetadata("dead-reckoning");

export default function DeadReckoningLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <JsonLdScript data={buildGameJsonLd("dead-reckoning")} />
      {children}
    </div>
  );
}
