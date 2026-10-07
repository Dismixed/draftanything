"use client";

import { useEffect, useState } from "react";
import type { ClientClue } from "@/lib/anyguessr/types";

/** How much of the screen the clue takes: shared with the map, enlarged, or tucked away. */
export type ClueView = "both" | "clue" | "map";

const CLUE_TYPE_LABEL: Record<string, string> = {
  environment: "Place",
  person: "Person",
  food: "Food",
  written_language: "Written language",
  landmark: "Place",
  flag: "Flag",
  currency: "Currency",
  jersey: "Jersey",
  brand: "Brand",
  wildlife: "Wildlife",
  audio: "Spoken language",
};

const CLUE_PROMPT: Record<string, string> = {
  person: "Where is this person from?",
  food: "Where is this dish from?",
  written_language: "Where is this written?",
  audio: "Where is this spoken?",
  brand: "Where is this brand from?",
  wildlife: "Where does this live?",
  currency: "Whose money is this?",
  jersey: "Whose jersey is this?",
};

function labelFor(clue: ClientClue): string {
  return CLUE_TYPE_LABEL[clue.type] ?? clue.type.charAt(0).toUpperCase() + clue.type.slice(1);
}

/**
 * The round's clue, floating over the map. The whole image is always shown (a cropped flag
 * can hide the part that gives it away), with a blurred copy filling the space around it.
 */
export default function ClueCard({
  clue,
  view = "both",
  onView,
  label,
}: {
  clue: ClientClue;
  view?: ClueView;
  /** Present on the play screen, where the card can be resized. Absent on the results page. */
  onView?: (next: ClueView) => void;
  /** Replaces the question beside the clue type, for example "Round 3" on the results page. */
  label?: string;
}) {
  const imageUrl = clue.metadata?.image_url ?? clue.metadata?.thumb_url;
  const audioUrl = clue.metadata?.audio_url;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loaded = loadedUrl === imageUrl;
  const minimised = view === "map";

  // Escape steps back from the enlarged clue.
  useEffect(() => {
    if (view !== "clue" || !onView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onView("both");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, onView]);

  return (
    <section className={`ag-clue${onView ? "" : " is-static"}`} aria-label={`Clue: ${labelFor(clue)}`}>
      <div className="ag-clue-bar">
        <span className="ag-clue-kind">
          <b>{labelFor(clue)}</b>
          {label ?? CLUE_PROMPT[clue.type] ?? "Which country is this?"}
        </span>
        {onView && <span className="ag-clue-btns">
          {view === "clue" ? (
            <button type="button" onClick={() => onView("both")} aria-label="Show the clue and the map">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              </svg>
            </button>
          ) : (
            <button type="button" onClick={() => onView("clue")} aria-label="Enlarge the clue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </button>
          )}
          <button type="button" onClick={() => onView("map")} aria-label="Minimise the clue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
        </span>}
      </div>

      <div className="ag-clue-media">
        {imageUrl && <div className="ag-clue-blur" style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }} aria-hidden="true" />}
        {imageUrl && !loaded && <span className="ag-clue-loading">Loading…</span>}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={clue.metadata?.alt_text ?? `${clue.type} clue`}
            onLoad={() => setLoadedUrl(imageUrl)}
            style={{ opacity: loaded ? 1 : 0 }}
          />
        )}

        {imageUrl && typeof clue.metadata?.caption === "string" && !minimised && (
          // A person's name: the round asks where they are from, not who they are.
          <div className="ag-clue-caption">{clue.metadata.caption}</div>
        )}

        {audioUrl && !minimised && <audio controls src={audioUrl} aria-label={`${clue.type} audio clue`} />}

        {!imageUrl && !audioUrl && <div className="ag-clue-text">{clue.content || "·"}</div>}

        {minimised && onView && (
          <button type="button" className="ag-clue-restore" onClick={() => onView("both")}>
            Show clue
          </button>
        )}
      </div>
    </section>
  );
}
