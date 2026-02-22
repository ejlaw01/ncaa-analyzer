import { NextResponse } from "next/server";
import { fetchHistoricalOdds, fetchHistoricalEvents, fetchScores, parseScore, isPaidTier } from "@/lib/oddsApi";
import { upsertScores, upsertGamesWithOdds } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Convert a historical event (with scores) into parseScore() shape.
 */
function eventToScore(event) {
  let homeScore = null;
  let awayScore = null;

  if (event.scores && Array.isArray(event.scores)) {
    for (const s of event.scores) {
      if (s.name === event.homeTeam) homeScore = parseInt(s.score);
      if (s.name === event.awayTeam) awayScore = parseInt(s.score);
    }
  }

  return {
    id: event.id,
    homeTeam: event.homeTeam,
    awayTeam: event.awayTeam,
    homeScore,
    awayScore,
    totalScore: homeScore !== null && awayScore !== null ? homeScore + awayScore : null,
    completed: event.completed,
    commenceTime: event.commenceTime,
  };
}

/**
 * GET /api/backfill?days=14
 *
 * One-time historical data population.
 * For each day:
 *   1. Fetches historical odds at noon (O/U lines for that day's games)
 *   2. Fetches historical events next morning (completed games with scores)
 * Stores everything in Supabase.
 *
 * Requires ODDS_API_TIER=paid.
 */
export async function GET(request) {
  if (!isPaidTier()) {
    return NextResponse.json(
      { error: "Backfill requires ODDS_API_TIER=paid" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "14", 10), 60);

  try {
    let totalOddsStored = 0;
    let totalScoresStored = 0;
    let daysProcessed = 0;
    const errors = [];

    // Step 1: Fetch and store recent scores (daysFrom maxes at 3)
    console.log(`[Backfill] Fetching recent scores (daysFrom=3)...`);
    const scoresResult = await fetchScores(3);
    const scores = scoresResult.scores.map(parseScore);
    await upsertScores(scores);
    const recentScores = scores.filter((s) => s.completed && s.totalScore !== null).length;
    totalScoresStored += recentScores;
    console.log(`[Backfill] Stored ${recentScores} recent scores`);

    // Step 2: For each day, fetch odds at noon + events next morning for scores
    console.log(`[Backfill] Processing ${days} days of historical data...`);

    for (let i = days; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);

      // Noon UTC — get that day's games with O/U lines
      date.setUTCHours(12, 0, 0, 0);
      const noonISO = date.toISOString().replace(".000Z", "Z");

      // Next day 8am UTC — games should be completed with scores
      const nextMorning = new Date(date);
      nextMorning.setDate(nextMorning.getDate() + 1);
      nextMorning.setUTCHours(8, 0, 0, 0);
      const nextMorningISO = nextMorning.toISOString().replace(".000Z", "Z");

      try {
        // Fetch odds (O/U lines)
        const oddsResult = await fetchHistoricalOdds(noonISO);
        if (oddsResult && oddsResult.games.length > 0) {
          await upsertGamesWithOdds(oddsResult.games);
          totalOddsStored += oddsResult.games.filter((g) => g.overUnder !== null).length;
        }

        await new Promise((r) => setTimeout(r, 100));

        // Fetch events next morning (completed games with scores)
        const eventsResult = await fetchHistoricalEvents(nextMorningISO);
        if (eventsResult && eventsResult.events.length > 0) {
          const completedScores = eventsResult.events
            .filter((e) => e.completed && e.scores)
            .map(eventToScore)
            .filter((s) => s.totalScore !== null);

          if (completedScores.length > 0) {
            await upsertScores(completedScores);
            totalScoresStored += completedScores.length;
          }
          console.log(
            `[Backfill] Day -${i} (${dateStr}): ${oddsResult?.games.length || 0} odds, ${completedScores.length} scores`
          );
        } else {
          console.log(
            `[Backfill] Day -${i} (${dateStr}): ${oddsResult?.games.length || 0} odds, 0 scores`
          );
        }

        daysProcessed++;
      } catch (dayError) {
        console.error(`[Backfill] Day -${i} error:`, dayError.message);
        errors.push({ day: -i, date: dateStr, error: dayError.message });
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    const summary = {
      daysProcessed,
      totalOddsStored,
      totalScoresStored,
      message: `Backfill complete. ${daysProcessed}/${days} days processed, ${totalScoresStored} total scores stored.`,
      ...(errors.length > 0 && { errors }),
    };

    console.log("[Backfill] Complete:", summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Backfill] Error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
