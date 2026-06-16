import type { PublicPlayerResult } from "@/features/results/projection";

interface WinnerRevealProps {
  winner: PublicPlayerResult;
  topic: string;
}

export function WinnerReveal({ winner, topic }: WinnerRevealProps) {
  return (
    <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-6 text-center">
      <p className="text-sm font-semibold text-yellow-700 uppercase tracking-wider mb-1">
        Winner
      </p>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">
        {winner.displayName}
      </h2>
      {winner.score !== null && (
        <p className="text-5xl font-black text-yellow-600 mb-2">
          {winner.score.toFixed(1)}
          <span className="text-lg font-semibold text-yellow-500">/10</span>
        </p>
      )}
      <p className="text-sm text-gray-500">
        Best draft of <span className="font-semibold text-gray-700">{topic}</span>
      </p>
    </div>
  );
}
