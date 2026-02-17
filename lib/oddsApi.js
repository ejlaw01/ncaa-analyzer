/**
 * The Odds API client for NCAA basketball.
 * Free tier: 500 requests/month.
 * All responses are cached in-memory to minimize API calls.
 */

const BASE_URL = "https://api.the-odds-api.com/v4";
const SPORT = "basketball_ncaab";

function getApiKey() {
  const key = process.env.ODDS_API_KEY;
  if (!key || key === "your_key_here") {
    throw new Error("ODDS_API_KEY not configured. Set it in .env.local");
  }
  return key;
}

// In-memory cache (persists across requests within the same serverless instance)
const cache = {
  data: null,
  timestamp: 0,
  TTL: 30 * 60 * 1000, // 30 minutes
};

/**
 * Check remaining API quota from response headers.
 */
function checkQuota(headers) {
  const remaining = headers.get("x-requests-remaining");
  const used = headers.get("x-requests-used");
  if (remaining !== null) {
    console.log(`[Odds API] Requests used: ${used}, remaining: ${remaining}`);
    if (parseInt(remaining) < 50) {
      console.warn(`[Odds API] WARNING: Only ${remaining} requests remaining this month!`);
    }
  }
  return { remaining: parseInt(remaining || "0"), used: parseInt(used || "0") };
}

/**
 * Fetch today's NCAA basketball games with over/under odds.
 * Returns array of games with totals markets.
 *
 * API call cost: 1 request
 */
export async function fetchTodaysGames() {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/sports/${SPORT}/odds/?apiKey=${apiKey}&regions=us&markets=totals&oddsFormat=american`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API error (${res.status}): ${body}`);
  }

  const quota = checkQuota(res.headers);
  const games = await res.json();

  return { games, quota };
}

/**
 * Fetch completed NCAA basketball scores.
 * The Odds API returns scores for recently completed games.
 * `daysFrom` = number of days back to fetch (max 3 on free tier).
 *
 * API call cost: 1 request per call
 */
export async function fetchScores(daysFrom = 3) {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/sports/${SPORT}/scores/?apiKey=${apiKey}&daysFrom=${daysFrom}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API scores error (${res.status}): ${body}`);
  }

  const quota = checkQuota(res.headers);
  const scores = await res.json();

  return { scores, quota };
}

/**
 * Fetch historical odds for completed events.
 * Uses the events endpoint with completed games to get historical lines.
 *
 * API call cost: 1 request
 */
export async function fetchHistoricalOdds(eventIds) {
  // The Odds API v4 doesn't have a bulk historical odds endpoint on free tier.
  // We fetch event odds individually or use the scores endpoint data.
  // For MVP, we'll use the scores endpoint and estimate historical lines.
  return null;
}

/**
 * Parse a game object from the Odds API into our internal format.
 */
export function parseGame(game) {
  const totals = extractTotals(game);

  return {
    id: game.id,
    sportKey: game.sport_key,
    commenceTime: game.commence_time,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    overUnder: totals?.point ?? null,
    bookmaker: totals?.bookmaker ?? null,
    completed: game.completed ?? false,
    scores: game.scores ?? null,
  };
}

/**
 * Extract the best totals (over/under) line from a game's bookmakers.
 * Prefers consensus/average, falls back to first available.
 */
function extractTotals(game) {
  if (!game.bookmakers || game.bookmakers.length === 0) return null;

  // Collect all totals points from all bookmakers
  const totalPoints = [];

  for (const bookmaker of game.bookmakers) {
    const totalsMarket = bookmaker.markets?.find((m) => m.key === "totals");
    if (totalsMarket?.outcomes?.length > 0) {
      const overOutcome = totalsMarket.outcomes.find((o) => o.name === "Over");
      if (overOutcome?.point) {
        totalPoints.push({
          point: overOutcome.point,
          bookmaker: bookmaker.title,
        });
      }
    }
  }

  if (totalPoints.length === 0) return null;

  // Use the median line as the consensus
  totalPoints.sort((a, b) => a.point - b.point);
  const median = totalPoints[Math.floor(totalPoints.length / 2)];
  return { point: median.point, bookmaker: `Consensus (${totalPoints.length} books)` };
}

/**
 * Parse a score object from the Odds API.
 */
export function parseScore(score) {
  let homeScore = null;
  let awayScore = null;

  if (score.scores && Array.isArray(score.scores)) {
    for (const s of score.scores) {
      if (s.name === score.home_team) homeScore = parseInt(s.score);
      if (s.name === score.away_team) awayScore = parseInt(s.score);
    }
  }

  return {
    id: score.id,
    homeTeam: score.home_team,
    awayTeam: score.away_team,
    homeScore,
    awayScore,
    totalScore: homeScore !== null && awayScore !== null ? homeScore + awayScore : null,
    completed: score.completed ?? false,
    commenceTime: score.commence_time,
  };
}

/**
 * Get all data needed for analysis in minimal API calls.
 * Fetches today's games (with odds) + recent scores.
 *
 * Total API cost: 2-4 requests depending on daysFrom.
 */
export async function fetchAllData() {
  // Check cache first
  if (cache.data && Date.now() - cache.timestamp < cache.TTL) {
    console.log("[Odds API] Returning cached data");
    return cache.data;
  }

  console.log("[Odds API] Fetching fresh data...");

  // Fetch today's games with odds + recent completed scores in parallel
  const [todaysResult, scoresResult3] = await Promise.all([
    fetchTodaysGames(),
    fetchScores(3),
  ]);

  const todaysGames = todaysResult.games.map(parseGame);
  const recentScores = scoresResult3.scores.map(parseScore);

  const result = {
    todaysGames,
    recentScores,
    quota: scoresResult3.quota,
    fetchedAt: new Date().toISOString(),
  };

  // Cache the result
  cache.data = result;
  cache.timestamp = Date.now();

  return result;
}

/**
 * Clear the in-memory cache (used on manual refresh).
 */
export function clearCache() {
  cache.data = null;
  cache.timestamp = 0;
}
