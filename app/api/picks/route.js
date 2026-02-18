import { NextResponse } from "next/server";
import { getStoredPicks, setStoredPicks } from "@/lib/picksStore";
import { fetchAllScores, fetchAllGamesWithOdds } from "@/lib/supabase";
import { analyzeAllGames, groupByConference } from "@/lib/analyzer";
import { todayString } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/picks
 *
 * Returns stored picks. If the in-memory cache is empty, rebuilds
 * from Supabase data (no Odds API call).
 */
export async function GET() {
  // Try in-memory cache first
  let picks = getStoredPicks();
  if (picks) {
    return NextResponse.json({ data: picks });
  }

  // Rebuild from Supabase
  try {
    const [dbScores, dbOdds] = await Promise.all([
      fetchAllScores(),
      fetchAllGamesWithOdds(),
    ]);

    if (dbOdds.length === 0) {
      return NextResponse.json({ data: null, message: "No picks generated yet." });
    }

    // Filter to today's games (commence_time starts with today's date)
    const today = todayString();
    const todaysGames = dbOdds.filter(
      (g) => g.commenceTime && g.commenceTime.startsWith(today) && !g.completed
    );

    if (todaysGames.length === 0) {
      return NextResponse.json({ data: null, message: "No games found for today." });
    }

    const analyses = analyzeAllGames(todaysGames, dbScores, dbOdds);
    const grouped = groupByConference(analyses);
    const recommendations = analyses.filter((a) => a.meetsCriteria);

    const result = {
      date: today,
      generatedAt: new Date().toISOString(),
      totalGamesToday: todaysGames.length,
      totalAnalyzed: analyses.length,
      totalRecommendations: recommendations.length,
      apiQuota: null,
      byConference: grouped,
      allAnalyses: analyses,
      recommendations,
    };

    // Cache for subsequent requests
    setStoredPicks(result);

    console.log(
      `[Picks] Rebuilt from Supabase: ${todaysGames.length} games, ${analyses.length} analyzed, ${recommendations.length} recommended`
    );

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("[Picks] Supabase rebuild error:", err.message);
    return NextResponse.json({ data: null, message: "No picks generated yet." });
  }
}
