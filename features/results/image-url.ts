export function getResultImageUrl(
  draftId: string,
  completedAt: string,
  options?: { download?: boolean },
): string {
  const params = new URLSearchParams({ v: completedAt });
  if (options?.download) {
    params.set("download", "1");
  }
  return `/api/results/${draftId}/image?${params.toString()}`;
}
