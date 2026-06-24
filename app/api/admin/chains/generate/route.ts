import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { generateChains, saveDraftChains } from "@/lib/chainlink/generator";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    let body: {
      count?: number;
      difficulty?: "easy" | "medium" | "hard";
      category?: string;
    };
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const db = createAdminClient();

    const chains = await generateChains(db, {
      length: 5,
      difficulty: body.difficulty,
      category: body.category,
      count: body.count ?? 25,
    });

    const saved = await saveDraftChains(db, chains, admin.email);

    return NextResponse.json({
      generated: chains.length,
      saved,
      chains: chains.map((c) => ({
        words: c.words,
        phrases: c.phrases,
        difficulty: c.difficulty,
        score: c.score,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to generate chains:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
