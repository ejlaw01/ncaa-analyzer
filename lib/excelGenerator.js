import ExcelJS from "exceljs";

/**
 * Generate an Excel workbook from picks data.
 * Creates one sheet per conference + a Summary sheet.
 */
export async function generateExcel(picksData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NCAA Basketball Analyzer";
  workbook.created = new Date();

  // --- Summary sheet ---
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Matchup", key: "matchup", width: 35 },
    { header: "Conference", key: "conference", width: 12 },
    { header: "Today's O/U", key: "line", width: 12 },
    { header: "Combined Avg", key: "combinedAvg", width: 14 },
    { header: "Value", key: "value", width: 10 },
    { header: "Overs", key: "overs", width: 10 },
    { header: "Recommended", key: "recommended", width: 14 },
    { header: "Strength", key: "strength", width: 12 },
  ];

  styleHeaderRow(summary);

  for (const analysis of picksData.allAnalyses) {
    const row = summary.addRow({
      matchup: `${analysis.awayTeam} @ ${analysis.homeTeam}`,
      conference: analysis.conference,
      line: analysis.todaysLine,
      combinedAvg: analysis.combinedAvg,
      value: analysis.value,
      overs: `${analysis.overCount}/${analysis.totalGamesAnalyzed}`,
      recommended: analysis.meetsCriteria ? "YES" : "No",
      strength: analysis.meetsCriteria ? analysis.strength.toUpperCase() : "-",
    });

    // Highlight strong picks
    if (analysis.meetsCriteria && analysis.strength === "strong") {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8F5E9" },
        };
        cell.font = { bold: true, color: { argb: "FF2E7D32" } };
      });
    } else if (analysis.meetsCriteria) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFDE7" },
        };
      });
    }
  }

  // --- Conference sheets ---
  for (const [conference, analyses] of Object.entries(picksData.byConference)) {
    const sheet = workbook.addWorksheet(conference.replace(/[\\/*?[\]:]/g, ""));

    for (const analysis of analyses) {
      // Matchup header
      const headerRow = sheet.addRow([
        `${analysis.awayTeam} @ ${analysis.homeTeam} — Today O/U: ${analysis.todaysLine}`,
      ]);
      headerRow.font = { bold: true, size: 13 };
      sheet.mergeCells(headerRow.number, 1, headerRow.number, 6);

      if (analysis.meetsCriteria) {
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: analysis.strength === "strong" ? "FFE8F5E9" : "FFFFFDE7" },
          };
        });
      }

      sheet.addRow([]);

      // Away team history
      addTeamHistory(sheet, analysis.awayTeam, analysis.awayHistory, analysis.awayAvg);
      sheet.addRow([]);

      // Home team history
      addTeamHistory(sheet, analysis.homeTeam, analysis.homeHistory, analysis.homeAvg);
      sheet.addRow([]);

      // Analysis summary
      const summaryRow = sheet.addRow([
        `Over value check: expected ≈ ${analysis.combinedAvg} vs ${analysis.todaysLine} → ${
          analysis.value > 0
            ? `Over value (+${analysis.value})`
            : `Under value (${analysis.value})`
        }`,
      ]);
      sheet.mergeCells(summaryRow.number, 1, summaryRow.number, 6);

      if (analysis.meetsCriteria) {
        const criteriaRow = sheet.addRow([
          `✓ Meets criteria (${analysis.overCount} of ${analysis.totalGamesAnalyzed} went over, ${
            analysis.value > 0 ? "+" : ""
          }${analysis.value} value)`,
        ]);
        sheet.mergeCells(criteriaRow.number, 1, criteriaRow.number, 6);
        criteriaRow.font = { bold: true, color: { argb: "FF2E7D32" } };
      } else {
        const noRow = sheet.addRow([
          `✗ Does not meet criteria (${analysis.overCount} of ${analysis.totalGamesAnalyzed} went over)`,
        ]);
        sheet.mergeCells(noRow.number, 1, noRow.number, 6);
        noRow.font = { color: { argb: "FF999999" } };
      }

      // Separator
      sheet.addRow([]);
      const sepRow = sheet.addRow(["─".repeat(80)]);
      sheet.mergeCells(sepRow.number, 1, sepRow.number, 6);
      sepRow.font = { color: { argb: "FFCCCCCC" } };
      sheet.addRow([]);
    }

    // Set column widths
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 25;
    sheet.getColumn(3).width = 15;
    sheet.getColumn(4).width = 12;
    sheet.getColumn(5).width = 12;
    sheet.getColumn(6).width = 12;
  }

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function styleHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1565C0" },
  };
  headerRow.alignment = { horizontal: "center" };
}

function addTeamHistory(sheet, teamName, games, average) {
  const teamRow = sheet.addRow([`${teamName} last ${games.length} (non-OT):`]);
  teamRow.font = { bold: true };

  for (const game of games) {
    const location = game.isHome ? "vs" : "at";
    const scoreDisplay = game.isHome
      ? `${game.homeScore}–${game.awayScore}`
      : `${game.awayScore}–${game.homeScore}`;

    sheet.addRow([
      game.dateDisplay,
      `${location} ${game.opponent}`,
      scoreDisplay,
      `Total ${game.totalScore}`,
      game.overUnderLine ? `O/U ${game.overUnderLine}` : "",
      game.overUnder ? `→ ${game.overUnder}` : "",
    ]);
  }

  const overCount = games.filter((g) => g.overUnder === "OVER").length;
  const withLines = games.filter((g) => g.overUnder !== null).length;
  sheet.addRow([`Avg total: ${average}`, `Overs: ${overCount}/${withLines}`]);
}
