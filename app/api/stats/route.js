import { NextResponse } from "next/server";
import { fetchPickStats, resolveStalePicksFromDB } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats
 *
 * Returns pick accuracy statistics.
 * Query params:
 *   ?conference=SEC       - filter by conference
 *   ?strength=strong      - filter by strength
 *   ?from=2026-01-01      - start date
 *   ?to=2026-02-25        - end date
 */
export async function GET(request) {
  try {
    // Resolve any stale picks in the background
    resolveStalePicksFromDB().catch(() => {});

    const { searchParams } = new URL(request.url);
    const filters = {
      conference: searchParams.get("conference") || undefined,
      strength: searchParams.get("strength") || undefined,
      dateFrom: searchParams.get("from") || undefined,
      dateTo: searchParams.get("to") || undefined,
    };

    const rawData = await fetchPickStats(filters);

    if (!rawData) {
      return NextResponse.json({
        data: null,
        message: "Stats not available (Supabase not configured)",
      });
    }

    const { resolvedPicks, pendingCount } = rawData;
    const stats = calculateStats(resolvedPicks, pendingCount);

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("[/api/stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats." },
      { status: 500 }
    );
  }
}

function calculateStats(picks, pendingCount) {
  const wins = picks.filter((p) => p.result === "win").length;
  const losses = picks.filter((p) => p.result === "loss").length;
  const pushes = picks.filter((p) => p.result === "push").length;
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 1000) / 10 : 0;

  // By conference
  const byConference = {};
  for (const pick of picks) {
    const conf = pick.conference || "Other";
    if (!byConference[conf]) byConference[conf] = { wins: 0, losses: 0, pushes: 0 };
    if (pick.result === "win") byConference[conf].wins++;
    else if (pick.result === "loss") byConference[conf].losses++;
    else if (pick.result === "push") byConference[conf].pushes++;
  }

  // By strength
  const byStrength = {};
  for (const pick of picks) {
    const str = pick.strength;
    if (!byStrength[str]) byStrength[str] = { wins: 0, losses: 0, pushes: 0 };
    if (pick.result === "win") byStrength[str].wins++;
    else if (pick.result === "loss") byStrength[str].losses++;
    else if (pick.result === "push") byStrength[str].pushes++;
  }

  // Recent picks (last 20 resolved)
  const recentPicks = picks.slice(0, 20).map((p) => ({
    date: p.pick_date,
    matchup: `${p.away_team} @ ${p.home_team}`,
    conference: p.conference,
    line: p.todays_line,
    value: p.value,
    strength: p.strength,
    actualTotal: p.actual_total,
    result: p.result,
  }));

  return {
    overall: { wins, losses, pushes, total, winPct, pendingCount },
    byConference,
    byStrength,
    recentPicks,
  };
}
