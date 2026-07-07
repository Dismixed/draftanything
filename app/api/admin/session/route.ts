import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ authorized: false }, { status: 403 });
  }
  return NextResponse.json({ authorized: true, email: admin.email });
}
