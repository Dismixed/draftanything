"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/track";

interface LandingLinkProps {
  href: string;
  cta: "start" | "join" | "topic";
  position: "hero" | "ideas" | "closing";
  topic?: string;
  className?: string;
  children: ReactNode;
}

/** A link into the room screen that reports which one was clicked. */
export function LandingLink({ href, cta, position, topic, className, children }: LandingLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track("draft_landing_cta_clicked", topic ? { cta, position, topic } : { cta, position })}
    >
      {children}
    </Link>
  );
}
