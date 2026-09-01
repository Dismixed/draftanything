import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createPuzzle } from "@/lib/getting-warmer/puzzle-db";
import { proposePuzzlesBatchWithLlm } from "@/lib/getting-warmer/puzzle-propose";

export async function POST() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const proposals = await proposePuzzlesBatchWithLlm();
    const db = createAdminClient();
    const puzzles = await Promise.all(
      proposals.map((p) =>
        createPuzzle(db, { answer: p.answer, clues: p.clues, status: "draft" }),
      ),
    );
    return NextResponse.json({ puzzles });
  } catch (err) {
    console.error("getting-warmer puzzle generate failed:", err);
    return NextResponse.json({ error: "Failed to generate puzzles" }, { status: 500 });
  }
}
