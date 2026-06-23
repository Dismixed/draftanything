import { getDraftRoomProjection } from "@/features/draft/projection";
import { buildPublicResult } from "@/features/results/projection";
import { ResultsBody } from "@/components/results/results-body";
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
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: 'var(--text)', fontSize: 'clamp(24px,6vw,32px)', margin: '0 0 8px' }}>
            Draft not found
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>This draft room does not exist.</p>
        </div>
      </main>
    );
  }

  if (projection.draft.phase !== "COMPLETE") {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', color: 'var(--text)', fontSize: 'clamp(24px,6vw,32px)', margin: '0 0 8px' }}>
            {projection.draft.topic}
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
            Results are not ready yet. The draft is currently in the{" "}
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
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
    <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {/* Atmospheric gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(201,168,76,0.07), transparent)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px 80px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px' }}>
            Draft Complete
          </p>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontStyle: 'italic', fontSize: 'clamp(24px,6vw,32px)', color: 'var(--text)', margin: 0 }}>
            {result.topic}
          </h1>
        </div>

        <ResultsBody
          result={result}
          draftId={draftId}
        />

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', opacity: 0.4, paddingTop: '20px', margin: 0 }}>
          Draft Anything — results are public and permanent.
        </p>
      </div>
    </main>
  );
}
