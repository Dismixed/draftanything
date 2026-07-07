"use client";

import { boundsForPoints, isValidLatLng } from "@/lib/anyguessr/map-projection";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";

interface Props {
  answerLat: number;
  answerLng: number;
  guessLat: number | null;
  guessLng: number | null;
  answerCca3: string;
  guessCca3: string | null;
  answerLabel: string;
  guessLabel: string;
}

const MAP_HEIGHT = 260;

const BASEMAP_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";

const MAP_LABEL_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";

const LABEL_ATTRIBUTION =
  'Labels &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const BASEMAP_ATTRIBUTION = `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>. ${LABEL_ATTRIBUTION}`;

const MAP_BACKGROUND = "#e8eef4";
const BORDER_COLOR = "#64748b";
const BORDER_OPACITY = 0.28;

const COUNTRY_GEOJSON_BASE =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries";

const WORLD_COUNTRY_BORDERS_URL = "/anyguessr/world-countries-110m.geojson";

let worldBordersCache: GeoJSON.GeoJsonObject | null = null;

const ANSWER_FILL = "#34d399";
const ANSWER_STROKE = "#10b981";
const GUESS_PIN = "#f87171";

const WORLD_BORDER_STYLE = {
  fillOpacity: 0,
  color: BORDER_COLOR,
  weight: 0.65,
  opacity: BORDER_OPACITY,
};

function guessPinIcon() {
  return L.divIcon({
    className: "ag-map-pin",
    html: `<span class="ag-map-pin-guess" aria-hidden="true"></span>`,
    iconSize: [22, 30],
    iconAnchor: [11, 28],
    popupAnchor: [0, -24],
  });
}

function FitMapToPoints({
  answer,
  guess,
}: {
  answer: { lat: number; lng: number };
  guess: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const bounds = boundsForPoints(answer, guess);
    const leafletBounds = L.latLngBounds(
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng],
    );
    map.fitBounds(leafletBounds, { padding: [36, 36], maxZoom: 8 });
  }, [map, answer.lat, answer.lng, guess?.lat, guess?.lng]);

  return null;
}

function WorldCountryBorders() {
  const [data, setData] = useState<GeoJSON.GeoJsonObject | null>(worldBordersCache);

  useEffect(() => {
    if (worldBordersCache) return;
    fetch(WORLD_COUNTRY_BORDERS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) {
          worldBordersCache = json as GeoJSON.GeoJsonObject;
          setData(worldBordersCache);
        }
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  return <GeoJSON data={data} style={WORLD_BORDER_STYLE} />;
}

function AnswerCountryHighlight({ cca3 }: { cca3: string }) {
  const [data, setData] = useState<GeoJSON.GeoJsonObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(`${COUNTRY_GEOJSON_BASE}/${cca3}.geo.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json as GeoJSON.GeoJsonObject);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cca3]);

  if (!data) return null;

  return (
    <GeoJSON
      data={data}
      pathOptions={{
        color: ANSWER_STROKE,
        fillColor: ANSWER_FILL,
        fillOpacity: 0.34,
        weight: 1.5,
        opacity: 0.75,
      }}
    />
  );
}

export default function GuessMapLeaflet({
  answerLat,
  answerLng,
  guessLat,
  guessLng,
  answerCca3,
  guessCca3,
  answerLabel,
  guessLabel,
}: Props) {
  const guessIcon = useMemo(() => guessPinIcon(), []);

  if (!isValidLatLng(answerLat, answerLng)) {
    return (
      <div
        style={{
          width: "100%",
          height: MAP_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "10px",
          border: "1px solid #1d2440",
          background: "#0a1628",
          color: "#707790",
          fontSize: "12px",
        }}
      >
        Map unavailable for this round
      </div>
    );
  }

  const answer = { lat: answerLat, lng: answerLng };
  const guess =
    guessLat != null && guessLng != null && isValidLatLng(guessLat, guessLng)
      ? { lat: guessLat, lng: guessLng }
      : null;

  const showGuessPin = guess && guessCca3;
  const mapKey = `${answerCca3},${answerLat},${answerLng},${guessCca3 ?? ""},${guessLat ?? ""},${guessLng ?? ""}`;

  return (
    <div
      className="ag-guess-map"
      style={{
        width: "100%",
        borderRadius: "10px",
        overflow: "hidden",
        border: "1px solid #1d2440",
        background: MAP_BACKGROUND,
      }}
    >
      <MapContainer
        key={mapKey}
        center={[answerLat, answerLng]}
        zoom={4}
        minZoom={2}
        maxZoom={12}
        scrollWheelZoom
        worldCopyJump
        style={{ height: MAP_HEIGHT, width: "100%", background: MAP_BACKGROUND }}
        attributionControl
      >
        <TileLayer
          url={BASEMAP_URL}
          subdomains="abcd"
          attribution={BASEMAP_ATTRIBUTION}
          maxZoom={16}
        />

        <AnswerCountryHighlight cca3={answerCca3} />
        <WorldCountryBorders />

        <TileLayer
          url={MAP_LABEL_TILES}
          subdomains="abcd"
          maxZoom={16}
          maxNativeZoom={7}
          zIndex={450}
        />

        <FitMapToPoints answer={answer} guess={guess} />

        {showGuessPin && guess && (
          <>
            <Polyline
              positions={[
                [guess.lat, guess.lng],
                [answer.lat, answer.lng],
              ]}
              pathOptions={{
                color: GUESS_PIN,
                weight: 2.5,
                opacity: 0.75,
                dashArray: "8 6",
              }}
            />
            <Marker
              position={[guess.lat, guess.lng]}
              icon={guessIcon}
              title={guessLabel}
            />
          </>
        )}
      </MapContainer>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "12px 16px",
          padding: "8px 12px",
          fontSize: "10px",
          color: "#707790",
          borderTop: "1px solid #1d2440",
          background: "#0b0e1c",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "2px",
              background: ANSWER_FILL,
              border: `1px solid ${ANSWER_STROKE}`,
              display: "inline-block",
            }}
          />
          Correct country
        </span>
        {showGuessPin && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              className="ag-map-pin-guess ag-map-pin-legend"
              aria-hidden
            />
            Your guess
          </span>
        )}
        <span style={{ color: "#505870" }}>Drag or scroll to explore</span>
      </div>
    </div>
  );
}
