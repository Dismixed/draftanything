"use client";

import { useEffect, useState } from "react";

interface ShareActionsProps {
  draftId: string;
  topic: string;
}

export function ShareActions({
  draftId,
  topic,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  const imageDownloadUrl = `/api/results/${draftId}/image?download=1`;

  function getResultUrl() {
    return `${window.location.origin}/results/${draftId}`;
  }

  async function copyLink() {
    const resultUrl = getResultUrl();
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
          url: getResultUrl(),
        });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      <button
        type="button"
        onClick={copyLink}
        className="btn-gold"
        style={{ width: 'auto', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        {copied ? (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy link
          </>
        )}
      </button>

      {canShare && (
        <button
          type="button"
          onClick={handleShare}
          className="btn-gold"
          style={{ width: 'auto', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share
        </button>
      )}

      <a
        href={imageDownloadUrl}
        download
        className="btn-ghost"
        style={{ width: 'auto', padding: '10px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download PNG
      </a>
    </div>
  );
}
