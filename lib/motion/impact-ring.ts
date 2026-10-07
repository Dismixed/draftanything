import { prefersReducedMotion } from "./prefers-reduced-motion";

export function impactRing(el: HTMLElement | null, color: string): void {
  if (!el || prefersReducedMotion()) return;
  const ring = document.createElement("div");
  ring.className = "anim-impact-ring";
  ring.setAttribute("aria-hidden", "true");
  ring.style.setProperty("--ring", color);
  el.appendChild(ring);
  window.setTimeout(() => ring.remove(), 460);
}
