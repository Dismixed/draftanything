import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { listRetiredCategories, unretireCategory } from "@/lib/ball-knowledge/schedule-service";
import { createAdminClient } from "@/lib/supabase/admin";

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 403 });

export async function GET() {
  if (!(await checkAdmin())) return unauthorized();
  const retired = await listRetiredCategories(createAdminClient());
  return NextResponse.json({ retired });
}

/** Puts a retired category back into the rotation. */
export async function DELETE(req: Request) {
  if (!(await checkAdmin())) return unauthorized();
  let category: unknown;
  try {
    category = (await req.json())?.category;
  } catch {
    category = null;
  }
  if (typeof category !== "string" || !category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }
  await unretireCategory(createAdminClient(), category);
  return NextResponse.json({ ok: true });
}
