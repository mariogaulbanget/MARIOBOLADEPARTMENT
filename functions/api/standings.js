const competitionCodes = {
  "17": "PL",
  "8": "PD",
  "23": "SA",
  "34": "FL1",
  "35": "BL1",
  "37": "DED",
  "1015": "ID1",
  "38": "BJL"
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const leagueId = url.searchParams.get("league");
  const competition = competitionCodes[leagueId];

  if (!competition) {
    return Response.json({ error: "Unknown competition" }, { status: 400 });
  }

  if (!env.FOOTBALL_DATA_TOKEN) {
    return Response.json({ error: "FOOTBALL_DATA_TOKEN is not configured" }, { status: 503 });
  }

  const apiUrl = `https://api.football-data.org/v4/competitions/${competition}/standings`;
  const response = await fetch(apiUrl, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_TOKEN },
    cf: { cacheTtl: 300, cacheEverything: true }
  });

  if (!response.ok) {
    return Response.json({ error: "Football data provider unavailable" }, {
      status: response.status,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const data = await response.json();
  const table = data.standings?.find(item => item.type === "TOTAL")?.table || data.standings?.[0]?.table || [];
  const rows = table.map(row => ({
    position: row.position,
    team: row.team?.name || "Unknown team",
    played: row.playedGames || 0,
    goalDifference: row.goalDifference || 0,
    points: row.points || 0
  }));

  return Response.json({
    competition: data.competition?.name || competition,
    season: data.season?.startDate?.slice(0, 4) || "current",
    rows
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
