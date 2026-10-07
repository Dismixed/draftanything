import additions from "./pool-countries.json";
import { SEED } from "./seed";

export interface PoolCountry {
  cca3: string;
  common: string;
  region: string;
  capital: string;
}

/**
 * Every country that can appear in a game: the original hand-written seed
 * rows plus the ones in pool-countries.json. A country only reaches players
 * once it has approved clues.
 */
export const POOL_COUNTRIES: PoolCountry[] = [
  ...SEED.map(({ cca3, common, region, capital }) => ({ cca3, common, region, capital })),
  ...additions,
];
