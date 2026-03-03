"use client";

import { useState, useEffect } from "react";

export default function TrackRecord() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/stats");
        const json = await res.json();
        if (res.ok && json.data) {
          setStats(json.data);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
        Loading track record...
      </div>
    );
  }

  if (!stats || (stats.overall.total === 0 && stats.overall.pendingCount === 0)) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
        No picks recorded yet. Picks will be tracked starting today.
      </div>
    );
  }

  const { overall, byStrength, recentPicks } = stats;

  const pctColor =
    overall.winPct >= 55
      ? "text-green-600"
      : overall.winPct >= 50
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Overall record */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Overall Record
        </h3>
        <div className="flex flex-wrap items-baseline gap-4">
          <span className="text-3xl font-bold text-gray-900">
            {overall.wins}-{overall.losses}
          </span>
          {overall.total > 0 && (
            <span className={`text-2xl font-bold ${pctColor}`}>
              {overall.winPct}%
            </span>
          )}
          {overall.pushes > 0 && (
            <span className="text-sm text-gray-400">
              ({overall.pushes} push{overall.pushes !== 1 ? "es" : ""})
            </span>
          )}
          {overall.pendingCount > 0 && (
            <span className="text-sm text-gray-400">
              {overall.pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* By Strength */}
      {Object.keys(byStrength).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            By Strength
          </h3>
          <table className="all-table">
            <thead>
              <tr>
                <th>Strength</th>
                <th className="num">W</th>
                <th className="num">L</th>
                <th className="num">Win %</th>
              </tr>
            </thead>
            <tbody>
              {["strong", "moderate", "weak"].map((str) => {
                const s = byStrength[str];
                if (!s) return null;
                const total = s.wins + s.losses;
                const pct = total > 0 ? Math.round((s.wins / total) * 1000) / 10 : 0;
                return (
                  <tr key={str}>
                    <td data-label="Strength" className="capitalize">{str}</td>
                    <td data-label="W" className="num">{s.wins}</td>
                    <td data-label="L" className="num">{s.losses}</td>
                    <td data-label="Win %" className="num">{total > 0 ? `${pct}%` : "\u2014"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Picks */}
      {recentPicks.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recent Picks
          </h3>
          <table className="all-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Matchup</th>
                <th>Conf</th>
                <th className="num">Line</th>
                <th className="num">Actual</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {recentPicks.map((p, i) => (
                <tr key={i}>
                  <td data-label="Date">{new Date(p.date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</td>
                  <td data-label="Matchup">{p.matchup}</td>
                  <td data-label="Conf">{p.conference}</td>
                  <td data-label="Line" className="num">{p.line}</td>
                  <td data-label="Actual" className="num">{p.actualTotal ?? "\u2014"}</td>
                  <td data-label="Result">
                    {p.result === "win" ? (
                      <span className="over">WIN</span>
                    ) : p.result === "loss" ? (
                      <span className="under">LOSS</span>
                    ) : (
                      <span className="text-gray-400">{p.result}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
