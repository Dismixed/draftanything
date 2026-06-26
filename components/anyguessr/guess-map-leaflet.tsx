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

const MAP_LABEL_TILES =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";

const LABEL_ATTRIBUTION =
  'Labels &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const COUNTRY_GEOJSON_BASE =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries";

const WORLD_COUNTRY_BORDERS_URL = "/anyguessr/world-countries-110m.geojson";

let worldBordersCache: GeoJSON.GeoJsonObject | null = null;

type BasemapId = "voyager" | "terrain" | "satellite" | "light";

interface BasemapConfig {
  id: BasemapId;
  label: string;
  url: string;
  subdomains?: string;
  attribution: string;
  background: string;
  borderColor: string;
  borderOpacity: number;
}

const BASEMAPS: Record<BasemapId, BasemapConfig> = {
  voyager: {
    id: "voyager",
    label: "Colorful",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>. ${LABEL_ATTRIBUTION}`,
    background: "#e8eef4",
    borderColor: "#64748b",
    borderOpacity: 0.28,
  },
  terrain: {
    id: "terrain",
    label: "Terrain",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; US National Park Service, USGS, NOAA, and others. " +
      LABEL_ATTRIBUTION,
    background: "#d4e6f1",
    borderColor: "#475569",
    borderOpacity: 0.3,
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community. " +
      LABEL_ATTRIBUTION,
    background: "#1e293b",
    borderColor: "#e2e8f0",
    borderOpacity: 0.38,
  },
  light: {
    id: "light",
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/light_nolabels/{z}/{x}/{y}{r}.png",
    subdomains: "abcd",
    attribution: `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>. ${LABEL_ATTRIBUTION}`,
    background: "#f1f5f9",
    borderColor: "#94a3b8",
    borderOpacity: 0.32,
  },
};

const DEFAULT_BASEMAP: BasemapId = "voyager";

const ANSWER_FILL = "#34d399";
const ANSWER_STROKE = "#10b981";
const GUESS_PIN = "#f87171";

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

function WorldCountryBorders({
  borderColor,
  borderOpacity,
}: {
  borderColor: string;
  borderOpacity: number;
}) {
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

  return (
    <GeoJSON
      data={data}
      style={() => ({
        fillOpacity: 0,
        color: borderColor,
        weight: 0.65,
        opacity: borderOpacity,
      })}
    />
  );
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
  const [basemapId, setBasemapId] = useState<BasemapId>(DEFAULT_BASEMAP);
  const basemap = BASEMAPS[basemapId];
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
        background: basemap.background,
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
        style={{ height: MAP_HEIGHT, width: "100%", background: basemap.background }}
        attributionControl
      >
        <TileLayer
          key={basemap.id}
          url={basemap.url}
          subdomains={basemap.subdomains}
          attribution={basemap.attribution}
          maxZoom={16}
        />

        <AnswerCountryHighlight cca3={answerCca3} />
        <WorldCountryBorders
          borderColor={basemap.borderColor}
          borderOpacity={basemap.borderOpacity}
        />

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
          flexDirection: "column",
          gap: "8px",
          padding: "8px 12px",
          fontSize: "10px",
          color: "#707790",
          borderTop: "1px solid #1d2440",
          background: "#0b0e1c",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          <span style={{ color: "#505870", marginRight: "2px" }}>Map style</span>
          {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`ag-map-basemap-btn${basemapId === id ? " ag-map-basemap-btn-active" : ""}`}
              onClick={() => setBasemapId(id)}
            >
              {BASEMAPS[id].label}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "12px 16px",
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
    </div>
  );
}
