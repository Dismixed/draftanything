"use client";

import { lookupCca3AtPoint } from "@/lib/anyguessr/country-at-point";
import { getNameForCca3 } from "@/lib/anyguessr/country-geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

interface Props {
  roundKey: number;
  onPick: (countryName: string) => void;
  embedded?: boolean;
}

const MAP_HEIGHT = 420;

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
const WORLD_COUNTRY_BORDERS_URL = "/anyguessr/world-countries-110m.geojson";
const COUNTRY_GEOJSON_BASE =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries";

const SELECT_FILL = "rgba(224, 168, 88, 0.35)";
const SELECT_STROKE = "#e0a858";

const WORLD_BORDER_STYLE = {
  fillOpacity: 0,
  color: BORDER_COLOR,
  weight: 0.65,
  opacity: BORDER_OPACITY,
};

interface PendingGuess {
  cca3: string;
  name: string;
  lat: number;
  lng: number;
}

let worldBordersCache: GeoJSON.GeoJsonObject | null = null;

function previewPinIcon() {
  return L.divIcon({
    className: "ag-map-pin",
    html: `<span class="ag-map-pin-preview" aria-hidden="true"></span>`,
    iconSize: [22, 30],
    iconAnchor: [11, 28],
    popupAnchor: [0, -24],
  });
}

function MapClickHandler({
  borders,
  onSelect,
  onMiss,
}: {
  borders: GeoJSON.FeatureCollection | null;
  onSelect: (pending: PendingGuess) => void;
  onMiss: () => void;
}) {
  const draggedRef = useRef(false);

  useMapEvents({
    dragstart: () => {
      draggedRef.current = true;
    },
    dragend: () => {
      window.setTimeout(() => {
        draggedRef.current = false;
      }, 0);
    },
    click(e) {
      if (draggedRef.current || !borders) return;

      const { lat, lng } = e.latlng;
      const cca3 = lookupCca3AtPoint(lat, lng, borders);
      if (!cca3) {
        onMiss();
        return;
      }

      const name = getNameForCca3(cca3);
      if (!name) {
        onMiss();
        return;
      }

      onSelect({ cca3, name, lat, lng });
    },
  });

  return null;
}

function FitWorldView() {
  const map = useMap();

  useEffect(() => {
    map.fitWorld({ padding: [24, 24] });
  }, [map]);

  return null;
}

function WorldCountryBorders({
  onReady,
}: {
  onReady: (data: GeoJSON.FeatureCollection) => void;
}) {
  const [data, setData] = useState<GeoJSON.GeoJsonObject | null>(worldBordersCache);

  useEffect(() => {
    if (worldBordersCache) {
      onReady(worldBordersCache as GeoJSON.FeatureCollection);
      return;
    }
    fetch(WORLD_COUNTRY_BORDERS_URL)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) {
          worldBordersCache = json as GeoJSON.GeoJsonObject;
          setData(worldBordersCache);
          onReady(json as GeoJSON.FeatureCollection);
        }
      })
      .catch(() => {});
  }, [onReady]);

  if (!data) return null;

  return <GeoJSON data={data} style={WORLD_BORDER_STYLE} />;
}

function SelectedCountryHighlight({ cca3 }: { cca3: string }) {
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
        color: SELECT_STROKE,
        fillColor: SELECT_FILL,
        fillOpacity: 0.34,
        weight: 1.5,
        opacity: 0.85,
      }}
    />
  );
}

export default function GuessMapPickerLeaflet({
  roundKey,
  onPick,
  embedded = false,
}: Props) {
  const previewIcon = useMemo(() => previewPinIcon(), []);
  const [borders, setBorders] = useState<GeoJSON.FeatureCollection | null>(null);
  const [pending, setPending] = useState<PendingGuess | null>(null);
  const [missMessage, setMissMessage] = useState<string | null>(null);

  useEffect(() => {
    setPending(null);
    setMissMessage(null);
  }, [roundKey]);

  const handleBordersReady = useCallback((data: GeoJSON.FeatureCollection) => {
    setBorders(data);
  }, []);

  const handleConfirm = () => {
    if (!pending) return;
    onPick(pending.name);
    setPending(null);
    setMissMessage(null);
  };

  return (
    <div
      className="ag-guess-map ag-guess-map-picker"
      style={{
        width: "100%",
        borderRadius: embedded ? 0 : "10px",
        overflow: "hidden",
        border: embedded ? "none" : "1px solid var(--ag-border)",
        background: MAP_BACKGROUND,
      }}
    >
      <MapContainer
        key={`picker-${roundKey}`}
        center={[20, 0]}
        zoom={2}
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

        <WorldCountryBorders onReady={handleBordersReady} />

        <TileLayer
          url={MAP_LABEL_TILES}
          subdomains="abcd"
          maxZoom={16}
          maxNativeZoom={7}
          zIndex={450}
        />

        <FitWorldView />
        <MapClickHandler
          borders={borders}
          onSelect={(next) => {
            setMissMessage(null);
            setPending(next);
          }}
          onMiss={() => {
            setPending(null);
            setMissMessage("Tap a country on land");
          }}
        />

        {pending ? (
          <>
            <SelectedCountryHighlight cca3={pending.cca3} />
            <Marker
              position={[pending.lat, pending.lng]}
              icon={previewIcon}
              title={pending.name}
            />
          </>
        ) : null}
      </MapContainer>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "10px 12px",
          borderTop: "1px solid var(--ag-border)",
          background: "var(--ag-surface)",
        }}
      >
        {pending ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--ag-text)", fontWeight: 600 }}>
              {pending.name}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setMissMessage(null);
                }}
                style={secondaryBtnStyle}
              >
                Clear
              </button>
              <button type="button" onClick={handleConfirm} style={primaryBtnStyle}>
                Confirm guess
              </button>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: "11px", color: missMessage ? "#ff6b6b" : "var(--ag-muted)" }}>
            {missMessage ?? "Click the map to pick a country"}
          </span>
        )}
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.03em",
  borderRadius: "8px",
  cursor: "pointer",
  border: "none",
  background: "var(--ag-accent)",
  color: "#0b0e1c",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.03em",
  borderRadius: "8px",
  cursor: "pointer",
  border: "1px solid var(--ag-border)",
  background: "var(--ag-surface-hi)",
  color: "var(--ag-text)",
};
