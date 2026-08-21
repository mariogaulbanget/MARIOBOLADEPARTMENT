import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leagues } from "./standings-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT = path.join(__dirname, "..", "data", "standings.json");

const SOURCES = [
  league => `https://site.api.espn.com/apis/v2/sports/soccer/${league.espnId}/standings`,
  league => `https://site.web.api.espn.com/apis/v2/sports/soccer/${league.espnId}/standings`
];

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function statValue(s) {
  if (s == null) return 0;
  if (typeof s === "object") return num(s.value ?? s.numericValue ?? s.displayValue);
  return num(s);
}

function findStat(stats, names) {
  if (!Array.isArray(stats)) return 0;
  for (const name of names) {
    const s = stats.find(x => x?.name === name || x?.abbreviation === name);
    if (s) return statValue(s);
  }
  return 0;
}

function entriesFrom(data) {
  if (Array.isArray(data?.children)) {
    const all = data.children.flatMap(x =>
      Array.isArray(x?.standings?.entries) ? x.standings.entries : []
    );
    if (all.length) return all;
  }
  if (Array.isArray(data?.entries)) return data.entries;
  if (Array.isArray(data?.standings?.entries)) return data.standings.entries;
  if (Array.isArray(data?.standings)) return data.standings;
  return [];
}

function normalize(entry, index) {
  const team = entry?.team ?? entry?.teamInfo ?? entry?.competitor ?? {};
  const stats = entry?.stats ?? entry?.statistics ?? [];
  const overall = entry?.overall ?? {};

  const played = num(overall.played ?? overall.gamesPlayed ?? entry?.played ?? findStat(stats, ["gamesPlayed","played","GP"]));
  const wins = num(overall.won ?? overall.wins ?? entry?.wins ?? findStat(stats, ["wins","gamesWon","W"]));
  const draws = num(overall.drawn ?? overall.draws ?? entry?.draws ?? findStat(stats, ["ties","draws","D"]));
  const losses = num(overall.lost ?? overall.losses ?? entry?.losses ?? findStat(stats, ["losses","gamesLost","L"]));
  const goalsFor = num(overall.goalsFor ?? entry?.goalsFor ?? findStat(stats, ["pointsFor","goalsFor","GF"]));
  const goalsAgainst = num(overall.goalsAgainst ?? entry?.goalsAgainst ?? findStat(stats, ["pointsAgainst","goalsAgainst","GA"]));
  const goalDifference = num(entry?.goalDifference ?? entry?.goalsDiff ?? overall.goalDifference ?? overall.goalsDiff ?? goalsFor - goalsAgainst);
  const points = num(entry?.points ?? findStat(stats, ["points","PTS"]));
  const rank = num(entry?.position ?? entry?.rank ?? overall.position) || index + 1;

  return {
    rank,
    team: {
      id: team?.id ?? team?.uid ?? "",
      name: team?.displayName ?? team?.name ?? "Unknown Team",
      shortName: team?.shortDisplayName ?? team?.shortName ?? team?.abbreviation ?? "",
      abbreviation: team?.abbreviation ?? "",
      logo: team?.logos?.[0]?.href ?? team?.logo ?? ""
    },
    played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, points,
    form: entry?.form ?? ""
  };
}

async function getJson(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "MarioBola/1.0", "Accept": "application/json" }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
  return r.json();
}

async function fetchLeague(league) {
  let error;
  for (const buildUrl of SOURCES) {
    try {
      const data = await getJson(buildUrl(league));
      const entries = entriesFrom(data);
      if (!entries.length) throw new Error("ESPN returned no standings entries");

      return {
        id: league.id,
        name: league.name,
        country: league.country,
        countryCode: league.countryCode,
        espnId: league.espnId,
        season: data?.season?.year ?? data?.season?.displayName ?? new Date().getFullYear(),
        source: "ESPN public standings API",
        status: "ok",
        teams: entries.map(normalize).sort((a,b) => a.rank - b.rank)
      };
    } catch (e) {
      error = e;
      console.warn(`${league.name}: ${e.message}`);
    }
  }

  return {
    id: league.id, name: league.name, country: league.country,
    countryCode: league.countryCode, espnId: league.espnId,
    season: new Date().getFullYear(), source: null, status: "unavailable",
    error: error?.message ?? "Unknown error", teams: []
  };
}

async function main() {
  console.log("=== MARIOBOLA AUTOMATIC STANDINGS ===");
  const results = [];
  for (const league of leagues) {
    const result = await fetchLeague(league);
    results.push(result);
    console.log(`${result.status === "ok" ? "OK" : "FAIL"} | ${league.name} | ${result.teams.length} teams`);
  }

  const successful = results.filter(x => x.status === "ok").length;
  const output = {
    generatedAt: new Date().toISOString(),
    source: "ESPN public standings API",
    status: successful === results.length ? "ok" : "partial",
    successfulLeagues: successful,
    unavailableLeagues: results.length - successful,
    leagues: results
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), "utf8");
  console.log(`Saved ${OUTPUT}`);
  console.log(`Successful leagues: ${successful}/${results.length}`);

  if (successful === 0) process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
