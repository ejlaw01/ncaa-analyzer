/**
 * NCAA Basketball Over/Under Betting Analyzer
 *
 * Methodology:
 * 1. For each today's game, get the current O/U line
 * 2. Find the last 3 non-OT games for each team
 * 3. Collect: opponent, date, final score, O/U line, over/under result
 * 4. Calculate average total score for each team
 * 5. Combined average = (Team A avg + Team B avg) / 2
 * 6. Count how many of the 6 games went OVER
 * 7. Recommend if 4+ of 6 went over
 * 8. Value = combined average - today's O/U line
 */

import { getMatchupConference, shortDate } from "./utils.js";

/**
 * Detect if a game went to overtime based on score patterns.
 * NCAA basketball OT: regulation = 40 min, each OT = 5 min.
 * Heuristic: total score > ~170 with close regulation scores could be OT.
 *
 * Since the Odds API doesn't directly flag OT, we check if the API provides
 * period scores or if the total seems abnormally high for the matchup.
 *
 * For MVP, we use a simple heuristic - games with very high totals relative
 * to the line are flagged as possible OT.
 */
export function isLikelyOvertime(game, historicalLine) {
  if (!game.totalScore || !historicalLine) return false;

  // If total exceeds the line by more than 40 points, likely OT
  // (average OT adds ~12-15 points)
  const excess = game.totalScore - historicalLine;
  return excess > 35;
}

/**
 * Find the last N non-OT completed games for a specific team
 * from the pool of recent scores.
 */
export function findTeamHistory(teamName, allScores, allGamesWithOdds, count = 3) {
  // Filter to games with valid scores involving this team
  const teamGames = allScores
    .filter((s) => s.totalScore !== null)
    .filter((s) => s.homeTeam === teamName || s.awayTeam === teamName)
    .sort((a, b) => new Date(b.commenceTime) - new Date(a.commenceTime));

  const results = [];

  for (const game of teamGames) {
    if (results.length >= count) break;

    const isHome = game.homeTeam === teamName;
    const opponent = isHome ? game.awayTeam : game.homeTeam;

    // Find the historical O/U line for this game from odds data
    const historicalLine = findHistoricalLine(game, allGamesWithOdds);

    // Check for OT
    if (isLikelyOvertime(game, historicalLine)) {
      continue; // Skip OT games, will grab one more
    }

    const overUnder = historicalLine
      ? game.totalScore > historicalLine
        ? "OVER"
        : "UNDER"
      : null;

    results.push({
      date: game.commenceTime,
      dateDisplay: shortDate(game.commenceTime),
      opponent,
      isHome,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      totalScore: game.totalScore,
      overUnderLine: historicalLine,
      overUnder,
    });
  }

  return results;
}

/**
 * Find the historical O/U line for a completed game.
 * Checks the odds data for matching game IDs or team names.
 */
function findHistoricalLine(scoreGame, allGamesWithOdds) {
  // Try matching by game ID first
  const byId = allGamesWithOdds.find((g) => g.id === scoreGame.id);
  if (byId?.overUnder) return byId.overUnder;

  // Try matching by teams and date
  const byTeams = allGamesWithOdds.find(
    (g) =>
      g.homeTeam === scoreGame.homeTeam &&
      g.awayTeam === scoreGame.awayTeam &&
      Math.abs(new Date(g.commenceTime) - new Date(scoreGame.commenceTime)) <
        24 * 60 * 60 * 1000
  );
  if (byTeams?.overUnder) return byTeams.overUnder;

  return null;
}

/**
 * Calculate the average total score for a team's recent games.
 */
export function calculateTeamAverage(teamGames) {
  if (teamGames.length === 0) return 0;
  const total = teamGames.reduce((sum, g) => sum + g.totalScore, 0);
  return total / teamGames.length;
}

/**
 * Analyze a single matchup between two teams.
 */
export function analyzeMatchup(
  homeTeam,
  awayTeam,
  todaysLine,
  allScores,
  allGamesWithOdds
) {
  const homeHistory = findTeamHistory(homeTeam, allScores, allGamesWithOdds, 3);
  const awayHistory = findTeamHistory(awayTeam, allScores, allGamesWithOdds, 3);

  const homeAvg = calculateTeamAverage(homeHistory);
  const awayAvg = calculateTeamAverage(awayHistory);
  const combinedAvg = (homeAvg + awayAvg) / 2;

  // Count overs across all 6 games
  const allGames = [...homeHistory, ...awayHistory];
  const gamesWithLines = allGames.filter((g) => g.overUnder !== null);
  const overCount = gamesWithLines.filter((g) => g.overUnder === "OVER").length;
  const totalGamesAnalyzed = gamesWithLines.length;

  // Value = combined average - today's line
  const value = combinedAvg - todaysLine;

  // Meets criteria: 4+ of 6 went over
  const meetsCriteria = overCount >= 4 && totalGamesAnalyzed >= 4;

  // Strength rating
  let strength = "weak";
  if (value > 10) strength = "strong";
  else if (value > 5) strength = "moderate";

  const conference = getMatchupConference(homeTeam, awayTeam);

  return {
    homeTeam,
    awayTeam,
    todaysLine,
    conference,
    homeHistory,
    awayHistory,
    homeAvg: Math.round(homeAvg * 10) / 10,
    awayAvg: Math.round(awayAvg * 10) / 10,
    combinedAvg: Math.round(combinedAvg * 10) / 10,
    overCount,
    totalGamesAnalyzed,
    value: Math.round(value * 10) / 10,
    meetsCriteria,
    strength,
    hasEnoughData: homeHistory.length >= 2 && awayHistory.length >= 2,
  };
}

/**
 * Analyze all of today's games and return recommendations.
 */
export function analyzeAllGames(todaysGames, recentScores, allGamesWithOdds) {
  const oddsPool = allGamesWithOdds || todaysGames;
  const results = [];

  for (const game of todaysGames) {
    // Skip games without O/U lines
    if (!game.overUnder) continue;

    // Skip already completed games
    if (game.completed) continue;

    const analysis = analyzeMatchup(
      game.homeTeam,
      game.awayTeam,
      game.overUnder,
      recentScores,
      oddsPool
    );

    analysis.gameId = game.id;
    analysis.commenceTime = game.commenceTime;
    results.push(analysis);
  }

  // Sort: recommendations first, then by value descending
  results.sort((a, b) => {
    if (a.meetsCriteria && !b.meetsCriteria) return -1;
    if (!a.meetsCriteria && b.meetsCriteria) return 1;
    return b.value - a.value;
  });

  return results;
}

/**
 * Group analyses by conference.
 */
export function groupByConference(analyses) {
  const groups = {};
  const conferenceOrder = [
    // Power conferences
    "Big Ten", "Big 12", "SEC", "ACC", "Big East",
    // Major mid-majors
    "Mountain West", "AAC", "WCC", "MVC", "A-10",
    // Mid-majors
    "CAA", "Sun Belt", "MAC", "C-USA", "Big West",
    "Big Sky", "Horizon", "Summit", "SoCon", "WAC",
    "Southland", "Patriot", "MAAC", "Ivy", "Big South",
    "ASUN", "NEC", "OVC", "MEAC", "SWAC",
    "America East",
    // Catch-all
    "Other",
  ];

  for (const analysis of analyses) {
    const conf = analysis.conference;
    if (!groups[conf]) groups[conf] = [];
    groups[conf].push(analysis);
  }

  // Sort each conference group by value descending
  for (const conf of Object.keys(groups)) {
    groups[conf].sort((a, b) => b.value - a.value);
  }

  // Return in preferred order
  const ordered = {};
  for (const conf of conferenceOrder) {
    if (groups[conf]) {
      ordered[conf] = groups[conf];
    }
  }
  // Add any remaining conferences
  for (const conf of Object.keys(groups)) {
    if (!ordered[conf]) {
      ordered[conf] = groups[conf];
    }
  }

  return ordered;
}
