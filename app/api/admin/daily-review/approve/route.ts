import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { approve } from "@/lib/daily-review/service";
import { ReviewError } from "@/lib/daily-review/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, dateSchema, gameSchema, readJson, unauthorized } from "../respond";

const bodySchema = z.object({
  items: z.array(z.object({ game: gameSchema, date: dateSchema })).min(1).max(100),
});

/** Approves one slot or many ("approve all in this row/column"). Locked or empty slots are reported, not fatal. */
export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return unauthorized();
  const body = bodySchema.safeParse(await readJson(req));
  if (!body.success) return badRequest("items must be [{ game, date }]");

  const ctx = createReviewContext(createAdminClient());
  let approved = 0;
  const failed: { game: string; date: string; error: string }[] = [];
  for (const item of body.data.items) {
    try {
      await approve(ctx, { ...item, email: admin.email });
      approved++;
    } catch (err) {
      failed.push({ ...item, error: err instanceof ReviewError ? err.code : String(err) });
    }
  }
  return NextResponse.json({ approved, failed });
}
