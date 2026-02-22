import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request) {
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
    const { data } = await client
      .from("games")
      .select("*")
      .not("total_score", "is", null)
      .or(`home_team.eq.${team},away_team.eq.${team}`)
      .order("commence_time", { ascending: false })
      .limit(10);
    teamGames = data;
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
