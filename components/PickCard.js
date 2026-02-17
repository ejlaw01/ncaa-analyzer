"use client";

import GameHistory from "./GameHistory";

/**
 * Displays a single game analysis card.
 */
export default function PickCard({ analysis }) {
  const {
    homeTeam,
    awayTeam,
    todaysLine,
    homeHistory,
    awayHistory,
    homeAvg,
    awayAvg,
    combinedAvg,
    overCount,
    totalGamesAnalyzed,
    value,
    meetsCriteria,
    strength,
    hasEnoughData,
  } = analysis;

  const borderColor = meetsCriteria
    ? strength === "strong"
      ? "border-green-500"
      : strength === "moderate"
        ? "border-yellow-500"
        : "border-blue-500"
    : "border-gray-700";

  const valueBg = meetsCriteria
    ? strength === "strong"
      ? "bg-green-900/50 text-green-300"
      : strength === "moderate"
        ? "bg-yellow-900/50 text-yellow-300"
        : "bg-blue-900/50 text-blue-300"
    : "bg-gray-800 text-gray-400";

  return (
    <div
      className={`rounded-xl border ${borderColor} bg-gray-900 p-4 space-y-4`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            {awayTeam} @ {homeTeam}
          </h3>
          <div className="text-sm text-gray-400">
            Today&apos;s O/U:{" "}
            <span className="text-gray-200 font-semibold">{todaysLine}</span>
          </div>
        </div>
        <div className={`rounded-lg px-3 py-1.5 text-center ${valueBg}`}>
          <div className="text-xs uppercase tracking-wider opacity-75">Value</div>
          <div className="text-lg font-bold">
            {value > 0 ? "+" : ""}
            {value}
          </div>
        </div>
      </div>

      {/* Team Histories */}
      {hasEnoughData ? (
        <div className="grid gap-4 md:grid-cols-2">
          <GameHistory
            teamName={awayTeam}
            games={awayHistory}
            average={awayAvg}
          />
          <GameHistory
            teamName={homeTeam}
            games={homeHistory}
            average={homeAvg}
          />
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic">
          Insufficient historical data to analyze this matchup.
        </div>
      )}

      {/* Summary */}
      <div className="border-t border-gray-800 pt-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-gray-400">
            Expected total:{" "}
            <span className="text-gray-200 font-medium">{combinedAvg}</span>
          </span>
          <span className="text-gray-400">
            vs Line:{" "}
            <span className="text-gray-200 font-medium">{todaysLine}</span>
          </span>
          <span className="text-gray-400">
            Overs:{" "}
            <span
              className={`font-medium ${
                overCount >= 4 ? "text-green-400" : "text-gray-200"
              }`}
            >
              {overCount}/{totalGamesAnalyzed}
            </span>
          </span>
          {meetsCriteria && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400 border border-green-800">
              Recommended
            </span>
          )}
        </div>
        {meetsCriteria && (
          <div className="mt-2 text-sm">
            <span className={strength === "strong" ? "text-green-400" : "text-yellow-400"}>
              {strength === "strong"
                ? "Very strong over value"
                : strength === "moderate"
                  ? "Moderate over value"
                  : "Slight over value"}{" "}
              ({value > 0 ? "+" : ""}
              {value})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
