import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Stim Labs",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
