import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { getReviewGrid, summarize } from "@/lib/daily-review/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, unauthorized } from "./respond";

export async function GET() {
  if (!(await checkAdmin())) return unauthorized();
  try {
    const grid = await getReviewGrid(createReviewContext(createAdminClient()));
    return NextResponse.json({ grid, summary: summarize(grid) });
  } catch (err) {
    return errorResponse(err);
  }
}
