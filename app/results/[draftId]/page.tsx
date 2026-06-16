import { getDraftRoomProjection } from "@/features/draft/projection";
import { buildPublicResult } from "@/features/results/projection";
import { WinnerReveal } from "@/components/results/winner-reveal";
import { Rankings } from "@/components/results/rankings";
import { Awards } from "@/components/results/awards";
import { ShareActions } from "@/components/results/share-actions";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ draftId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { draftId } = await params;
  const imageUrl = `/api/results/${draftId}/image`;

  try {
    const projection = await getDraftRoomProjection(draftId);
    if (projection.draft.phase !== "COMPLETE") {
      return { title: `Results — ${projection.draft.topic} — Draft Anything` };
    }

    const result = buildPublicResult(projection);
    return {
      title: `Results: ${result.topic} — Draft Anything`,
      description: result.winner
        ? `${result.winner.displayName} wins! Score: ${result.winner.score?.toFixed(1)}/10`
        : `Results for ${result.topic}`,
      openGraph: {
        title: `Draft Anything: ${result.topic}`,
        description: result.winner
          ? `${result.winner.displayName} wins with ${result.winner.score?.toFixed(1)}/10!`
          : `Results for ${result.topic}`,
        images: [{ url: imageUrl, width: 1200, height: 630 }],
      },
    };
  } catch {
    return { title: "Results — Draft Anything" };
  }
}

export default async function ResultsPage({ params }: Props) {
  const { draftId } = await params;

  let projection;
  try {
    projection = await getDraftRoomProjection(draftId);
  } catch {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Draft not found</h1>
          <p className="text-gray-500 mt-2">This draft room does not exist.</p>
        </div>
      </main>
    );
  }

  if (projection.draft.phase !== "COMPLETE") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">
            {projection.draft.topic}
          </h1>
          <p className="text-gray-500 mt-2">
            Results are not ready yet. The draft is currently in the{" "}
            <span className="font-semibold text-gray-700">
              {projection.draft.phase}
            </span>{" "}
            phase.
          </p>
        </div>
      </main>
    );
  }

  const result = buildPublicResult(projection);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Draft Complete
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {result.topic}
          </h1>
        </div>

        {/* Winner */}
        {result.winner && (
          <WinnerReveal winner={result.winner} topic={result.topic} />
        )}

        {/* Rankings */}
        <Rankings ranking={result.ranking} />

        {/* Awards */}
        {result.awards.length > 0 && <Awards awards={result.awards} />}

        {/* Explanation */}
        {result.explanation && (
          <div className="bg-white border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Judge&apos;s Explanation
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {result.explanation}
            </p>
          </div>
        )}

        {/* Share */}
        <ShareActions
          draftId={draftId}
          topic={result.topic}
          rounds={result.rounds}
          draftType={result.draftType}
          judgingMode={result.judgingMode}
          maxPlayers={projection.draft.maxPlayers}
        />

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-4 pb-8">
          Draft Anything — results are public and permanent.
        </p>
      </div>
    </main>
  );
}
