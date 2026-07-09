import { NextResponse } from "next/server";
import { getDailyCategory } from "@/lib/hot-takes/categories";

export async function GET() {
  return NextResponse.json(getDailyCategory());
}
