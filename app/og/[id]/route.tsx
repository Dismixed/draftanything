import { GAME_IDS } from "@/lib/games/registry";
import type { ShareImageId } from "@/lib/og/metadata";
import { createShareImage } from "@/lib/og/share-image";

const IDS: readonly string[] = ["home", ...GAME_IDS];

// The images only change with a deploy, so they are drawn once at build time.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return IDS.map((id) => ({ id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IDS.includes(id)) return new Response("Not found", { status: 404 });
  return createShareImage(id as ShareImageId);
}
