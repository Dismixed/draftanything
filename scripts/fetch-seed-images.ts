#!/usr/bin/env tsx
/**
 * Bulk-resolve images for ag_seed_entries by clue type.
 *
 * Usage:
 *   npx tsx scripts/fetch-seed-images.ts wildlife
 */

import { createRequire } from "node:module";
import { config } from "dotenv";

config({ path: ".env.local" });

const require = createRequire(import.meta.url);
require("./stub-server-only.cjs");

const clueType = process.argv[2];
if (!clueType) {
  console.error("Usage: npx tsx scripts/fetch-seed-images.ts <clue_type>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const {
    listSeedEntries,
    updateSeedEntry,
    imageAltsFor,
    ensureMissingSeedEntries,
  } = await import("../lib/anyguessr/seed-db");
  const { resolveImageCandidates } = await import("../lib/anyguessr/image-sourcing");
  const { filterCandidatesWithVision } = await import("../lib/anyguessr/vision-filter");
  const { getFlagUrlForCca3 } = await import("../lib/anyguessr/country-geo");

  const db = createClient(url!, key!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await ensureMissingSeedEntries(db);
  const entries = await listSeedEntries(db, { clueType });
  console.log(`Found ${entries.length} ${clueType} entries`);

  let success = 0;
  let failed = 0;

  for (const entry of entries) {
    const label = `${entry.country_common} (${entry.wiki_title ?? "no title"})`;
    try {
      let candidates;
      let visionNotes: string | null = null;

      if (entry.clue_type === "flag") {
        const flagUrl = getFlagUrlForCca3(entry.cca3);
        candidates = flagUrl
          ? [{ image_url: flagUrl, thumb_url: flagUrl, source: "flagcdn" }]
          : [];
      } else {
        const extras = imageAltsFor(entry.cca3, entry.clue_type);
        const raw = await resolveImageCandidates({
          clueType: entry.clue_type,
          country: entry.country_common,
          wikiTitle: entry.wiki_title,
          extraTitles: extras,
        });

        candidates = raw;
        if (raw.length > 0) {
          const filtered = await filterCandidatesWithVision({
            candidates: raw,
            clueType: entry.clue_type,
            country: entry.country_common,
            wikiTitle: entry.wiki_title,
          });
          candidates = filtered.map(({ vision, ...c }) => c);
          visionNotes = filtered
            .map(
              (c) =>
                `${c.image_url.slice(-24)}: ${c.vision.reason} (${c.vision.score})`,
            )
            .join("\n");
        }
      }

      await updateSeedEntry(db, entry.id, {
        image_candidates: candidates,
        selected_candidate_index: 0,
        vision_pass: candidates.length > 0 ? true : false,
        vision_notes: visionNotes,
        status: candidates.length > 0 ? "needs_review" : "needs_image",
      });

      console.log(`OK  ${label} -> ${candidates.length} candidates`);
      success += 1;
    } catch (err) {
      console.error(
        `FAIL ${label}: ${err instanceof Error ? err.message : String(err)}`,
      );
      failed += 1;
    }
  }

  console.log(`\nDone: ${success}/${entries.length} ok, ${failed} failed`);
}

main().catch((err) => {
  console.error("Fetch failed:", err);
  process.exit(1);
});
