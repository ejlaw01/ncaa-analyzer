import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request) {
  // Local development only — don't expose database contents on deployed environments
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const client = createClient(url, key);
  const { searchParams } = new URL(request.url);
  const team = searchParams.get("team");

  // Raw counts
  const [allRows, withScores, withOdds, withBoth] = await Promise.all([
    client.from("games").select("id", { count: "exact", head: true }),
    client.from("games").select("id", { count: "exact", head: true })
      .not("total_score", "is", null),
    client.from("games").select("id", { count: "exact", head: true })
      .not("over_under", "is", null),
    client.from("games").select("id", { count: "exact", head: true })
      .not("total_score", "is", null)
      .not("over_under", "is", null),
  ]);

  // Score date distribution
  const { data: oldest } = await client
    .from("games")
    .select("commence_time")
    .not("total_score", "is", null)
    .order("commence_time", { ascending: true })
    .limit(1);

  const { data: newest } = await client
    .from("games")
    .select("commence_time")
    .not("total_score", "is", null)
    .order("commence_time", { ascending: false })
    .limit(1);

  // Team-specific lookup
  let teamGames = null;
  if (team) {
    // Separate .eq() queries so the team name is passed as a value, not spliced into filter syntax
    const teamQuery = (column) =>
      client
        .from("games")
        .select("*")
        .not("total_score", "is", null)
        .eq(column, team)
        .order("commence_time", { ascending: false })
        .limit(10);

    const [home, away] = await Promise.all([teamQuery("home_team"), teamQuery("away_team")]);
    teamGames = [...(home.data || []), ...(away.data || [])]
      .sort((a, b) => new Date(b.commence_time) - new Date(a.commence_time))
      .slice(0, 10);
  }

  return NextResponse.json({
    counts: {
      totalRows: allRows.count,
      withScores: withScores.count,
      withOdds: withOdds.count,
      withBoth: withBoth.count,
    },
    scoreDateRange: {
      oldest: oldest?.[0]?.commence_time || null,
      newest: newest?.[0]?.commence_time || null,
    },
    ...(teamGames && { teamGames }),
  });
}
