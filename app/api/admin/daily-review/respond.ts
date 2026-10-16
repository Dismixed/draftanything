import { NextResponse } from "next/server";
import { z } from "zod";
import { ReviewError, REVIEW_GAMES } from "@/lib/daily-review/types";

export const gameSchema = z.enum(REVIEW_GAMES);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 403 });
export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });

/** ReviewError → 409 with its code; anything else → 500. */
export function errorResponse(err: unknown) {
  if (err instanceof ReviewError) return NextResponse.json({ error: err.code }, { status: 409 });
  console.error("[daily-review]", err);
  return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
