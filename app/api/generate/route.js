import { NextResponse } from "next/server";
import { fetchAllData, clearCache } from "@/lib/oddsApi";
import { analyzeAllGames, groupByConference } from "@/lib/analyzer";
import { setStoredPicks } from "@/lib/picksStore";
import { todayString } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/generate
 *
 * Fetches data from The Odds API, runs analysis, and stores picks.
 * Called by:
 *   - Vercel Cron (daily at 6am)
 *   - Manual refresh button
 *
 * Query params:
 *   ?refresh=true  — clears cache and fetches fresh data
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (forceRefresh) {
      clearCache();
    }

    // Fetch data (cached or fresh)
    const data = await fetchAllData();

    // Run analysis
    const analyses = analyzeAllGames(data.todaysGames, data.recentScores);
    const grouped = groupByConference(analyses);

    // Filter to only recommendations (4+ overs)
    const recommendations = analyses.filter((a) => a.meetsCriteria);

    const result = {
      date: todayString(),
      generatedAt: new Date().toISOString(),
      fetchedAt: data.fetchedAt,
      totalGamesToday: data.todaysGames.filter((g) => !g.completed).length,
      totalAnalyzed: analyses.length,
      totalRecommendations: recommendations.length,
      apiQuota: data.quota,
      byConference: grouped,
      allAnalyses: analyses,
      recommendations,
    };

    // Store for dashboard display without re-fetching
    setStoredPicks(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/generate] Error:", error);

    const status = error.message.includes("rate limit") ? 429 : 500;
    const userMessage =
      status === 429
        ? "API rate limit reached. Please try again later."
        : error.message.includes("ODDS_API_KEY")
          ? "API key not configured. Add ODDS_API_KEY to your environment variables."
          : "Failed to generate picks. Please try again.";

    return NextResponse.json(
      {
        error: userMessage,
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status }
    );
  }
}
