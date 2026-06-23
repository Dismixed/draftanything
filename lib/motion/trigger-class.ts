export function triggerAnimation(
  el: HTMLElement | null,
  className: string,
  durationMs: number,
): void {
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), durationMs);
}
