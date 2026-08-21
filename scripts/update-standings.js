const fs = require("fs");
const path = require("path");

const { leagues } = require("./standings-config");

const OUTPUT = path.join(
  __dirname,
  "..",
  "data",
  "standings.json"
);

const SOURCES = {
  espn: league =>
    `https://site.api.espn.com/apis/v2/sports/soccer/${league.espnId}/standings`,

  espnSite: league =>
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnId}/standings`
};

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "MarioBola/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extractEntries(data) {
  if (!data) return [];

  if (Array.isArray(data.entries)) {
    return data.entries;
  }

  if (Array.isArray(data.standings)) {
    return data.standings;
  }

  if (Array.isArray(data.children)) {
    const result = [];

    for (const child of data.children) {
      if (Array.isArray(child.standings?.entries)) {
        result.push(...child.standings.entries);
      }
    }

    return result;
  }

  if (Array.isArray(data.children)) {
    return data.children;
  }

  return [];
}

function findStat(stats, names) {
  if (!Array.isArray(stats)) return 0;

  for (const name of names) {
    const item = stats.find(
      x => x.name === name
    );

    if (item) {
      return safeNumber(
        item.value ?? item.displayValue
      );
    }
  }

  return 0;
}

function normalizeEntry(entry, index) {
  const team =
    entry.team ||
    entry.teamInfo ||
    {};

  const stats =
    entry.stats ||
    entry.statistics ||
    [];

  const overall =
    entry.overall ||
    {};

  return {
    rank:
      safeNumber(
        entry.position ??
        entry.rank ??
        overall.position
      ) || index + 1,

    team: {
      id:
        team.id ||
        team.uid ||
        "",

      name:
        team.displayName ||
        team.name ||
        "Unknown Team",

      shortName:
        team.shortDisplayName ||
        team.abbreviation ||
        team.shortName ||
        "",

      abbreviation:
        team.abbreviation ||
        "",

      logo:
        team.logos?.[0]?.href ||
        team.logo ||
        ""
    },

    played:
      safeNumber(
        overall.played ??
        entry.played ??
        findStat(stats, [
          "gamesPlayed",
          "played"
        ])
      ),

    wins:
      safeNumber(
        overall.won ??
        entry.wins ??
        findStat(stats, [
          "wins",
          "gamesWon"
        ])
      ),

    draws:
      safeNumber(
        overall.drawn ??
        entry.draws ??
        findStat(stats, [
          "ties",
          "draws"
        ])
      ),

    losses:
      safeNumber(
        overall.lost ??
        entry.losses ??
        findStat(stats, [
          "losses",
          "gamesLost"
        ])
      ),

    goalsFor:
      safeNumber(
        overall.goalsFor ??
        entry.goalsFor ??
        findStat(stats, [
          "pointsFor",
          "goalsFor"
        ])
      ),

    goalsAgainst:
      safeNumber(
        overall.goalsAgainst ??
        entry.goalsAgainst ??
        findStat(stats, [
          "pointsAgainst",
          "goalsAgainst"
        ])
      ),

    goalDifference:
      safeNumber(
        entry.goalDifference ??
        entry.goalsDiff ??
        (
          safeNumber(overall.goalsFor) -
          safeNumber(overall.goalsAgainst)
        )
      ),

    points:
      safeNumber(
        entry.points ??
        findStat(stats, [
          "points"
        ])
      ),

    form:
      entry.form ||
      ""
  };
}

async function fetchLeague(league) {
  let lastError = null;

  for (const sourceName of [
    "espn",
    "espnSite"
  ]) {
    try {
      const url = SOURCES[sourceName](league);

      console.log(
        `Trying ${league.name} via ${sourceName}`
      );

      const data = await fetchJson(url);

      const entries = extractEntries(data);

      if (!entries.length) {
        throw new Error(
          "No standings entries found"
        );
      }

      const teams = entries
        .map(normalizeEntry)
        .sort((a, b) => a.rank - b.rank);

      return {
        ...league,
        season: new Date().getFullYear(),
        source: sourceName,
        status: "ok",
        teams
      };

    } catch (error) {
      lastError = error;

      console.warn(
        `${league.name} failed on ${sourceName}:`,
        error.message
      );
    }
  }

  return {
    ...league,
    season: new Date().getFullYear(),
    source: null,
    status: "unavailable",
    error: lastError
      ? lastError.message
      : "Unknown error",
    teams: []
  };
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log(" MARIOBOLA STANDINGS ENGINE");
  console.log("======================================");
  console.log("");

  const result = [];

  for (const league of leagues) {
    const data = await fetchLeague(league);

    result.push(data);

    console.log(
      `${data.status === "ok" ? "✓" : "✗"} ${league.name}`
    );
  }

  const output = {
    generatedAt:
      new Date().toISOString(),

    season:
      String(new Date().getFullYear()),

    source:
      "mariobola-standings-engine",

    status:
      "ok",

    leagues:
      result
  };

  fs.mkdirSync(
    path.dirname(OUTPUT),
    { recursive: true }
  );

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(
      output,
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log(
    `Saved: ${OUTPUT}`
  );

  console.log("");
  console.log("SUMMARY");

  for (const league of result) {
    console.log(
      `${league.name}: ${league.teams.length} teams`
    );
  }

  console.log("");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
