import "server-only";

import { getLatLngForCca3 } from "./country-geo";

export {
  distanceBetweenCountriesKm,
  getLatLngForCca3,
  getLatLngForIso2,
  haversineKm,
  resolveGuessToCca3,
} from "./country-geo";

/** @deprecated Use getLatLngForCca3 — kept for older call sites. */
export function getFallbackLatLng(cca3: string): [number, number] | null {
  return getLatLngForCca3(cca3);
}
