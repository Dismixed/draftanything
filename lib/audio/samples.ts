const cache = new Map<string, HTMLAudioElement>();

export function preloadSamples(srcs: string[]): void {
  if (typeof window === "undefined") return;
  for (const src of srcs) {
    if (cache.has(src)) continue;
    const audio = new Audio(src);
    audio.preload = "auto";
    cache.set(src, audio);
  }
}

export function playSample(src: string, volume: number): void {
  if (typeof window === "undefined") return;
  const base = cache.get(src);
  const audio = base ? (base.cloneNode() as HTMLAudioElement) : new Audio(src);
  audio.volume = Math.min(1, Math.max(0, volume));
  void audio.play().catch(() => {
    // Autoplay or missing file — ignore.
  });
}
