/**
 * Supabase client for storing and retrieving historical game data.
 *
 * Gracefully falls back to no-ops when SUPABASE_URL / SUPABASE_ANON_KEY
 * are not configured, so the app works identically without Supabase.
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let supabase = null;

function getClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log("[Supabase] Not configured — skipping DB operations");
    return null;
  }

  supabase = createClient(url, key);
  return supabase;
}

// ---------------------------------------------------------------------------
// Upsert completed scores
// ---------------------------------------------------------------------------

/**
 * Store completed game scores into the `games` table.
 * Dedupes on `id`. Only stores completed games with valid scores.
 *
 * @param {Array} scores – array in parseScore() shape
 */
export async function upsertScores(scores) {
  const client = getClient();
  if (!client) return;

  const rows = scores
    .filter((s) => s.completed && s.totalScore !== null)
    .map((s) => ({
      id: s.id,
      home_team: s.homeTeam,
      away_team: s.awayTeam,
      home_score: s.homeScore,
      away_score: s.awayScore,
      total_score: s.totalScore,
      completed: true,
      commence_time: s.commenceTime,
    }));

  if (rows.length === 0) return;

  const { error } = await client
    .from("games")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("[Supabase] upsertScores error:", error.message);
  } else {
    console.log(`[Supabase] Upserted ${rows.length} scores`);
  }
}

// ---------------------------------------------------------------------------
// Upsert games with O/U odds
// ---------------------------------------------------------------------------

/**
 * Store today's games (with O/U lines) into the `games` table.
 * Preserves existing scores — only updates odds-related fields.
 *
 * @param {Array} games – array in parseGame() shape
 */
export async function upsertGamesWithOdds(games) {
  const client = getClient();
  if (!client) return;

  const rows = games
    .filter((g) => g.overUnder !== null)
    .map((g) => ({
      id: g.id,
      home_team: g.homeTeam,
      away_team: g.awayTeam,
      completed: g.completed ?? false,
      commence_time: g.commenceTime,
      over_under: g.overUnder,
      bookmaker: g.bookmaker,
    }));

  if (rows.length === 0) return;

  // Use upsert but only update odds columns — scores are set by upsertScores
  const { error } = await client
    .from("games")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("[Supabase] upsertGamesWithOdds error:", error.message);
  } else {
    console.log(`[Supabase] Upserted ${rows.length} games with odds`);
  }
}

// ---------------------------------------------------------------------------
// Fetch all historical scores
// ---------------------------------------------------------------------------

/**
 * Returns all completed games from the DB in the same shape as parseScore().
 *
 * @returns {Array} – array matching parseScore() output
 */
export async function fetchAllScores() {
  const client = getClient();
  if (!client) return [];

  // Don't filter on `completed` — upsertGamesWithOdds can overwrite it to false.
  // A game with a valid total_score is effectively completed.
  const { data, error } = await client
    .from("games")
    .select("id, home_team, away_team, home_score, away_score, total_score, completed, commence_time")
    .not("total_score", "is", null)
    .order("commence_time", { ascending: false })
    .limit(10000);

  if (error) {
    console.error("[Supabase] fetchAllScores error:", error.message);
    return [];
  }

  console.log(`[Supabase] Fetched ${data.length} historical scores`);

  return data.map((row) => ({
    id: row.id,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeScore: row.home_score,
    awayScore: row.away_score,
    totalScore: row.total_score,
    completed: row.completed,
    commenceTime: row.commence_time,
  }));
}

// ---------------------------------------------------------------------------
// Fetch all historical games with odds
// ---------------------------------------------------------------------------

/**
 * Returns all games that have an O/U line from the DB,
 * in the same shape as parseGame().
 *
 * @returns {Array} – array matching parseGame() output
 */
export async function fetchAllGamesWithOdds() {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from("games")
    .select("id, home_team, away_team, completed, commence_time, over_under, bookmaker")
    .not("over_under", "is", null)
    .order("commence_time", { ascending: false })
    .limit(10000);

  if (error) {
    console.error("[Supabase] fetchAllGamesWithOdds error:", error.message);
    return [];
  }

  console.log(`[Supabase] Fetched ${data.length} historical games with odds`);

  return data.map((row) => ({
    id: row.id,
    sportKey: "basketball_ncaab",
    commenceTime: row.commence_time,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    overUnder: row.over_under,
    bookmaker: row.bookmaker,
    completed: row.completed,
    scores: null,
  }));
}
