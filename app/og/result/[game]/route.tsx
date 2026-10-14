import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";
import { createResultImage } from "@/lib/og/share-image";
import { decodeResult } from "@/lib/share/result-link";

export async function GET(request: Request, { params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!(DAILY_GAMES as readonly string[]).includes(game)) return new Response("Not found", { status: 404 });

  const result = decodeResult(new URL(request.url).searchParams.get("r") ?? undefined);
  if (!result) return new Response("Not found", { status: 404 });

  const image = await createResultImage(game as DailyGameId, result);
  // The picture is fully determined by its URL, so caches can keep it for good.
  image.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return image;
}
