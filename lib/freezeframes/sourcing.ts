import "server-only";

import { fetchWithRetry } from "@/lib/anyguessr/async-pool";
import type { RoundKey } from "./types";
import type { ExternalSource, ResolvedMedia } from "./seed-types";

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w780";
const ITUNES_SEARCH = "https://itunes.apple.com/search";

function tmdbKey(): string | null {
  return process.env.TMDB_API_KEY?.trim() || null;
}

function yearFromDate(iso?: string | null): string | null {
  if (!iso || iso.length < 4) return null;
  return iso.slice(0, 4);
}

function upscaleItunesArtwork(url: string): string {
  return url.replace(/100x100bb\.jpg$/, "600x600bb.jpg");
}

/** Stable pick so re-resolving the same title yields the same frame. */
function stableIndex(seed: string, mod: number): number {
  if (mod <= 0) return 0;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

function tmdbImageUrl(filePath: string): string {
  return `${TMDB_IMAGE_BASE}${filePath}`;
}

interface TmdbImage {
  file_path: string;
  aspect_ratio: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  height: number;
  width: number;
}

interface TmdbSearchMovie {
  id: number;
  title: string;
  release_date?: string;
}

interface TmdbSearchTv {
  id: number;
  name: string;
  first_air_date?: string;
}

interface ItunesTrack {
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  collectionName?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  artworkUrl100?: string;
  trackId?: number;
  collectionId?: number;
}

async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const key = tmdbKey();
  if (!key) return null;

  const qs = new URLSearchParams({ ...params, api_key: key });
  const res = await fetchWithRetry(`https://api.themoviedb.org/3${path}?${qs}`);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Landscape scene frames — excludes poster-shaped assets and titled promos. */
function filterFreezeFrameCandidates(images: TmdbImage[]): TmdbImage[] {
  return images
    .filter((img) => img.aspect_ratio >= 1.35)
    .filter((img) => img.width >= 500)
    .sort((a, b) => {
      const aNoText = a.iso_639_1 === null ? 1 : 0;
      const bNoText = b.iso_639_1 === null ? 1 : 0;
      if (bNoText !== aNoText) return bNoText - aNoText;
      return b.vote_average - a.vote_average || b.vote_count - a.vote_count;
    });
}

function pickFreezeFrame(images: TmdbImage[], seed: string): string | undefined {
  const candidates = filterFreezeFrameCandidates(images);
  if (candidates.length === 0) return undefined;
  return candidates[stableIndex(seed, candidates.length)]?.file_path;
}

async function fetchMovieFreezeFrame(movieId: number, seed: string): Promise<{
  filePath?: string;
  imageType: string;
}> {
  const data = await tmdbGet<{ backdrops?: TmdbImage[] }>(`/movie/${movieId}/images`, {
    include_image_language: "en,null",
  });
  const filePath = pickFreezeFrame(data?.backdrops ?? [], seed);
  return { filePath, imageType: "scene_backdrop" };
}

async function fetchTvEpisodeFreezeFrame(
  tvId: number,
  seed: string,
): Promise<{
  filePath?: string;
  imageType: string;
  season?: number;
  episode?: number;
}> {
  for (let season = 1; season <= 3; season++) {
    const seasonData = await tmdbGet<{ episodes?: { episode_number: number }[] }>(
      `/tv/${tvId}/season/${season}`,
    );
    const episodes = seasonData?.episodes ?? [];
    if (episodes.length === 0) continue;

    const start = stableIndex(`${seed}:s${season}`, episodes.length);
    const tries = Math.min(episodes.length, 6);

    for (let offset = 0; offset < tries; offset++) {
      const ep = episodes[(start + offset) % episodes.length];
      const imgData = await tmdbGet<{ stills?: TmdbImage[] }>(
        `/tv/${tvId}/season/${season}/episode/${ep.episode_number}/images`,
        { include_image_language: "en,null" },
      );
      const filePath = pickFreezeFrame(imgData?.stills ?? [], `${seed}:e${ep.episode_number}`);
      if (filePath) {
        return {
          filePath,
          imageType: "episode_still",
          season,
          episode: ep.episode_number,
        };
      }
    }
  }

  const seriesImages = await tmdbGet<{ backdrops?: TmdbImage[] }>(`/tv/${tvId}/images`, {
    include_image_language: "en,null",
  });
  const filePath = pickFreezeFrame(seriesImages?.backdrops ?? [], seed);
  return { filePath, imageType: filePath ? "series_backdrop" : "none" };
}

interface TvmazeShow {
  id: number;
  name: string;
}

interface TvmazeEpisode {
  season: number;
  number: number;
  image?: { medium?: string; original?: string } | null;
}

async function fetchTvmazeEpisodeStill(
  query: string,
  seed: string,
): Promise<{ img?: string; answer?: string; season?: number; episode?: number } | null> {
  const searchRes = await fetchWithRetry(
    `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}`,
  );
  if (!searchRes.ok) return null;

  const show = (await searchRes.json()) as TvmazeShow;
  if (!show?.id) return null;

  const epRes = await fetchWithRetry(`https://api.tvmaze.com/shows/${show.id}/episodes`);
  if (!epRes.ok) return null;

  const episodes = (await epRes.json()) as TvmazeEpisode[];
  const withImages = episodes.filter((ep) => ep.image?.original || ep.image?.medium);
  if (withImages.length === 0) return null;

  const pick = withImages[stableIndex(seed, withImages.length)];
  return {
    img: pick.image?.original ?? pick.image?.medium,
    answer: show.name,
    season: pick.season,
    episode: pick.number,
  };
}

async function resolveMovie(query: string): Promise<ResolvedMedia | null> {
  const data = await tmdbGet<{ results?: TmdbSearchMovie[] }>("/search/movie", {
    query,
    include_adult: "false",
  });
  const hit = data?.results?.[0];
  if (!hit) return null;

  const { filePath, imageType } = await fetchMovieFreezeFrame(hit.id, query);
  const year = yearFromDate(hit.release_date);

  return {
    answer: hit.title,
    hint: year ? `Film · ${year}` : "Film",
    img: filePath ? tmdbImageUrl(filePath) : undefined,
    external_id: String(hit.id),
    external_source: "tmdb_movie_still",
    metadata: {
      release_date: hit.release_date ?? null,
      image_type: imageType,
    },
    resolve_notes: filePath
      ? undefined
      : "No scene backdrops on TMDB — movies lack episode stills; try a different title or upload manually",
  };
}

async function resolveShow(query: string): Promise<ResolvedMedia | null> {
  const data = await tmdbGet<{ results?: TmdbSearchTv[] }>("/search/tv", {
    query,
    include_adult: "false",
  });
  const hit = data?.results?.[0];

  if (hit) {
    const frame = await fetchTvEpisodeFreezeFrame(hit.id, query);
    if (frame.filePath) {
      const year = yearFromDate(hit.first_air_date);
      return {
        answer: hit.name,
        hint: year ? `TV · ${year}` : "TV",
        img: tmdbImageUrl(frame.filePath),
        external_id: String(hit.id),
        external_source: "tmdb_episode_still",
        metadata: {
          first_air_date: hit.first_air_date ?? null,
          image_type: frame.imageType,
          season: frame.season ?? null,
          episode: frame.episode ?? null,
        },
      };
    }
  }

  const tvmaze = await fetchTvmazeEpisodeStill(query, query);
  if (tvmaze?.img) {
    return {
      answer: tvmaze.answer ?? query,
      hint: "TV",
      img: tvmaze.img,
      external_source: "tvmaze_episode",
      metadata: {
        image_type: "episode_still",
        season: tvmaze.season ?? null,
        episode: tvmaze.episode ?? null,
      },
    };
  }

  if (!hit) return null;

  const year = yearFromDate(hit.first_air_date);
  return {
    answer: hit.name,
    hint: year ? `TV · ${year}` : "TV",
    external_id: String(hit.id),
    external_source: "tmdb_tv",
    resolve_notes: "No episode stills found on TMDB or TVMaze",
  };
}

async function itunesSearch(
  term: string,
  entity: "song" | "album",
): Promise<ItunesTrack | null> {
  const qs = new URLSearchParams({
    term,
    entity,
    limit: "5",
    media: "all",
  });
  const res = await fetchWithRetry(`${ITUNES_SEARCH}?${qs}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: ItunesTrack[] };
  return data.results?.[0] ?? null;
}

async function resolveSong(query: string): Promise<ResolvedMedia | null> {
  const hit = await itunesSearch(query, "song");
  if (!hit?.trackName) return null;

  const year = yearFromDate(hit.releaseDate);
  return {
    answer: hit.trackName,
    artist: hit.artistName ?? undefined,
    audio: hit.previewUrl ?? undefined,
    hint: hit.artistName ?? (year ? `Song · ${year}` : "Song"),
    external_id: hit.trackId ? String(hit.trackId) : undefined,
    external_source: "itunes_song",
    metadata: {
      collection_name: hit.collectionName ?? null,
      release_date: hit.releaseDate ?? null,
    },
  };
}

async function resolveAlbum(query: string): Promise<ResolvedMedia | null> {
  const hit = await itunesSearch(query, "album");
  if (!hit?.artistName) return null;

  return {
    answer: hit.artistName,
    album_name: hit.collectionName ?? undefined,
    img: hit.artworkUrl100 ? upscaleItunesArtwork(hit.artworkUrl100) : undefined,
    hint: hit.primaryGenreName ?? "Album",
    external_id: hit.collectionId ? String(hit.collectionId) : undefined,
    external_source: "itunes_album",
    metadata: {
      collection_name: hit.collectionName ?? null,
      release_date: hit.releaseDate ?? null,
    },
  };
}

export function mediaComplete(roundKey: RoundKey, media: ResolvedMedia): boolean {
  if (roundKey === "song") {
    return Boolean(media.answer && media.audio && media.artist);
  }
  if (roundKey === "album") {
    return Boolean(media.answer && media.img);
  }
  return Boolean(media.answer && media.img);
}

export async function resolveSeedMedia(
  roundKey: RoundKey,
  queryTitle: string,
): Promise<ResolvedMedia> {
  const query = queryTitle.trim();
  if (!query) {
    return { answer: "", resolve_notes: "Empty search query" };
  }

  if (roundKey === "movie" && !tmdbKey()) {
    return {
      answer: query,
      resolve_notes: "TMDB_API_KEY not set — required for movie scene frames",
    };
  }

  if (roundKey === "show" && !tmdbKey()) {
    // TV can still resolve via TVMaze without a key.
  }

  try {
    let resolved: ResolvedMedia | null = null;
    if (roundKey === "movie") resolved = await resolveMovie(query);
    else if (roundKey === "show") resolved = await resolveShow(query);
    else if (roundKey === "song") resolved = await resolveSong(query);
    else if (roundKey === "album") resolved = await resolveAlbum(query);

    if (!resolved) {
      return {
        answer: query,
        resolve_notes: `No ${roundKey} match found for "${query}"`,
      };
    }

    if (!mediaComplete(roundKey, resolved)) {
      const missing =
        roundKey === "song"
          ? !resolved.audio
            ? "preview audio unavailable on iTunes"
            : "missing artist"
          : resolved.resolve_notes ?? "freeze frame unavailable";
      return {
        ...resolved,
        resolve_notes: resolved.resolve_notes ?? `Matched but incomplete: ${missing}`,
      };
    }

    return resolved;
  } catch (err) {
    return {
      answer: query,
      resolve_notes: err instanceof Error ? err.message : "Resolve failed",
    };
  }
}
