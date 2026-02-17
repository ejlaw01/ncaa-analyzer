import { NextResponse } from "next/server";
import { getStoredPicks } from "@/lib/picksStore";
import { generateExcel } from "@/lib/excelGenerator";
import { todayString } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/download
 *
 * Generates an Excel file from the current stored picks and returns it.
 */
export async function GET() {
  try {
    const picks = getStoredPicks();

    if (!picks) {
      return NextResponse.json(
        { error: "No picks generated yet. Click Refresh first." },
        { status: 404 }
      );
    }

    const buffer = await generateExcel(picks);
    const filename = `NCAA_Picks_${todayString()}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[/api/download] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel file." },
      { status: 500 }
    );
  }
}
