import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeAnswer } from "./normalize";

const BUILTIN_ALIASES: Record<string, string> = {
  holland: "NLD",
  uk: "GBR",
  britain: "GBR",
  "great britain": "GBR",
  america: "USA",
  us: "USA",
  "united states of america": "USA",
  korea: "KOR",
  rok: "KOR",
  "republic of korea": "KOR",
  "ivory coast": "CIV",
  "cote d ivoire": "CIV",
  "côte d ivoire": "CIV",
  "czech republic": "CZE",
  burma: "MMR",
  turkiye: "TUR",
  "viet nam": "VNM",
  lao: "LAO",
  laos: "LAO",
};

let aliasCache: Map<string, string> | null = null;
let aliasCacheAt = 0;
const ALIAS_TTL_MS = 60_000;

export async function loadAliasMap(
  db: SupabaseClient<Database>,
): Promise<Map<string, string>> {
  const now = Date.now();
  if (aliasCache && now - aliasCacheAt < ALIAS_TTL_MS) {
    return aliasCache;
  }

  const map = new Map<string, string>(Object.entries(BUILTIN_ALIASES));

  const { data, error } = await db.from("ag_country_aliases").select("cca3, alias");
  if (!error && data) {
    for (const row of data) {
      map.set(normalizeAnswer(row.alias), row.cca3);
    }
  }

  aliasCache = map;
  aliasCacheAt = now;
  return map;
}

export function invalidateAliasCache(): void {
  aliasCache = null;
  aliasCacheAt = 0;
}

export async function resolveAliasToCca3(
  db: SupabaseClient<Database>,
  guess: string,
): Promise<string | null> {
  const key = normalizeAnswer(guess);
  if (!key) return null;
  const map = await loadAliasMap(db);
  return map.get(key) ?? null;
}

export async function expandAltAnswers(
  db: SupabaseClient<Database>,
  cca3: string,
  base: string[],
): Promise<string[]> {
  const map = await loadAliasMap(db);
  const extras: string[] = [];
  for (const [alias, target] of map.entries()) {
    if (target === cca3) extras.push(alias);
  }
  return Array.from(new Set([...base, ...extras]));
}
