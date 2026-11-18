import { NextResponse } from "next/server";
import { dailyDate } from "@/lib/daily-day";
import { legsFor, treasureFor } from "@/lib/dead-reckoning/daily-service";
import { voyageNumber } from "@/lib/dead-reckoning/voyage";

/** Today's voyage. Worked out from the date alone, so it is the same for everyone. */
export const dynamic = "force-dynamic";

export function GET() {
  const date = dailyDate();
  return NextResponse.json(
    { date, voyage: voyageNumber(date), legs: legsFor(date), treasure: treasureFor(date) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
