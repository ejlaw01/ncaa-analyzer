import { NextResponse } from "next/server";
import { fetchAllData, clearCache } from "@/lib/oddsApi";
import { analyzeAllGames, groupByConference } from "@/lib/analyzer";
import { setStoredPicks } from "@/lib/picksStore";
import { todayString } from "@/lib/utils";
import {
  upsertScores,
  upsertGamesWithOdds,
  fetchAllScores,
  fetchAllGamesWithOdds,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Merge two arrays by `id`, with `primary` winning on conflicts.
 */
function mergeById(primary, secondary) {
  const map = new Map();
  for (const item of secondary) map.set(item.id, item);
  for (const item of primary) map.set(item.id, item);
  return Array.from(map.values());
}

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

    // Fetch data from Odds API (cached or fresh)
    const data = await fetchAllData();

    // --- Supabase: store + enrich (graceful fallback on error) ---
    let enrichedScores = data.recentScores;
    let enrichedOdds = data.todaysGames;

    try {
      // Upsert fresh API data into Supabase (fire-and-forget style, but await)
      await Promise.all([
        upsertScores(data.recentScores),
        upsertGamesWithOdds(data.todaysGames),
      ]);

      // Fetch full history from Supabase
      const [dbScores, dbOdds] = await Promise.all([
        fetchAllScores(),
        fetchAllGamesWithOdds(),
      ]);

      // Merge: API data wins on conflicts (fresher)
      if (dbScores.length > 0) {
        enrichedScores = mergeById(data.recentScores, dbScores);
        console.log(
          `[Generate] Enriched scores: ${data.recentScores.length} API + ${dbScores.length} DB → ${enrichedScores.length} merged`
        );
      }
      if (dbOdds.length > 0) {
        enrichedOdds = mergeById(data.todaysGames, dbOdds);
        console.log(
          `[Generate] Enriched odds: ${data.todaysGames.length} API + ${dbOdds.length} DB → ${enrichedOdds.length} merged`
        );
      }
    } catch (dbError) {
      console.error("[Generate] Supabase error (falling back to API only):", dbError.message);
    }

    // Run analysis with enriched data
    const analyses = analyzeAllGames(data.todaysGames, enrichedScores, enrichedOdds);
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
