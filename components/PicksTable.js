"use client";

import { useState } from "react";
import PickCard from "./PickCard";

/**
 * Displays all picks organized by conference with tab filtering.
 */
export default function PicksTable({ data }) {
  const [activeConference, setActiveConference] = useState("All");
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
        <div className="text-gray-500 text-lg">No picks generated yet</div>
        <div className="text-gray-600 text-sm mt-2">
          Click &quot;Refresh Data&quot; to fetch today&apos;s games and generate analysis.
        </div>
      </div>
    );
  }

  const conferences = ["All", ...Object.keys(data.byConference)];
  const analyses =
    activeConference === "All"
      ? data.allAnalyses
      : data.byConference[activeConference] || [];

  const filtered = showOnlyRecommended
    ? analyses.filter((a) => a.meetsCriteria)
    : analyses;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
        <span>
          <span className="text-gray-200 font-medium">{data.totalGamesToday}</span>{" "}
          games today
        </span>
        <span>
          <span className="text-gray-200 font-medium">{data.totalAnalyzed}</span>{" "}
          analyzed
        </span>
        <span>
          <span className="text-green-400 font-medium">
            {data.totalRecommendations}
          </span>{" "}
          recommended
        </span>
        {data.apiQuota && (
          <span className="ml-auto text-xs text-gray-600">
            API: {data.apiQuota.remaining} requests remaining
          </span>
        )}
      </div>

      {/* Conference tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {conferences.map((conf) => (
          <button
            key={conf}
            onClick={() => setActiveConference(conf)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              activeConference === conf
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
            }`}
          >
            {conf}
            {conf !== "All" && (
              <span className="ml-1 text-xs opacity-60">
                ({(data.byConference[conf] || []).length})
              </span>
            )}
          </button>
        ))}

        <label className="ml-auto flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyRecommended}
            onChange={(e) => setShowOnlyRecommended(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          Only recommended
        </label>
      </div>

      {/* Pick cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
          {showOnlyRecommended
            ? "No recommended picks in this conference."
            : "No games found for this conference."}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((analysis, i) => (
            <PickCard key={`${analysis.homeTeam}-${analysis.awayTeam}-${i}`} analysis={analysis} />
          ))}
        </div>
      )}
    </div>
  );
}
