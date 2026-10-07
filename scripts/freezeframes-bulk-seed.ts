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
 *   clues    — write a one-line clue for each song (this run's entries and
 *              existing puzzles) that has none, for players without audio
 *
 * Usage:
 *   npx tsx scripts/freezeframes-bulk-seed.ts apply   data/freezeframes/proposals-2026-10.json
 *   npx tsx scripts/freezeframes-bulk-seed.ts resolve data/freezeframes/proposals-2026-10.json
 *   npx tsx scripts/freezeframes-bulk-seed.ts clues   data/freezeframes/proposals-2026-10.json
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
/** Songs sent to the model per request when writing clues. */
const CLUE_BATCH_SIZE = 20;
/** iTunes allows roughly 20 searches a minute. */
const ITUNES_DELAY_MS = 3200;

interface Proposal {
  round_key: "movie" | "song" | "show" | "album";
  query_title: string;
  expect: { title: string; artist?: string; year?: number };
}

const [mode, proposalsPath] = process.argv.slice(2);
if (!["apply", "resolve", "clues"].includes(mode) || !proposalsPath) {
  console.error("Usage: npx tsx scripts/freezeframes-bulk-seed.ts <apply|resolve|clues> <proposals.json>");
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

  if (mode === "clues") {
    const { generateTextClues } = await import("../lib/freezeframes/text-clue-generate");

    /** Clues for every song in `songs`, with one retry for those the first pass left out. */
    async function cluesFor(songs: { title: string; artist: string }[]) {
      const clues = new Map<string, string>();
      for (const pass of [0, 1]) {
        const todo = songs.filter((song) => !clues.has(song.title));
        for (let i = 0; i < todo.length; i += CLUE_BATCH_SIZE) {
          const batch = await generateTextClues(todo.slice(i, i + CLUE_BATCH_SIZE));
          for (const [title, clue] of batch) clues.set(title, clue);
        }
        if (pass === 0) console.log(`  first pass: ${clues.size}/${songs.length}`);
      }
      return clues;
    }

    const entries = (await listSeedEntries(db, { roundKey: "song", limit: 5000 })).filter(
      (e) => e.notes === RUN_TAG && e.answer && e.artist && !e.metadata?.text_clue && e.status !== "draft",
    );
    console.log(`Writing clues for ${entries.length} seed songs…`);
    const entryClues = await cluesFor(entries.map((e) => ({ title: e.answer!, artist: e.artist! })));
    for (const entry of entries) {
      const clue = entryClues.get(entry.answer!);
      if (clue) await updateSeedEntry(db, entry.id, { metadata: { ...entry.metadata, text_clue: clue } });
    }
    console.log(`Seed songs with a clue: ${entryClues.size}/${entries.length}`);

    const { data: puzzles, error } = await db.from("freezeframes_puzzles").select("id, song");
    if (error) throw new Error(error.message);
    const lacking = (puzzles ?? []).filter((p) => !(p.song as Record<string, unknown>).textClue);
    const puzzleSongs = lacking.map((p) => p.song as { answer: string; artist?: string; hint?: string });
    const puzzleClues = await cluesFor(
      [...new Map(puzzleSongs.map((s) => [s.answer, { title: s.answer, artist: s.artist ?? s.hint ?? "" }])).values()],
    );
    for (const puzzle of lacking) {
      const song = puzzle.song as Record<string, unknown>;
      const clue = puzzleClues.get(String(song.answer));
      if (!clue) continue;
      const { error: updateError } = await db.from("freezeframes_puzzles").update({ song: { ...song, textClue: clue } }).eq("id", puzzle.id);
      if (updateError) throw new Error(updateError.message);
    }
    console.log(`Existing puzzles given a clue: ${lacking.filter((p) => puzzleClues.has(String((p.song as Record<string, unknown>).answer))).length}/${lacking.length}`);
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
