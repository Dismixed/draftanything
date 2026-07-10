import "server-only";

import {
  fetchWikiSummary,
  resolveTitlesToCandidates,
} from "@/lib/anyguessr/image-sourcing";
import { fetchWithRetry } from "@/lib/anyguessr/async-pool";
import type { ImageCandidate } from "./types";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

interface CommonsImageInfo {
  url?: string;
  thumburl?: string;
  extmetadata?: Record<string, { value?: string }>;
  descriptionurl?: string;
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

function dedupeCandidates(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Set<string>();
  const out: ImageCandidate[] = [];
  for (const c of candidates) {
    if (!c.image_url || seen.has(c.image_url)) continue;
    seen.add(c.image_url);
    out.push(c);
  }
  return out;
}

export async function resolveItemImageCandidates(options: {
  label: string;
  wikiTitle?: string | null;
  categoryName: string;
}): Promise<ImageCandidate[]> {
  const titles = Array.from(
    new Set(
      [options.wikiTitle, options.label]
        .filter((t): t is string => !!t?.trim())
        .map((t) => t.trim()),
    ),
  );

  const collected: ImageCandidate[] = [];

  for (const title of titles) {
    const summary = await fetchWikiSummary(title);
    if (summary) {
      const image = summary.originalimage?.source ?? summary.thumbnail?.source;
      if (image) {
        collected.push({
          image_url: image,
          thumb_url: summary.thumbnail?.source ?? image,
          wiki_title: title,
          source: summary.title,
          source_url: summary.content_urls?.page,
        });
      }
    }
  }

  collected.push(...(await resolveTitlesToCandidates("item", titles)));
  collected.push(
    ...(await searchCommonsFiles(`${options.categoryName} ${options.label}`, 5)),
  );

  return dedupeCandidates(collected).slice(0, 8);
}
