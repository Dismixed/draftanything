#!/usr/bin/env tsx
/**
 * scripts/anyguessr-bulk-seed.ts
 *
 * Applies a file of clue proposals (see lib/anyguessr/seed-plan.ts) to
 * ag_seed_entries without disturbing the live game:
 *
 *   plan    — print what would change; writes nothing
 *   apply   — create drafts, rewrite clues that are not live, set
 *             difficulties, and write changes to live clues to
 *             data/anyguessr/staged-changes.json instead of applying them
 *   images  — slowly fetch and vision-check images for this run's drafts,
 *             moving each to needs_review (or needs_image)
 *   staged  — apply data/anyguessr/staged-changes.json: replaced clues go
 *             back to draft for images and review, removed ones are rejected
 *   flags   — give every pool country an approved flag clue
 *
 * Usage:
 *   npx tsx scripts/anyguessr-bulk-seed.ts plan   data/anyguessr/proposals-2026-10.json
 *   npx tsx scripts/anyguessr-bulk-seed.ts apply  data/anyguessr/proposals-2026-10.json
 *   npx tsx scripts/anyguessr-bulk-seed.ts images data/anyguessr/proposals-2026-10.json
 *
 * Nothing here approves a clue. A person reviews every entry before it can
 * reach players.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Must load before any module that transitively pulls in `server-only`.
const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const RUN_TAG = "bulk-2026-10";
const STAGED_PATH = "data/anyguessr/staged-changes.json";

/** Image candidates vision-checked per clue, lead image first. */
const MAX_CANDIDATES = 4;
/** Pause between image downloads; Wikimedia throttles faster clients. */
const IMAGE_DELAY_MS = 1500;

const [mode, proposalsPath] = process.argv.slice(2);
if (!["plan", "apply", "images", "staged", "flags"].includes(mode) || !proposalsPath) {
  console.error("Usage: npx tsx scripts/anyguessr-bulk-seed.ts <plan|apply|images|staged|flags> <proposals.json>");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Longest one clue may take; a stalled request must not hang the whole run. */
const CLUE_TIMEOUT_MS = 120_000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms)),
  ]);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const { createClient } = await import("@supabase/supabase-js");
  const { planSeedChanges } = await import("../lib/anyguessr/seed-plan");
  const { listSeedEntries, updateSeedEntry, upsertSeedEntry } = await import("../lib/anyguessr/seed-db");
  const { personDisplayName } = await import("../lib/anyguessr/generator");
  type ClueProposal = import("../lib/anyguessr/seed-plan").ClueProposal;

  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const proposals = JSON.parse(readFileSync(proposalsPath, "utf8")) as ClueProposal[];
  const existing = await listSeedEntries(db, { limit: 5000 });

  const stagedFields = (p: ClueProposal) => ({
    wiki_title: p.wiki_title ?? null,
    text_content: p.clue_type === "person" && p.wiki_title ? personDisplayName(p.wiki_title, p.country) : (p.text ?? null),
    difficulty: p.difficulty,
    notes: [p.note, p.language && `${p.language}: "${p.english}"`].filter(Boolean).join(" | ") || null,
    // A language clue has no image to wait for.
    status: p.clue_type === "written_language" ? ("needs_review" as const) : ("draft" as const),
  });


  if (mode === "images") return fetchImages(db, existing.filter((e) => e.proposed_by === RUN_TAG && e.status === "draft"));

  if (mode === "flags") {
    const { POOL_COUNTRIES } = await import("../lib/anyguessr/countries");
    const { getFlagUrlForCca3 } = await import("../lib/anyguessr/country-geo");
    const have = new Set(existing.filter((e) => e.clue_type === "flag").map((e) => e.cca3));
    let created = 0;
    for (const country of POOL_COUNTRIES) {
      if (have.has(country.cca3)) continue;
      const flagUrl = getFlagUrlForCca3(country.cca3);
      if (!flagUrl) {
        console.warn(`No flag image for ${country.common}`);
        continue;
      }
      // A flag is unambiguous and needs no review.
      await upsertSeedEntry(db, {
        cca3: country.cca3,
        country_common: country.common,
        clue_type: "flag",
        status: "approved",
        difficulty: "easy",
        image_candidates: [{ image_url: flagUrl, thumb_url: flagUrl, source: "flagcdn" }],
        proposed_by: RUN_TAG,
      });
      created++;
    }
    console.log(`Created ${created} approved flag clues.`);
    return;
  }

  if (mode === "staged") {
    const staged = JSON.parse(readFileSync(STAGED_PATH, "utf8")) as import("../lib/anyguessr/seed-plan").StagedChange[];
    const byId = new Map(existing.map((e) => [e.id, e]));
    let replaced = 0;
    let removed = 0;
    for (const change of staged) {
      const current = byId.get(change.id);
      // Skip anything already applied or since changed by hand.
      if (!current || current.status !== "approved") continue;
      if (!change.to) {
        await updateSeedEntry(db, change.id, { status: "rejected" });
        removed++;
        continue;
      }
      await updateSeedEntry(db, change.id, {
        ...stagedFields(change.to),
        image_candidates: [],
        selected_candidate_index: 0,
        vision_pass: null,
        vision_notes: null,
      });
      const { error } = await db.from("ag_seed_entries").update({ proposed_by: RUN_TAG }).eq("id", change.id);
      if (error) throw new Error(error.message);
      replaced++;
    }
    console.log(`Staged changes applied: ${replaced} clues replaced (now drafts), ${removed} removed.`);
    return;
  }

  const plan = planSeedChanges(existing, proposals);
  console.log(
    `Plan: create ${plan.create.length}, rewrite ${plan.replace.length} not-live clues, set difficulty on ${plan.setDifficulty.length}, ` +
      `stage ${plan.staged.length} changes to live clues, reject ${plan.reject.length}.`,
  );
  if (mode === "plan") {
    console.log("Staged (live clues left untouched):");
    for (const s of plan.staged) {
      console.log(`  ${s.cca3} ${s.clue_type}: ${s.from} -> ${s.to ? (s.to.wiki_title ?? s.to.text) : "(remove)"}`);
    }
    return;
  }

  for (const p of plan.create) {
    await upsertSeedEntry(db, { cca3: p.cca3, country_common: p.country, clue_type: p.clue_type, proposed_by: RUN_TAG, ...stagedFields(p) });
  }
  for (const { id, proposal } of plan.replace) {
    await updateSeedEntry(db, id, { ...stagedFields(proposal), image_candidates: [], selected_candidate_index: 0, vision_pass: null, vision_notes: null });
    // updateSeedEntry cannot set proposed_by; mark the row so `images` picks it up.
    const { error } = await db.from("ag_seed_entries").update({ proposed_by: RUN_TAG }).eq("id", id);
    if (error) throw new Error(error.message);
  }
  for (const { id, difficulty } of plan.setDifficulty) await updateSeedEntry(db, id, { difficulty });
  for (const id of plan.reject) await updateSeedEntry(db, id, { status: "rejected" });

  writeFileSync(STAGED_PATH, `${JSON.stringify(plan.staged, null, 2)}\n`);
  console.log(`Applied. ${plan.staged.length} staged changes written to ${STAGED_PATH}.`);
}

async function fetchImages(db: unknown, drafts: import("../lib/anyguessr/seed-types").SeedEntryRow[]) {
  const { updateSeedEntry } = await import("../lib/anyguessr/seed-db");
  const { resolveImageCandidates } = await import("../lib/anyguessr/image-sourcing");
  const { scoreImageForClue, visionAccepts } = await import("../lib/anyguessr/vision-filter");
  type Db = Parameters<typeof updateSeedEntry>[0];

  const todo = drafts.filter((e) => e.clue_type !== "written_language" && e.clue_type !== "flag");
  console.log(`Fetching images for ${todo.length} draft clues…`);
  let ok = 0;

  for (const [i, entry] of todo.entries()) {
    const label = `${entry.country_common} ${entry.clue_type} (${entry.wiki_title})`;
    try {
      await withTimeout(processEntry(), CLUE_TIMEOUT_MS);
    } catch (err) {
      console.error(`${i + 1}/${todo.length} FAIL ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }

    async function processEntry() {
      const raw = await resolveImageCandidates({
        clueType: entry.clue_type,
        country: entry.country_common,
        wikiTitle: entry.wiki_title,
        articleImagesOnly: true,
      });

      const kept = [];
      const notes: string[] = [];
      for (const candidate of raw.slice(0, MAX_CANDIDATES)) {
        await sleep(IMAGE_DELAY_MS);
        const vision = await scoreImageForClue({
          imageUrl: candidate.thumb_url ?? candidate.image_url,
          clueType: entry.clue_type,
          country: entry.country_common,
          wikiTitle: entry.wiki_title,
        });
        notes.push(
          `${visionAccepts(vision, 0.55) ? "ok" : "no"} ${vision.score}${vision.shows_country_name ? " SHOWS-COUNTRY" : ""}: ${vision.reason}`,
        );
        if (visionAccepts(vision, 0.55)) kept.push({ candidate, score: vision.score });
      }
      kept.sort((a, b) => b.score - a.score);

      await updateSeedEntry(db as Db, entry.id, {
        image_candidates: kept.map((k) => k.candidate),
        selected_candidate_index: 0,
        vision_pass: kept.length > 0,
        vision_notes: notes.join("\n"),
        status: kept.length > 0 ? "needs_review" : "needs_image",
      });
      if (kept.length > 0) ok++;
      console.log(`${i + 1}/${todo.length} ${kept.length > 0 ? "OK  " : "NONE"} ${label}: ${kept.length}/${Math.min(raw.length, MAX_CANDIDATES)} images`);
    }
  }

  console.log(`\nDone: ${ok}/${todo.length} clues have at least one usable image.`);
}

main().catch((err) => {
  console.error("Bulk seed failed:", err);
  process.exit(1);
});
