import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono, Work_Sans } from "next/font/google";
import "./dead-reckoning.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"], variable: "--font-dr-display" });
const body = Work_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-dr-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-dr-mono" });

/** Soft launch: reachable by link, kept out of search and off the lineup. */
export const metadata: Metadata = {
  title: "Dead Reckoning",
  description: "A daily estimation voyage. Seven questions, one number each. The closer your guess, the farther you sail.",
  robots: { index: false, follow: false },
};

export default function DeadReckoningLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={`${display.variable} ${body.variable} ${mono.variable}`}>{children}</div>;
}
