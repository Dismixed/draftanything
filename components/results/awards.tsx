import type { PublicAward } from "@/features/results/projection";

interface AwardsProps {
  awards: PublicAward[];
}

const awardLabels: Record<string, { label: string; emoji: string }> = {
  bestPick: { label: "Best Pick", emoji: "🏆" },
  worstPick: { label: "Worst Pick", emoji: "💩" },
  biggestSteal: { label: "Biggest Steal", emoji: "🤑" },
};

export function Awards({ awards }: AwardsProps) {
  if (awards.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        Awards
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {awards.map((award) => {
          const meta = awardLabels[award.type] ?? {
            label: award.type,
            emoji: "",
          };
          return (
            <div
              key={award.type}
              className="bg-white border rounded-xl p-4 text-center"
            >
              <span className="text-2xl">{meta.emoji}</span>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                {meta.label}
              </p>
              <p className="font-semibold text-gray-900 mt-1">
                {award.itemName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                by {award.playerName}
                {award.pickNumber > 0 && ` (Pick #${award.pickNumber})`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
