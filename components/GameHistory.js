"use client";

/**
 * Displays a team's last 3 game history in the analysis format.
 */
export default function GameHistory({ teamName, games, average }) {
  if (!games || games.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No recent game data available for {teamName}
      </div>
    );
  }

  const overCount = games.filter((g) => g.overUnder === "OVER").length;
  const gamesWithLines = games.filter((g) => g.overUnder !== null).length;

  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold text-gray-300">
        {teamName} last {games.length} (non-OT):
      </div>
      {games.map((game, i) => {
        const location = game.isHome ? "vs" : "at";
        const scoreDisplay = game.isHome
          ? `${game.homeScore}–${game.awayScore}`
          : `${game.awayScore}–${game.homeScore}`;

        return (
          <div key={i} className="text-sm text-gray-400 pl-2">
            <span className="text-gray-500">{game.dateDisplay}</span>{" "}
            {location} {game.opponent}:{" "}
            <span className="text-gray-300">{scoreDisplay}</span>{" "}
            (Total {game.totalScore})
            {game.overUnderLine && (
              <>
                , O/U {game.overUnderLine} →{" "}
                <span
                  className={
                    game.overUnder === "OVER"
                      ? "text-green-400 font-medium"
                      : "text-red-400 font-medium"
                  }
                >
                  {game.overUnder}
                </span>
              </>
            )}
          </div>
        );
      })}
      <div className="text-sm text-gray-400 pl-2">
        Avg total:{" "}
        <span className="text-gray-200 font-medium">{average}</span> |{" "}
        Overs: <span className="text-gray-200 font-medium">{overCount}/{gamesWithLines}</span>
      </div>
    </div>
  );
}
