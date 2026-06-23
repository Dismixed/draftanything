import { ImageResponse } from "next/og";
import { getDraftRoomProjection } from "@/features/draft/projection";
import { buildPublicResult } from "@/features/results/projection";
import { loadResultCardFonts } from "@/features/results/result-card-fonts";
import { ResultCardImage } from "@/features/results/result-card-image";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;

  try {
    const projection = await getDraftRoomProjection(draftId);

    if (projection.draft.phase !== "COMPLETE") {
      return new Response("Draft not complete", { status: 404 });
    }

    const result = buildPublicResult(projection);
    const url = new URL(request.url);
    const isDownload = url.searchParams.get("download") === "1";
    const etag = `"${result.completedAt}"`;
    const fonts = await loadResultCardFonts();

    return new ImageResponse(<ResultCardImage result={result} />, {
      width: 1200,
      height: 630,
      fonts,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=3600, must-revalidate",
        ETag: etag,
        ...(isDownload
          ? { "Content-Disposition": `attachment; filename="draft-result-${draftId}.png"` }
          : {}),
      },
    });
  } catch {
    return new Response("Draft not found", { status: 404 });
  }
}
