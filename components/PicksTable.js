"use client";

import { useState, Fragment } from "react";

export default function PicksTable({ data }) {
  const [activeTab, setActiveTab] = useState("recommended");
  const [sortCol, setSortCol] = useState("value");
  const [sortDir, setSortDir] = useState("desc");

  if (!data) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <div className="text-gray-400 text-lg">No picks generated yet</div>
        <div className="text-gray-400 text-sm mt-2">
          Click &quot;Refresh Data&quot; to fetch today&apos;s games and generate
          analysis.
        </div>
      </div>
    );
  }

  const byConference = data.byConference || {};

  const getFilteredByConference = () => {
    const result = {};
    for (const [conf, analyses] of Object.entries(byConference)) {
      const filtered =
        activeTab === "recommended"
          ? analyses.filter((a) => a.meetsCriteria)
          : analyses;
      if (filtered.length > 0) {
        result[conf] = filtered;
      }
    }
    return result;
  };

  const filteredConferences = getFilteredByConference();
  const hasResults = Object.keys(filteredConferences).length > 0;

  const recommendedCount = data.totalRecommendations || 0;
  const allCount = data.totalAnalyzed || 0;

  const formatScore = (game) =>
    game.isHome
      ? `${game.homeScore}-${game.awayScore}`
      : `${game.awayScore}-${game.homeScore}`;

  const getOvers = (history) => {
    const withLines = history.filter((g) => g.overUnder !== null);
    const overs = withLines.filter((g) => g.overUnder === "OVER").length;
    return `${overs}/${withLines.length}`;
  };

  const getValueClass = (value) => {
    if (value > 10) return "value-strong";
    if (value > 0) return "value-pos";
    return "";
  };

  const columns = [
    { key: "awayTeam", label: "Away" },
    { key: "homeTeam", label: "Home" },
    { key: "conference", label: "Conf" },
    { key: "todaysLine", label: "O/U", numeric: true },
    { key: "awayAvg", label: "Away Avg", numeric: true },
    { key: "homeAvg", label: "Home Avg", numeric: true },
    { key: "combinedAvg", label: "Comb Avg", numeric: true },
    { key: "value", label: "Value", numeric: true },
    { key: "overs", label: "Overs", numeric: true },
    { key: "meetsCriteria", label: "Rec" },
  ];

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir(key === "awayTeam" || key === "homeTeam" || key === "conference" ? "asc" : "desc");
    }
  };

  const getSortValue = (a, key) => {
    if (key === "overs") return a.totalGamesAnalyzed > 0 ? a.overCount / a.totalGamesAnalyzed : 0;
    if (key === "meetsCriteria") return a.meetsCriteria ? 1 : 0;
    return a[key];
  };

  const sortIndicator = (key) => {
    if (sortCol !== key) return <span className="sort-arrow inactive">{"\u25BC"}</span>;
    return <span className="sort-arrow">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>;
  };

  const renderAllGamesTable = () => {
    const allAnalyses = data.allAnalyses || [];
    if (allAnalyses.length === 0) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
          No games analyzed yet.
        </div>
      );
    }

    const sorted = [...allAnalyses].sort((a, b) => {
      const av = getSortValue(a, sortCol);
      const bv = getSortValue(b, sortCol);
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return (
      <table className="all-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`sortable${col.numeric ? " num" : ""}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label} {sortIndicator(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((a, i) => {
            const valueDisplay = `${a.value > 0 ? "+" : ""}${a.value}`;
            const valueClass =
              a.value > 10 ? "value-badge" : a.value > 0 ? "value-pos" : a.value < 0 ? "value-neg" : "";
            return (
              <tr key={`${a.awayTeam}-${a.homeTeam}-${i}`}>
                <td data-label="Away">{a.awayTeam}</td>
                <td data-label="Home">{a.homeTeam}</td>
                <td data-label="Conf">{a.conference}</td>
                <td data-label="O/U" className="num">{a.todaysLine}</td>
                <td data-label="Away Avg" className="num">{a.awayAvg}</td>
                <td data-label="Home Avg" className="num">{a.homeAvg}</td>
                <td data-label="Comb Avg" className="num">{a.combinedAvg}</td>
                <td data-label="Value" className="num">
                  <span className={valueClass}>{valueDisplay}</span>
                </td>
                <td data-label="Overs" className="num">
                  {a.overCount}/{a.totalGamesAnalyzed}
                </td>
                <td data-label="Rec">
                  {a.meetsCriteria ? (
                    <span className="rec-yes">YES</span>
                  ) : (
                    <span className="rec-no">no</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderTeamSection = (teamName, label, history, avg) => (
    <Fragment>
      <tr className="team-name-row">
        <td colSpan="6">
          {teamName} <span className="team-label">({label})</span>
        </td>
      </tr>
      <tr className="col-header-row">
        <th>Date</th>
        <th>Opponent</th>
        <th>Score</th>
        <th>Total</th>
        <th>O/U Line</th>
        <th>Result</th>
      </tr>
      {history.map((game, i) => (
        <tr key={i} className="game-row">
          <td data-label="Date">{game.dateDisplay}</td>
          <td data-label="Opponent">{game.opponent}</td>
          <td data-label="Score" className="num">
            {formatScore(game)}
          </td>
          <td data-label="Total" className="num">
            <strong>{game.totalScore}</strong>
          </td>
          <td data-label="O/U Line" className="num">
            {game.overUnderLine || "\u2014"}
          </td>
          <td data-label="Result">
            {game.overUnder ? (
              <span className={game.overUnder === "OVER" ? "over" : "under"}>
                {game.overUnder}
              </span>
            ) : (
              "\u2014"
            )}
          </td>
        </tr>
      ))}
      <tr className="team-avg-row">
        <td colSpan="6" className="team-avg">
          Avg: {avg} &bull; Overs: {getOvers(history)}
        </td>
      </tr>
    </Fragment>
  );

  const renderMatchup = (analysis, idx) => {
    const valueClass = getValueClass(analysis.value);
    const valueDisplay = `${analysis.value > 0 ? "+" : ""}${analysis.value}`;

    return (
      <Fragment key={`${analysis.homeTeam}-${analysis.awayTeam}-${idx}`}>
        <tr className="matchup-row">
          <td colSpan="5">
            {analysis.awayTeam} @ {analysis.homeTeam}
            {analysis.commenceTime && (
              <span className="matchup-time">
                {new Date(analysis.commenceTime).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })} ET
              </span>
            )}
          </td>
          <td className="matchup-line">
            O/U
            <br />
            {analysis.todaysLine}
          </td>
        </tr>
        {analysis.hasEnoughData ? (
          <>
            {renderTeamSection(
              analysis.awayTeam,
              "Away",
              analysis.awayHistory,
              analysis.awayAvg
            )}
            {renderTeamSection(
              analysis.homeTeam,
              "Home",
              analysis.homeHistory,
              analysis.homeAvg
            )}
          </>
        ) : (
          <tr className="game-row">
            <td
              colSpan="6"
              style={{ fontStyle: "italic", color: "#9ca3af" }}
            >
              Insufficient historical data for this matchup.
            </td>
          </tr>
        )}
        <tr className="summary-row">
          <td colSpan="2">
            Expected: <strong>{analysis.combinedAvg}</strong> &nbsp;|&nbsp;
            Line: <strong>{analysis.todaysLine}</strong>
          </td>
          <td colSpan="2">
            <span className={valueClass}>
              Value: {valueDisplay} pts
            </span>
          </td>
          <td colSpan="2">Overs: {analysis.overCount}/{analysis.totalGamesAnalyzed}</td>
        </tr>
        <tr className="spacer-row">
          <td colSpan="6"></td>
        </tr>
      </Fragment>
    );
  };

  return (
    <div>
      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
        <span>
          Recommended: <strong className="text-gray-700">{recommendedCount}</strong> games
          (4+ overs in last 6 &bull; strong value = 10+ pts above line)
        </span>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          onClick={() => setActiveTab("recommended")}
          className={`tab-btn ${activeTab === "recommended" ? "active" : ""}`}
        >
          Recommended Picks ({recommendedCount})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
        >
          All Games ({allCount})
        </button>
      </div>

      {/* Table */}
      {activeTab === "all" ? (
        renderAllGamesTable()
      ) : !hasResults ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-400">
          No recommended picks today.
        </div>
      ) : (
        <div className="picks-tables">
          {Object.entries(filteredConferences).map(
            ([conf, analyses]) => (
              <table key={conf} className="picks-table">
                <colgroup>
                  <col style={{ width: "90px" }} />
                  <col />
                  <col style={{ width: "100px" }} />
                  <col style={{ width: "80px" }} />
                  <col style={{ width: "90px" }} />
                  <col style={{ width: "80px" }} />
                </colgroup>
                <tbody>
                  <tr className="conf-row">
                    <td colSpan="6">{conf}</td>
                  </tr>
                  {analyses.map((analysis, i) => renderMatchup(analysis, i))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </div>
  );
}
