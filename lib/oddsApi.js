/**
 * The Odds API client for NCAA basketball.
 * Free tier: 500 requests/month.
 * Paid tier: 20,000 credits/month, access to historical endpoints.
 * All responses are cached in-memory to minimize API calls.
 */

const BASE_URL = "https://api.the-odds-api.com/v4";
const SPORT = "basketball_ncaab";

/**
 * Check if we're on the paid API tier.
 * Controls daysFrom depth and access to historical endpoints.
 */
export function isPaidTier() {
  return process.env.ODDS_API_TIER === "paid";
}

function getApiKey() {
  const key = isPaidTier()
    ? (process.env.ODDS_API_PAID_KEY || process.env.ODDS_API_KEY)
    : process.env.ODDS_API_KEY;
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

  const res = await fetch(url, { cache: "no-store" });
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
 * `daysFrom` = number of days back to fetch (max 3 on all tiers).
 *
 * API call cost: 1 request per call
 */
export async function fetchScores(daysFrom = 3) {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/sports/${SPORT}/scores/?apiKey=${apiKey}&daysFrom=${daysFrom}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API scores error (${res.status}): ${body}`);
  }

  const quota = checkQuota(res.headers);
  const scores = await res.json();

  return { scores, quota };
}

/**
 * Fetch historical odds snapshot for a given date.
 * Paid tier only — uses /v4/historical/sports/{sport}/odds endpoint.
 * Returns games with O/U lines as they appeared at the given timestamp.
 *
 * Credit cost: 10x normal (10 credits per region×market combo)
 *
 * @param {string} dateISO – ISO 8601 date string (e.g. "2026-02-15T18:00:00Z")
 * @returns {{ games: Array, timestamp: string, quota: object } | null}
 */
export async function fetchHistoricalOdds(dateISO) {
  if (!isPaidTier()) return null;

  const apiKey = getApiKey();
  const url = `${BASE_URL}/historical/sports/${SPORT}/odds/?apiKey=${apiKey}&regions=us&markets=totals&oddsFormat=american&date=${dateISO}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API historical error (${res.status}): ${body}`);
  }

  const quota = checkQuota(res.headers);
  const json = await res.json();

  // Historical endpoint wraps data: { timestamp, previous_timestamp, next_timestamp, data: [...] }
  const games = (json.data || []).map(parseGame);

  return { games, timestamp: json.timestamp, quota };
}

/**
 * Fetch historical events snapshot for a given date.
 * Paid tier only — uses /v4/historical/sports/{sport}/events endpoint.
 * Query at a late timestamp to get completed games with scores.
 *
 * Credit cost: lower than historical odds (no market multiplier)
 *
 * @param {string} dateISO – ISO 8601 date string
 * @returns {{ events: Array, timestamp: string, quota: object } | null}
 */
export async function fetchHistoricalEvents(dateISO) {
  if (!isPaidTier()) return null;

  const apiKey = getApiKey();
  const url = `${BASE_URL}/historical/sports/${SPORT}/events/?apiKey=${apiKey}&date=${dateISO}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Odds API historical events error (${res.status}): ${body}`);
  }

  const quota = checkQuota(res.headers);
  const json = await res.json();

  const events = (json.data || []).map((event) => ({
    id: event.id,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    commenceTime: event.commence_time,
    completed: event.completed ?? false,
    scores: event.scores ?? null,
  }));

  return { events, timestamp: json.timestamp, quota };
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
  // Check cache first (local dev only — Vercel instances are ephemeral)
  const useCache = process.env.NODE_ENV === "development";
  if (useCache && cache.data && Date.now() - cache.timestamp < cache.TTL) {
    console.log("[Odds API] Returning cached data");
    return cache.data;
  }

  console.log(`[Odds API] Fetching fresh data (tier=${isPaidTier() ? "paid" : "free"})...`);

  // Fetch today's games with odds + recent completed scores in parallel
  // Note: daysFrom maxes out at 3 on all tiers
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
