"use client";

import { useState } from "react";

interface ShareActionsProps {
  draftId: string;
  topic: string;
  rounds: number;
  draftType: string;
  judgingMode: string;
  maxPlayers: number;
}

export function ShareActions({
  draftId,
  topic,
  rounds,
  draftType,
  judgingMode,
  maxPlayers,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const resultUrl = `${window.location.origin}/results/${draftId}`;
  const imageUrl = `${window.location.origin}/api/results/${draftId}/image`;
  const imageDownloadUrl = `${imageUrl}?download=1`;

  const rematchParams = new URLSearchParams({
    topic,
    rounds: String(rounds),
    draftType,
    judgingMode,
    maxPlayers: String(maxPlayers),
  });
  const rematchUrl = `/?${rematchParams.toString()}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = resultUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Draft Anything: ${topic}`,
          url: resultUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {copied ? (
          <>
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy link
          </>
        )}
      </button>

      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      )}

      <a
        href={imageDownloadUrl}
        download
        className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download PNG
      </a>

      <a
        href={rematchUrl}
        className="inline-flex items-center gap-1.5 rounded-lg border bg-indigo-50 border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Rematch
      </a>
    </div>
  );
}
