import "server-only";

import { fetchWithRetry, mapPool } from "./async-pool";
import type { ImageCandidate } from "./seed-types";

const WIKI_SUMMARY_BASE = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const WIKI_API = "https://en.wikipedia.org/w/api.php";

const WIKI_CONCURRENCY = 5;

interface WikiSummary {
  title: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  content_urls?: { page: string };
}

interface CommonsImageInfo {
  url?: string;
  thumburl?: string;
  extmetadata?: Record<string, { value?: string }>;
  descriptionurl?: string;
}

export async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const url = WIKI_SUMMARY_BASE + encodeURIComponent(title.replace(/ /g, "_"));
  try {
    const res = await fetchWithRetry(url, { next: { revalidate: 604_800 } });
    if (!res.ok) return null;
    return (await res.json()) as WikiSummary;
  } catch {
    return null;
  }
}

function candidateFromSummary(
  wiki: WikiSummary,
  title: string,
): ImageCandidate | null {
  const image = wiki.originalimage?.source ?? wiki.thumbnail?.source;
  if (!image) return null;
  return {
    image_url: image,
    thumb_url: wiki.thumbnail?.source ?? image,
    wiki_title: title,
    source: wiki.title,
    source_url: wiki.content_urls?.page,
  };
}

async function fetchCommonsImageInfo(fileTitle: string): Promise<ImageCandidate | null> {
  const params = new URLSearchParams({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    format: "json",
    origin: "*",
  });

  try {
    const res = await fetchWithRetry(`${COMMONS_API}?${params}`, {
      next: { revalidate: 604_800 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: CommonsImageInfo[] }> };
    };
    const page = Object.values(data.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    if (!info?.url) return null;

    const meta = info.extmetadata ?? {};
    return {
      image_url: info.url,
      thumb_url: info.thumburl ?? info.url,
      wiki_title: page?.title ?? fileTitle,
      source: page?.title ?? fileTitle,
      source_url: info.descriptionurl,
      license: meta.LicenseShortName?.value,
      artist: meta.Artist?.value?.replace(/<[^>]+>/g, ""),
      credit: meta.Credit?.value?.replace(/<[^>]+>/g, ""),
    };
  } catch {
    return null;
  }
}

async function searchCommonsFiles(query: string, limit = 5): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    format: "json",
    origin: "*",
  });

  try {
    const res = await fetchWithRetry(`${COMMONS_API}?${params}`, {
      next: { revalidate: 604_800 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; imageinfo?: CommonsImageInfo[] }> };
    };

    const candidates: ImageCandidate[] = [];
    for (const page of Object.values(data.query?.pages ?? {})) {
      const info = page.imageinfo?.[0];
      if (!info?.url) continue;
      const meta = info.extmetadata ?? {};
      candidates.push({
        image_url: info.url,
        thumb_url: info.thumburl ?? info.url,
        wiki_title: page.title,
        source: page.title,
        source_url: info.descriptionurl,
        license: meta.LicenseShortName?.value,
        artist: meta.Artist?.value?.replace(/<[^>]+>/g, ""),
        credit: meta.Credit?.value?.replace(/<[^>]+>/g, ""),
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

async function imagesFromWikiArticle(title: string, limit = 3): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({
    action: "query",
    titles: title.replace(/ /g, "_"),
    prop: "images",
    imlimit: String(limit),
    format: "json",
    origin: "*",
  });

  try {
    const res = await fetchWithRetry(`${WIKI_API}?${params}`, {
      next: { revalidate: 604_800 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { images?: Array<{ title: string }> }> };
    };
    const page = Object.values(data.query?.pages ?? {})[0];
    const fileTitles = (page?.images ?? [])
      .map((img) => img.title)
      .filter((t) => t.startsWith("File:"))
      .slice(0, limit);

    return (
      await mapPool(fileTitles, WIKI_CONCURRENCY, (fileTitle) =>
        fetchCommonsImageInfo(fileTitle),
      )
    ).filter((c): c is ImageCandidate => c !== null);
  } catch {
    return [];
  }
}

function dedupeCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  const out: ImageCandidate[] = [];
  for (const c of candidates) {
    const key = c.image_url;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export interface ResolveImageOptions {
  clueType: string;
  country: string;
  wikiTitle?: string | null;
  extraTitles?: string[];
}

/** Gather lead + in-article + Commons search candidates for a clue. */
export async function resolveImageCandidates(
  options: ResolveImageOptions,
): Promise<ImageCandidate[]> {
  const titles = Array.from(
    new Set(
      [options.wikiTitle, ...(options.extraTitles ?? [])].filter(
        (t): t is string => !!t?.trim(),
      ),
    ),
  );

  const collected: ImageCandidate[] = [];

  const summaries = await mapPool(titles, WIKI_CONCURRENCY, async (title) => {
    const summary = await fetchWikiSummary(title);
    return { title, summary };
  });

  for (const { title, summary } of summaries) {
    if (summary) {
      const lead = candidateFromSummary(summary, title);
      if (lead) collected.push(lead);
    }
    const inArticle = await imagesFromWikiArticle(title, 3);
    collected.push(...inArticle);
  }

  const commonsQuery = `${options.country} ${options.clueType.replace(/_/g, " ")}`;
  collected.push(...(await searchCommonsFiles(commonsQuery, 5)));

  return dedupeCandidates(collected).slice(0, 8);
}

export async function resolveTitlesToCandidates(
  type: string,
  titles: string[],
): Promise<ImageCandidate[]> {
  const collected: ImageCandidate[] = [];
  const summaries = await mapPool(titles, WIKI_CONCURRENCY, fetchWikiSummary);
  for (let i = 0; i < titles.length; i++) {
    const wiki = summaries[i];
    if (!wiki) continue;
    const lead = candidateFromSummary(wiki, titles[i]);
    if (lead) collected.push(lead);
  }
  return dedupeCandidates(collected);
}
