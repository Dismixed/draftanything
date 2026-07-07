import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>;

function isValidCca3(value: unknown): value is string {
  return typeof value === "string" && value.length === 3 && value !== "-99";
}

function cca3FromFeature(feature: CountryFeature): string | null {
  const props = feature.properties;
  if (!props) return null;
  if (isValidCca3(props.ISO_A3)) return props.ISO_A3;
  if (isValidCca3(props.ISO_A3_EH)) return props.ISO_A3_EH;
  if (isValidCca3(props.ADM0_A3)) return props.ADM0_A3;
  return null;
}

/** Resolve a map click to an ISO 3166-1 alpha-3 country code. */
export function lookupCca3AtPoint(
  lat: number,
  lng: number,
  geojson: GeoJSON.FeatureCollection,
): string | null {
  const pt = point([lng, lat]);
  let match: string | null = null;

  for (const feature of geojson.features) {
    if (!feature.geometry) continue;
    if (!booleanPointInPolygon(pt, feature as CountryFeature)) continue;
    const cca3 = cca3FromFeature(feature as CountryFeature);
    if (cca3) match = cca3;
  }

  return match;
}
