import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getSeedEntry, updateSeedEntry } from "@/lib/anyguessr/seed-db";
import { CLUE_DIFFICULTIES, FUN_FACT_MAX_LENGTH, type SeedEntryStatus } from "@/lib/anyguessr/seed-types";

/** A new fact text is unreviewed unless the caller says a person has just reviewed it. */
function funFactChange(body: { fun_fact?: unknown; fun_fact_reviewed?: unknown }) {
  const reviewed = typeof body.fun_fact_reviewed === "boolean" ? body.fun_fact_reviewed : undefined;
  if (body.fun_fact === undefined) return reviewed === undefined ? {} : { fun_fact_reviewed: reviewed };
  if (body.fun_fact !== null && typeof body.fun_fact !== "string") return null;

  const text = body.fun_fact === null ? "" : body.fun_fact.trim();
  if (text.length > FUN_FACT_MAX_LENGTH) return null;
  if (!text) return { fun_fact: null, fun_fact_reviewed: false };
  return { fun_fact: text, fun_fact_reviewed: reviewed ?? false };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const db = createAdminClient();
    const entry = await getSeedEntry(db, id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("anyguessr seed get failed:", err);
    return NextResponse.json({ error: "Failed to load entry" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const fact = funFactChange(body);
    if (!fact) {
      return NextResponse.json({ error: `fun_fact must be text of at most ${FUN_FACT_MAX_LENGTH} characters` }, { status: 400 });
    }
    const db = createAdminClient();

    const entry = await updateSeedEntry(db, id, {
      wiki_title: body.wiki_title,
      text_content: body.text_content,
      status: body.status as SeedEntryStatus | undefined,
      difficulty: CLUE_DIFFICULTIES.includes(body.difficulty) ? body.difficulty : undefined,
      ...fact,
      image_candidates: body.image_candidates,
      selected_candidate_index: body.selected_candidate_index,
      vision_pass: body.vision_pass,
      vision_notes: body.vision_notes,
      notes: body.notes,
    });

    return NextResponse.json({ entry });
  } catch (err) {
    console.error("anyguessr seed patch failed:", err);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}
