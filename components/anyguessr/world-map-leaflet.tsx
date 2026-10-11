"use client";

import { cca3FromFeature, lookupCca3AtPoint } from "@/lib/anyguessr/country-at-point";
import { getNameForCca3 } from "@/lib/anyguessr/country-geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion/prefers-reduced-motion";
import { GeoJSON, MapContainer, Marker, Polyline, useMap, useMapEvents } from "react-leaflet";

export interface MapSelection {
  /** Null when the guess was typed and is not a country the map knows. */
  cca3: string | null;
  name: string;
  lat: number;
  lng: number;
}

/** How far the staged reveal after a guess has got. Each step builds on the one before. */
export interface MapReveal {
  /** The camera has pushed in from the whole world to frame the guess and the answer. */
  framed: boolean;
  /** The line from the guess to the answer is drawn. */
  line: boolean;
  /** The answer country is lit up. */
  answer: boolean;
}

export interface WorldMapProps {
  /** The country currently picked as the guess. */
  selection?: MapSelection | null;
  /** Present on the play screen: called when a country, or open sea, is clicked. */
  onSelect?: (next: MapSelection | null) => void;
  /** Present after a guess: the right country, and where the player guessed. */
  answer?: { cca3: string; lat: number; lng: number };
  guess?: { cca3: string | null; lat: number | null; lng: number | null };
  /** Room to leave clear of the play screen's header and guess bar when framing the world. */
  inset?: { top: number; bottom: number };
  /** After a guess: reveal in steps. Leave out to show the guess and the answer at once. */
  reveal?: MapReveal;
  /** After a guess: called once the map and the country outlines are loaded and ready to be shown. */
  onReady?: () => void;
}

/** The game's own country outlines (Natural Earth, public domain). No outside map tiles. */
const WORLD_URL = "/anyguessr/world-countries-110m.geojson";

let worldCache: GeoJSON.FeatureCollection | null = null;

function useWorld(): GeoJSON.FeatureCollection | null {
  const [world, setWorld] = useState(worldCache);

  useEffect(() => {
    if (worldCache) return;
    let cancelled = false;
    fetch(WORLD_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: GeoJSON.FeatureCollection | null) => {
        if (!json) return;
        // Antarctica is never an answer and would take a third of the frame.
        worldCache = { ...json, features: json.features.filter((f) => cca3FromFeature(f) !== "ATA") };
        if (!cancelled) setWorld(worldCache);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return world;
}

function featuresFor(world: GeoJSON.FeatureCollection, cca3: string): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: world.features.filter((f) => cca3FromFeature(f) === cca3) };
}

/** What the play screen frames: every country that can be an answer. */
const WORLD_FRAME: L.LatLngBoundsExpression = [
  [-56, -168],
  [78, 180],
];

const pulseIcon = L.divIcon({
  className: "ag-map-marker",
  html: '<span class="ag-map-pulse"></span>',
  iconSize: [0, 0],
});

function tagIcon(label: string, kind: "pick" | "guess") {
  return L.divIcon({
    className: "ag-map-marker",
    html: `<span class="ag-map-tag is-${kind}">${label.replace(/[&<>]/g, "")}</span>`,
    iconSize: [0, 0],
  });
}

/** Clicks pick a country. A drag that ends over a country is not a click. */
function ClickToPick({ world, onSelect }: { world: GeoJSON.FeatureCollection; onSelect: (next: MapSelection | null) => void }) {
  const dragged = useRef(false);

  useMapEvents({
    dragstart: () => {
      dragged.current = true;
    },
    dragend: () => {
      window.setTimeout(() => {
        dragged.current = false;
      }, 0);
    },
    click(e) {
      if (dragged.current) return;
      const { lat, lng } = e.latlng;
      const cca3 = lookupCca3AtPoint(lat, lng, world);
      const name = cca3 ? getNameForCca3(cca3) : null;
      onSelect(cca3 && name ? { cca3, name, lat, lng } : null);
    },
  });

  return null;
}

/** Frames the whole world on the play screen, and keeps a typed pick in view. */
function PlayView({ selection, inset }: { selection: MapSelection | null; inset: { top: number; bottom: number } }) {
  const map = useMap();

  useEffect(() => {
    const frame = () => {
      map.fitBounds(
        [
          [-56, -168],
          [78, 180],
        ],
        { paddingTopLeft: [12, inset.top], paddingBottomRight: [12, inset.bottom], animate: false },
      );
      map.setMinZoom(map.getZoom() - 0.5);
    };
    frame();
    map.on("resize", frame);
    return () => {
      map.off("resize", frame);
    };
  }, [map, inset.top, inset.bottom]);

  useEffect(() => {
    if (!selection) return;
    const at = L.latLng(selection.lat, selection.lng);
    if (!map.getBounds().pad(-0.2).contains(at)) map.flyTo(at, Math.max(map.getZoom(), 3), { duration: 0.6 });
  }, [map, selection]);

  return null;
}

/**
 * After a guess: frame the right country together with where the player guessed. In a staged reveal
 * it starts on the whole world and, once `framed`, the camera flies in to the pair.
 */
function RecapView({ bounds, staged, framed }: { bounds: L.LatLngBounds | null; staged: boolean; framed: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    const fit = { padding: [34, 34] as L.PointTuple, maxZoom: 6 };
    if (!staged) {
      map.fitBounds(bounds, { ...fit, animate: false });
    } else if (!framed) {
      map.fitBounds(WORLD_FRAME, { padding: [12, 12], animate: false });
    } else if (prefersReducedMotion()) {
      map.fitBounds(bounds, { ...fit, animate: false });
    } else {
      map.flyToBounds(bounds, { ...fit, duration: 1.1 });
    }
  }, [map, bounds, staged, framed]);

  return null;
}

/** The line from the guess to the answer, which draws itself in when the reveal reaches it. */
function GuessLine({ from, to, draw }: { from: L.LatLng; to: L.LatLngExpression; draw: boolean }) {
  const line = useRef<L.Polyline>(null);

  useEffect(() => {
    const path = line.current?.getElement();
    if (!path || !draw) return;
    // Normalised length, so the dash animation does not depend on the zoom the camera is at.
    path.setAttribute("pathLength", "1");
    path.classList.add("is-draw");
  }, [draw]);

  return <Polyline ref={line} positions={[from, to]} interactive={false} pathOptions={{ className: "ag-map-line" }} />;
}

export default function WorldMapLeaflet({ selection = null, onSelect, answer, guess, inset, reveal, onReady }: WorldMapProps) {
  const world = useWorld();
  const playing = Boolean(onSelect);

  useEffect(() => {
    if (world && !playing) onReady?.();
  }, [world, playing, onReady]);

  const answerShape = useMemo(() => (world && answer ? featuresFor(world, answer.cca3) : null), [world, answer]);
  const pickCca3 = selection?.cca3 ?? null;
  const pickShape = useMemo(() => (world && pickCca3 ? featuresFor(world, pickCca3) : null), [world, pickCca3]);

  const guessAt = guess && guess.lat !== null && guess.lng !== null ? L.latLng(guess.lat, guess.lng) : null;
  const missed = Boolean(answer && guessAt && guess?.cca3 !== answer.cca3);
  const showLine = reveal ? reveal.line : true;
  const showAnswer = reveal ? reveal.answer : true;

  const recapBounds = useMemo(() => {
    if (!answer) return null;
    const bounds = answerShape?.features.length
      ? L.geoJSON(answerShape).getBounds()
      : L.latLng(answer.lat, answer.lng).toBounds(600_000);
    if (missed && guessAt) bounds.extend(guessAt);
    return bounds;
    // guessAt is rebuilt each render; its coordinates are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, answerShape, missed, guess?.lat, guess?.lng]);

  return (
    <MapContainer
      className={`ag-map${playing ? " is-playing" : ""}`}
      center={[25, 10]}
      zoom={2}
      minZoom={1}
      maxZoom={7}
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={90}
      maxBounds={[
        [-80, -230],
        [88, 230],
      ]}
      maxBoundsViscosity={0.7}
      attributionControl={false}
      zoomControl={false}
      style={{ width: "100%", height: "100%" }}
    >
      {world && (
        <GeoJSON
          data={world}
          style={{ className: "ag-land" }}
          onEachFeature={(feature, layer) => {
            const cca3 = cca3FromFeature(feature);
            const name = (cca3 && getNameForCca3(cca3)) || (feature.properties?.NAME as string | undefined);
            if (name) layer.bindTooltip(name, { sticky: true, direction: "top", offset: [0, -8], className: "ag-map-tip" });
          }}
        />
      )}

      {playing && world && onSelect && <ClickToPick world={world} onSelect={onSelect} />}
      {playing && <PlayView selection={selection} inset={inset ?? { top: 12, bottom: 12 }} />}
      {!playing && <RecapView bounds={recapBounds} staged={Boolean(reveal)} framed={reveal ? reveal.framed : true} />}

      {pickShape && selection && (
        <GeoJSON key={`pick-${pickCca3}`} data={pickShape} interactive={false} style={{ className: "ag-land-pick" }} />
      )}
      {selection && playing && (
        <Marker position={[selection.lat, selection.lng]} icon={tagIcon(selection.name, "pick")} interactive={false} />
      )}

      {showAnswer && answerShape && answer && (
        <GeoJSON key={`answer-${answer.cca3}`} data={answerShape} interactive={false} style={{ className: "ag-land-answer" }} />
      )}
      {reveal && showAnswer && answer && <Marker position={[answer.lat, answer.lng]} icon={pulseIcon} interactive={false} />}
      {missed && guessAt && answer && (
        <>
          {showLine && <GuessLine from={guessAt} to={[answer.lat, answer.lng]} draw={Boolean(reveal)} />}
          <Marker position={guessAt} icon={tagIcon("Your guess", "guess")} interactive={false} />
        </>
      )}
    </MapContainer>
  );
}
