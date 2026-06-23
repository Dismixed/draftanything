import { ImageResponse } from "next/og";
import { getDraftRoomProjection } from "@/features/draft/projection";
import { buildPublicResult } from "@/features/results/projection";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;

  try {
    const projection = await getDraftRoomProjection(draftId);

    if (projection.draft.phase !== "COMPLETE") {
      return new Response("Draft not complete", { status: 404 });
    }

    const result = buildPublicResult(projection);

    const winnerName = result.winner?.displayName ?? "No winner";
    const winnerScore =
      result.winner != null && result.winner.score != null
        ? result.winner.score.toFixed(1)
        : "—";

    const rankLines = result.ranking
      .slice(0, 6)
      .map(
        (p, i) =>
          `${i + 1}. ${p.displayName}${p.score !== null ? ` — ${p.score.toFixed(1)}` : ""}`,
      )
      .join("\n");

    const url = new URL(_request.url);
    const isDownload = url.searchParams.get("download") === "1";
    const bestPick = result.awards.find((a) => a.type === "bestPick");

    const res = new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)",
            fontFamily: "sans-serif",
            color: "white",
            padding: "48px 64px",
          }}
        >
          {/* Branding */}
          <div
            style={{
              position: "absolute",
              top: 24,
              left: 48,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "#a5b4fc",
              textTransform: "uppercase",
            }}
          >
            Draft Anything
          </div>

          {/* Topic */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 8,
              color: "#e0e7ff",
            }}
          >
            {result.topic}
          </div>

          {/* Winner */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              textAlign: "center",
              marginBottom: 4,
              color: "#fbbf24",
            }}
          >
            {winnerName}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              textAlign: "center",
              marginBottom: 32,
              color: "#fde68a",
            }}
          >
            Score: {winnerScore}/10
          </div>

          {/* Rankings */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 18,
              color: "#c7d2fe",
              textAlign: "left",
              whiteSpace: "pre-line",
            }}
          >
            {rankLines}
          </div>

          {/* Best Pick */}
          {bestPick && (
            <div
              style={{
                position: "absolute",
                bottom: 48,
                left: 48,
                fontSize: 14,
                color: "#a5b4fc",
              }}
            >
              Best pick: {bestPick.itemName}
            </div>
          )}

          {/* Timestamp */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 48,
              fontSize: 12,
              color: "#6366f1",
            }}
          >
            stim-labs.app
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=3600",
          ...(isDownload
            ? { "Content-Disposition": `attachment; filename="draft-result-${draftId}.png"` }
            : {}),
        },
      },
    );

    return res;
  } catch {
    return new Response("Draft not found", { status: 404 });
  }
}
