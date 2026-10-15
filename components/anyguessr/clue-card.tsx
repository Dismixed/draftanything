"use client";

import { useEffect, useState } from "react";
import { clueDisplayUrl } from "@/lib/anyguessr/clue-image-url";
import type { ClientClue } from "@/lib/anyguessr/types";
import { usePhotoZoom } from "./use-photo-zoom";

/** How much of the screen the clue takes: shared with the map, enlarged, or tucked away. */
export type ClueView = "both" | "clue" | "map";

const CLUE_TYPE_LABEL: Record<string, string> = {
  environment: "Environment",
  person: "Person",
  food: "Food",
  written_language: "Written language",
  landmark: "Landmark",
  flag: "Flag",
  currency: "Currency",
  jersey: "Jersey",
  brand: "Brand",
  wildlife: "Wildlife",
  traditional_dress: "Traditional dress",
  satellite: "From space",
  street: "On the street",
  road_sign: "Road sign",
  audio: "Spoken language",
};

const CLUE_PROMPT: Record<string, string> = {
  person: "Where is this person from?",
  food: "Where is this dish from?",
  written_language: "Where is this written?",
  audio: "Where is this spoken?",
  brand: "Where is this brand from?",
  wildlife: "Where does this live?",
  traditional_dress: "Where is this worn?",
  satellite: "Where on Earth is this?",
  street: "Where is this street?",
  road_sign: "Where is this sign?",
  currency: "Whose money is this?",
  jersey: "Whose jersey is this?",
};

/**
 * Clue types whose images are self-hosted under neutral names, with a credit written by hand.
 * Other types still carry Commons' raw credit field ("Own work"), which is not fit to show.
 */
const CREDITED_TYPES = new Set(["satellite", "street", "road_sign"]);

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
  const storedUrl = clue.metadata?.image_url ?? clue.metadata?.thumb_url;
  const sizedUrl = storedUrl ? clueDisplayUrl(storedUrl) : undefined;
  // A screen-sized copy is asked for first; if there is none, the stored image is shown.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = sizedUrl && sizedUrl === failedUrl ? storedUrl : sizedUrl;
  // The small copy arrives first and fills the frame, blurred, while the photo loads.
  const blurUrl = clue.metadata?.thumb_url ?? imageUrl;
  const audioUrl = clue.metadata?.audio_url;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const loaded = loadedUrl === imageUrl;
  const minimised = view === "map";
  // The play screen's photo can be zoomed; the results page and the tucked-away card cannot.
  const { frameRef, zoom, zoomed, dragging, reset } = usePhotoZoom(Boolean(onView && imageUrl) && !minimised);
  // The frame changes size with the view, so a zoomed photo starts over.
  const changeView = (next: ClueView) => {
    reset();
    onView?.(next);
  };

  // The guess bar can tuck the card away too, so a view changed from outside also starts over.
  useEffect(() => reset(), [view, reset]);

  // Escape steps back from the enlarged clue.
  useEffect(() => {
    if (view !== "clue" || !onView) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        reset();
        onView("both");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, onView, reset]);

  return (
    <section className={`ag-clue${onView ? "" : " is-static"}`} aria-label={`Clue: ${labelFor(clue)}`}>
      <div className="ag-clue-bar">
        <span className="ag-clue-kind">
          <b>{labelFor(clue)}</b>
          {label ?? CLUE_PROMPT[clue.type] ?? "Which country is this?"}
        </span>
        {onView && <span className="ag-clue-btns">
          {view === "clue" ? (
            <button type="button" onClick={() => changeView("both")} aria-label="Show the clue and the map">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              </svg>
            </button>
          ) : (
            <button type="button" onClick={() => changeView("clue")} aria-label="Enlarge the clue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </button>
          )}
          <button type="button" onClick={() => changeView("map")} aria-label="Minimise the clue">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
            </svg>
          </button>
        </span>}
      </div>

      <div
        ref={frameRef}
        className={`ag-clue-media${zoomed ? " is-zoomed" : ""}${dragging && zoomed ? " is-dragging" : ""}`}
      >
        {blurUrl && <div className="ag-clue-blur" style={{ backgroundImage: `url(${JSON.stringify(blurUrl)})` }} aria-hidden="true" />}
        {imageUrl && !loaded && <span className="ag-clue-loading">Loading…</span>}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={clue.metadata?.alt_text ?? `${clue.type} clue`}
            onLoad={() => setLoadedUrl(imageUrl)}
            onError={() => setFailedUrl(imageUrl)}
            draggable={false}
            style={{
              opacity: loaded ? 1 : 0,
              transform: zoomed ? `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})` : undefined,
            }}
          />
        )}

        {zoomed && (
          <button type="button" className="ag-clue-unzoom" onClick={reset}>
            Reset zoom
          </button>
        )}

        {imageUrl && typeof clue.metadata?.caption === "string" && !minimised && (
          // A person's name: the round asks where they are from, not who they are.
          <div className="ag-clue-caption">{clue.metadata.caption}</div>
        )}

        {imageUrl && CREDITED_TYPES.has(clue.type) && typeof clue.metadata?.credit === "string" && !minimised && (
          // The image's licence asks for credit. It names the source, never the place.
          <div className="ag-clue-credit">{clue.metadata.credit}</div>
        )}

        {audioUrl && !minimised && <audio controls src={audioUrl} aria-label={`${clue.type} audio clue`} />}

        {!imageUrl && !audioUrl && <div className="ag-clue-text">{clue.content || "·"}</div>}

        {minimised && onView && (
          <button type="button" className="ag-clue-restore" onClick={() => changeView("both")}>
            Show clue
          </button>
        )}
      </div>
    </section>
  );
}
