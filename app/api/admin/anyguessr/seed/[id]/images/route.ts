import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { imageAltsFor, getSeedEntry, updateSeedEntry } from "@/lib/anyguessr/seed-db";
import { resolveImageCandidates } from "@/lib/anyguessr/image-sourcing";
import { filterCandidatesWithVision } from "@/lib/anyguessr/vision-filter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const useVision = body.useVision !== false;

    const db = createAdminClient();
    const entry = await getSeedEntry(db, id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (entry.clue_type === "written_language") {
      return NextResponse.json({ error: "Text clues have no images" }, { status: 400 });
    }

    const extras = imageAltsFor(entry.cca3, entry.clue_type);
    const raw = await resolveImageCandidates({
      clueType: entry.clue_type,
      country: entry.country_common,
      wikiTitle: entry.wiki_title,
      extraTitles: extras,
    });

    let candidates = raw;
    let visionNotes: string | null = null;

    if (useVision && raw.length > 0) {
      const filtered = await filterCandidatesWithVision({
        candidates: raw,
        clueType: entry.clue_type,
        country: entry.country_common,
        wikiTitle: entry.wiki_title,
      });
      candidates = filtered.map(({ vision, ...c }) => c);
      visionNotes = filtered
        .map((c) => `${c.image_url.slice(-24)}: ${c.vision.reason} (${c.vision.score})`)
        .join("\n");
    }

    const updated = await updateSeedEntry(db, id, {
      image_candidates: candidates,
      selected_candidate_index: 0,
      vision_pass: candidates.length > 0 ? true : false,
      vision_notes: visionNotes,
      status: candidates.length > 0 ? "needs_review" : "needs_image",
    });

    return NextResponse.json({
      entry: updated,
      candidateCount: candidates.length,
    });
  } catch (err) {
    console.error("anyguessr seed images failed:", err);
    return NextResponse.json({ error: "Failed to resolve images" }, { status: 500 });
  }
}
