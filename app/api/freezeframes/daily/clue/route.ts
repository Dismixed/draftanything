import { createAdminClient } from "@/lib/supabase/admin";
import { getSongTextClue } from "@/lib/freezeframes/puzzle-service";

/**
 * GET /api/freezeframes/daily/clue
 *
 * The written clue for today's song round, for players who cannot play
 * audio. It is kept out of the daily payload so that asking for it is a
 * deliberate choice, since it lowers the round's maximum score.
 */
export async function GET() {
  try {
    const clue = await getSongTextClue(createAdminClient());
    if (!clue) return Response.json({ error: "NO_CLUE" }, { status: 404 });
    return Response.json({ clue });
  } catch (err) {
    console.error("freezeframes clue failed:", err);
    return Response.json({ error: "FAILED" }, { status: 500 });
  }
}
