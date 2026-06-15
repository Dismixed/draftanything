"use client";

import { useState } from "react";
import type { SafeCommentary } from "@/features/draft/types";

interface AiDeskProps {
  commentary: SafeCommentary[];
}

const TAG_LABELS: Record<string, { label: string; color: string }> = {
  reach: { label: "Reach", color: "bg-orange-100 text-orange-700" },
  steal: { label: "Steal", color: "bg-emerald-100 text-emerald-700" },
  run: { label: "Run", color: "bg-blue-100 text-blue-700" },
  trend: { label: "Trend", color: "bg-purple-100 text-purple-700" },
  surprise: { label: "Surprise", color: "bg-pink-100 text-pink-700" },
};

export function AiDesk({ commentary }: AiDeskProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sorted = [...commentary].sort(
    (a, b) => b.id.localeCompare(a.id),
  );
  const latest = sorted[0] ?? null;
  const history = sorted.slice(1);

  return (
    <section aria-label="AI Commissioner Commentary">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full text-left text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2 px-1 py-1 hover:text-gray-700 transition-colors"
      >
        {collapsed ? "▲ AI Commentary" : "▼ AI Commentary"}
      </button>

      {!collapsed && (
        <div className="space-y-2">
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {latest ? `New commentary: ${latest.text}` : ""}
          </div>

          {latest ? (
            <div className="bg-white rounded-lg border p-3 shadow-sm">
              <p className="text-sm text-gray-900 leading-relaxed">{latest.text}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {latest.triggerTags.map((tag) => {
                  const meta = TAG_LABELS[tag] ?? {
                    label: tag,
                    color: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-gray-400">
                AI commissioner commentary will appear here after notable picks.
              </p>
            </div>
          )}

          {history.length > 0 && (
            <details className="group">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 select-none">
                Previous commentary ({history.length})
              </summary>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {history.map((c) => (
                  <div key={c.id} className="bg-white rounded border p-2.5">
                    <p className="text-sm text-gray-800">{c.text}</p>
                    {c.triggerTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.triggerTags.map((tag) => {
                          const meta = TAG_LABELS[tag] ?? {
                            label: tag,
                            color: "bg-gray-100 text-gray-600",
                          };
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}
                            >
                              {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
