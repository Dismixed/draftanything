import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { listAlternates } from "@/lib/daily-review/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, dateSchema, errorResponse, gameSchema, unauthorized } from "../respond";

export async function GET(req: Request) {
  if (!(await checkAdmin())) return unauthorized();
  const params = new URL(req.url).searchParams;
  const game = gameSchema.safeParse(params.get("game"));
  const date = dateSchema.safeParse(params.get("date"));
  if (!game.success || !date.success) return badRequest("game and date are required");
  try {
    // all=1 lists every eligible item, so an admin can put a specific one on a day.
    const limit = params.get("all") === "1" ? Infinity : undefined;
    const alternates = await listAlternates(
      createReviewContext(createAdminClient()),
      game.data,
      date.data,
      undefined,
      limit,
    );
    return NextResponse.json({ alternates });
  } catch (err) {
    return errorResponse(err);
  }
}
