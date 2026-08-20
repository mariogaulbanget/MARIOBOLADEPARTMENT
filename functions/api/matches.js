const competitions = [
  "PL", "PD", "SA", "BL1", "FL1", "DED", "PPL",
  "CL", "EL", "ECL", "WC", "EC", "BSA"
];
const priority = new Map(competitions.map((code, index) => [code, index]));

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function normalizeMatch(match) {
  return {
    id: match.id,
    competition: match.competition?.name || "Football",
    competitionCode: match.competition?.code || "",
    utcDate: match.utcDate,
    status: match.status,
    homeTeam: match.homeTeam?.name || "Home team",
    awayTeam: match.awayTeam?.name || "Away team",
    homeCrest: match.homeTeam?.crest || "",
    awayCrest: match.awayTeam?.crest || "",
    homeScore: match.score?.fullTime?.home ?? match.score?.halfTime?.home,
    awayScore: match.score?.fullTime?.away ?? match.score?.halfTime?.away
  };
}

function sortMatches(left, right) {
  const liveRank = match => ["IN_PLAY", "PAUSED", "LIVE"].includes(match.status) ? 0 : 1;
  const rankDifference = liveRank(left) - liveRank(right);
  if (rankDifference) return rankDifference;
  const priorityDifference = (priority.get(left.competitionCode) ?? 99) - (priority.get(right.competitionCode) ?? 99);
  if (priorityDifference) return priorityDifference;
  return new Date(left.utcDate) - new Date(right.utcDate);
}

export async function onRequestGet({ request, env }) {
  if (!env.FOOTBALL_DATA_TOKEN) {
    return Response.json({ error: "FOOTBALL_DATA_TOKEN is not configured" }, { status: 503 });
  }

  const requestUrl = new URL(request.url);
  const requestedDate = requestUrl.searchParams.get("date") || dateOnly(new Date());
  const startDate = new Date(`${requestedDate}T00:00:00Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const apiUrl = `https://api.football-data.org/v4/matches?dateFrom=${dateOnly(startDate)}&dateTo=${dateOnly(endDate)}&competitions=${competitions.join(",")}`;
  const response = await fetch(apiUrl, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_TOKEN },
    cf: { cacheTtl: 300, cacheEverything: true }
  });

  if (!response.ok) {
    return Response.json({ error: "Football data provider unavailable" }, { status: response.status });
  }

  const data = await response.json();
  const matches = (data.matches || []).map(normalizeMatch).sort(sortMatches);
  const todayMatches = matches.filter(match => match.utcDate.slice(0, 10) === requestedDate);
  const selected = todayMatches.find(match => ["IN_PLAY", "PAUSED", "LIVE", "TIMED", "SCHEDULED"].includes(match.status)) || matches[0] || null;

  return Response.json({
    date: requestedDate,
    match: selected,
    upcoming: matches.slice(0, 3)
  }, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
