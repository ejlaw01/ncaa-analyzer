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

// ---------------------------------------------------------------------------
// Pick accuracy tracking
// ---------------------------------------------------------------------------

/**
 * Store recommended picks into the `picks` table.
 * Dedupes on (game_id, pick_date). Only stores meetsCriteria=true picks.
 *
 * @param {Array} picks - analysis objects with meetsCriteria=true
 * @param {string} pickDate - YYYY-MM-DD date string
 */
export async function upsertPicks(picks, pickDate) {
  const client = getClient();
  if (!client) return;

  const rows = picks
    .filter((p) => p.meetsCriteria && p.gameId)
    .map((p) => ({
      game_id: p.gameId,
      pick_date: pickDate,
      home_team: p.homeTeam,
      away_team: p.awayTeam,
      conference: p.conference,
      commence_time: p.commenceTime,
      todays_line: p.todaysLine,
      combined_avg: p.combinedAvg,
      value: p.value,
      over_count: p.overCount,
      total_games_analyzed: p.totalGamesAnalyzed,
      strength: p.strength,
      result: "pending",
    }));

  if (rows.length === 0) return;

  const { error } = await client
    .from("picks")
    .upsert(rows, { onConflict: "game_id,pick_date", ignoreDuplicates: false });

  if (error) {
    console.error("[Supabase] upsertPicks error:", error.message);
  } else {
    console.log(`[Supabase] Upserted ${rows.length} picks for ${pickDate}`);
  }
}

/**
 * Resolve pending picks against actual game scores.
 * Matches completed scores to pending picks by game_id, marks win/loss/push.
 *
 * @param {Array} scores - parsed score objects with id, totalScore, completed
 */
export async function resolvePicks(scores) {
  const client = getClient();
  if (!client) return;

  const completedScores = scores.filter((s) => s.completed && s.totalScore !== null);
  if (completedScores.length === 0) return;

  const gameIds = completedScores.map((s) => s.id);
  const { data: pendingPicks, error: fetchError } = await client
    .from("picks")
    .select("id, game_id, todays_line")
    .eq("result", "pending")
    .in("game_id", gameIds);

  if (fetchError) {
    console.error("[Supabase] resolvePicks fetch error:", fetchError.message);
    return;
  }

  if (!pendingPicks || pendingPicks.length === 0) return;

  const scoreMap = new Map();
  for (const s of completedScores) {
    scoreMap.set(s.id, s);
  }

  let resolved = 0;
  for (const pick of pendingPicks) {
    const score = scoreMap.get(pick.game_id);
    if (!score) continue;

    const isOver = score.totalScore > pick.todays_line;
    const isPush = score.totalScore === pick.todays_line;
    const result = isPush ? "push" : isOver ? "win" : "loss";

    const { error: updateError } = await client
      .from("picks")
      .update({
        actual_total: score.totalScore,
        is_over: isOver,
        result,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", pick.id);

    if (updateError) {
      console.error(`[Supabase] resolvePick ${pick.id} error:`, updateError.message);
    } else {
      resolved++;
    }
  }

  if (resolved > 0) {
    console.log(`[Supabase] Resolved ${resolved} picks`);
  }
}

/**
 * Resolve stale pending picks (older than 3 days) using the games table.
 * Fallback for when the Odds API score window has passed.
 */
export async function resolveStalePicksFromDB() {
  const client = getClient();
  if (!client) return;

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const { data: stalePicks, error } = await client
    .from("picks")
    .select("id, game_id, todays_line")
    .eq("result", "pending")
    .lt("pick_date", threeDaysAgo.toISOString().slice(0, 10));

  if (error || !stalePicks || stalePicks.length === 0) return;

  const gameIds = stalePicks.map((p) => p.game_id);
  const { data: games } = await client
    .from("games")
    .select("id, total_score")
    .in("id", gameIds)
    .not("total_score", "is", null);

  if (!games || games.length === 0) return;

  const scoreMap = new Map(games.map((g) => [g.id, g.total_score]));

  let resolved = 0;
  for (const pick of stalePicks) {
    const totalScore = scoreMap.get(pick.game_id);
    if (totalScore == null) continue;

    const isOver = totalScore > pick.todays_line;
    const isPush = totalScore === pick.todays_line;

    const { error: updateError } = await client
      .from("picks")
      .update({
        actual_total: totalScore,
        is_over: isOver,
        result: isPush ? "push" : isOver ? "win" : "loss",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", pick.id);

    if (!updateError) resolved++;
  }

  if (resolved > 0) {
    console.log(`[Supabase] Resolved ${resolved} stale picks from DB`);
  }
}

/**
 * Fetch pick accuracy statistics.
 *
 * @param {object} filters - optional { conference, strength, dateFrom, dateTo }
 * @returns {object|null} - { resolvedPicks, pendingCount }
 */
export async function fetchPickStats(filters = {}) {
  const client = getClient();
  if (!client) return null;

  let query = client
    .from("picks")
    .select("*")
    .neq("result", "pending")
    .order("pick_date", { ascending: false });

  if (filters.conference) query = query.eq("conference", filters.conference);
  if (filters.strength) query = query.eq("strength", filters.strength);
  if (filters.dateFrom) query = query.gte("pick_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("pick_date", filters.dateTo);

  const { data, error } = await query.limit(5000);

  if (error) {
    console.error("[Supabase] fetchPickStats error:", error.message);
    return null;
  }

  const { data: pendingData } = await client
    .from("picks")
    .select("id")
    .eq("result", "pending");

  return {
    resolvedPicks: data || [],
    pendingCount: pendingData?.length || 0,
  };
}
