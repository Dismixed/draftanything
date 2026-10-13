import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Stim Labs",
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
