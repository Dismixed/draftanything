import type { PublicPlayerResult } from "@/features/results/projection";

interface RankingsProps {
  ranking: PublicPlayerResult[];
}

export function Rankings({ ranking }: RankingsProps) {
  const sorted = [...ranking].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity),
  );

  return (
    <div className="bg-white border rounded-xl">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">
        Final Rankings
      </h3>
      <ol className="divide-y">
        {sorted.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  player.rank === 1
                    ? "bg-yellow-100 text-yellow-800"
                    : player.rank === 2
                      ? "bg-gray-100 text-gray-600"
                      : player.rank === 3
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-50 text-gray-400"
                }`}
              >
                {player.rank ?? "-"}
              </span>
              <span className="font-medium text-gray-900">
                {player.displayName}
              </span>
            </div>
            {player.score !== null && (
              <span className="text-sm font-semibold text-gray-700">
                {player.score.toFixed(1)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
