import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyCategoryForPlay } from "@/lib/hot-takes/daily-service";

export async function GET() {
  try {
    const db = createAdminClient();
    const category = await getDailyCategoryForPlay(db);
    return NextResponse.json(category);
  } catch (err) {
    console.error("daily-category failed:", err);
    return NextResponse.json({ error: "Failed to load daily category" }, { status: 500 });
  }
}
