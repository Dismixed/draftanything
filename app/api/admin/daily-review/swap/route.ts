import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createReviewContext } from "@/lib/daily-review/adapters";
import { swap } from "@/lib/daily-review/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { badRequest, dateSchema, errorResponse, gameSchema, readJson, unauthorized } from "../respond";

const bodySchema = z.object({
  game: gameSchema,
  date: dateSchema,
  contentId: z.string().min(1),
  retire: z.boolean().optional(),
});

export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return unauthorized();
  const body = bodySchema.safeParse(await readJson(req));
  if (!body.success) return badRequest("game, date and contentId are required");
  try {
    await swap(createReviewContext(createAdminClient()), {
      ...body.data,
      retire: body.data.retire ?? false,
      email: admin.email,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
