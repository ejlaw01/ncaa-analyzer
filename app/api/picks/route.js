import { NextResponse } from "next/server";
import { getStoredPicks } from "@/lib/picksStore";

export const dynamic = "force-dynamic";

/**
 * GET /api/picks
 *
 * Returns the currently stored picks without hitting The Odds API.
 * Dashboard calls this on load. Returns null if no picks generated yet.
 */
export async function GET() {
  const picks = getStoredPicks();

  if (!picks) {
    return NextResponse.json({ data: null, message: "No picks generated yet." });
  }

  return NextResponse.json({ data: picks });
}
