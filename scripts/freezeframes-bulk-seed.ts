#!/usr/bin/env tsx
/**
 * scripts/freezeframes-bulk-seed.ts
 *
 * Adds a file of proposed titles to the FreezeFrames seed queue and resolves
 * their media:
 *
 *   apply    — create a draft entry per proposal (existing titles are skipped)
 *   resolve  — for this run's drafts: look up the media, check the match is
 *              the intended title, check the image does not show the answer
 *              (trying other frames if it does), and move the entry to
 *              needs_review or needs_media
 *
 * Usage:
 *   npx tsx scripts/freezeframes-bulk-seed.ts apply   data/freezeframes/proposals-2026-10.json
 *   npx tsx scripts/freezeframes-bulk-seed.ts resolve data/freezeframes/proposals-2026-10.json
 *
 * Nothing here approves an entry. A person reviews each one first.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Must load before any module that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const RUN_TAG = "bulk-2026-10";

/** Frames tried per movie or show before giving up on finding a clean one. */
const MAX_FRAME_VARIANTS = 3;
/** iTunes allows roughly 20 searches a minute. */
const ITUNES_DELAY_MS = 3200;

interface Proposal {
  round_key: "movie" | "song" | "show" | "album";
  query_title: string;
  expect: { title: string; artist?: string; year?: number };
}

const [mode, proposalsPath] = process.argv.slice(2);
if (!["apply", "resolve"].includes(mode) || !proposalsPath) {
  console.error("Usage: npx tsx scripts/freezeframes-bulk-seed.ts <apply|resolve> <proposals.json>");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const yearOf = (date: unknown) => (typeof date === "string" && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const { createClient } = await import("@supabase/supabase-js");
  const { createSeedEntry, listSeedEntries, seedEntryKey, updateSeedEntry } = await import("../lib/freezeframes/seed-db");
  const { mediaComplete, resolveSeedMedia } = await import("../lib/freezeframes/sourcing");
  const { checkFrame, frameUsable } = await import("../lib/freezeframes/frame-check");
  const { matchProblems } = await import("../lib/freezeframes/match");

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const proposals = JSON.parse(readFileSync(proposalsPath, "utf8")) as Proposal[];

  if (mode === "apply") {
    let created = 0;
    const before = new Set((await listSeedEntries(db, { limit: 5000 })).map((e) => e.id));
    for (const p of proposals) {
      const entry = await createSeedEntry(db, { round_key: p.round_key, query_title: p.query_title, notes: RUN_TAG });
      if (!before.has(entry.id)) created++;
    }
    console.log(`Created ${created} draft entries; ${proposals.length - created} already existed.`);
    return;
  }

  const byKey = new Map(proposals.map((p) => [seedEntryKey(p.round_key, p.query_title), p]));
  const drafts = (await listSeedEntries(db, { limit: 5000 })).filter((e) => e.notes === RUN_TAG && e.status === "draft");
  console.log(`Resolving ${drafts.length} draft entries…`);
  const tallies = { needs_review: 0, needs_media: 0 };

  for (const [i, entry] of drafts.entries()) {
    const proposal = byKey.get(seedEntryKey(entry.round_key, entry.query_title));
    const isImageRound = entry.round_key !== "song";
    const notes: string[] = [];
    let resolved = await resolveSeedMedia(entry.round_key, entry.query_title, { year: proposal?.expect.year });
    if (entry.round_key === "song" || entry.round_key === "album") await sleep(ITUNES_DELAY_MS);

    let frameOk = !isImageRound;
    if (isImageRound && resolved.img) {
      const variants = entry.round_key === "album" ? 1 : MAX_FRAME_VARIANTS;
      for (let variant = 0; variant < variants; variant++) {
        if (variant > 0) {
          const next = await resolveSeedMedia(entry.round_key, entry.query_title, { year: proposal?.expect.year, variant });
          // The same frame again means there is no other to try.
          if (!next.img || next.img === resolved.img) break;
          resolved = next;
        }
        try {
          const verdict = await checkFrame({
            imageUrl: resolved.img!,
            roundKey: entry.round_key,
            answer: resolved.answer,
            albumName: resolved.album_name,
          });
          frameOk = frameUsable(verdict);
          if (frameOk) break;
          notes.push(`Frame ${variant + 1}: ${verdict.shows_answer ? "shows the answer" : "not usable"} (${verdict.reason})`);
        } catch (err) {
          notes.push(`Frame check failed: ${err instanceof Error ? err.message : String(err)}`);
          break;
        }
      }
    }

    if (proposal) {
      const metadata = (resolved.metadata ?? {}) as Record<string, unknown>;
      for (const problem of matchProblems(entry.round_key, proposal.expect, {
        answer: resolved.answer,
        artist: resolved.artist,
        albumName: resolved.album_name,
        year: yearOf(metadata.release_date) ?? yearOf(metadata.first_air_date),
      })) {
        notes.unshift(`CHECK: ${problem}`);
      }
    }
    if (resolved.resolve_notes) notes.push(resolved.resolve_notes);

    const status = mediaComplete(entry.round_key, resolved) && frameOk ? "needs_review" : "needs_media";
    tallies[status]++;
    await updateSeedEntry(db, entry.id, {
      answer: resolved.answer || entry.query_title,
      hint: resolved.hint ?? null,
      artist: resolved.artist ?? null,
      album_name: resolved.album_name ?? null,
      img: resolved.img ?? null,
      audio: resolved.audio ?? null,
      external_id: resolved.external_id ?? null,
      external_source: resolved.external_source ?? null,
      resolve_notes: notes.join("\n") || null,
      metadata: resolved.metadata ?? {},
      status,
    });
    console.log(`${i + 1}/${drafts.length} ${status === "needs_review" ? "OK  " : "HOLD"} ${entry.round_key} ${entry.query_title}${notes.length ? ` — ${notes[0]}` : ""}`);
  }

  console.log(`\nDone: ${tallies.needs_review} ready for review, ${tallies.needs_media} held back.`);
}

main().catch((err) => {
  console.error("Bulk seed failed:", err);
  process.exit(1);
});
