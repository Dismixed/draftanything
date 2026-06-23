export function createSoundGate(ms: number) {
  let lastPlayedAt = 0;
  return () => {
    const now = Date.now();
    if (now - lastPlayedAt < ms) return false;
    lastPlayedAt = now;
    return true;
  };
}
