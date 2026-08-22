import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(
  ROOT,
  "data",
  "live-scores.json"
);

/*
=========================================================
MARIOBOLA LIVE SCORE ENGINE
=========================================================

Sumber:
ESPN public scoreboard endpoint

Tidak membutuhkan API key.

League IDs:
eng.1  = Premier League
ita.1  = Serie A
ger.1  = Bundesliga
esp.1  = La Liga
fra.1  = Ligue 1
bra.1  = Brasileirão Série A
por.1  = Primeira Liga
bel.1  = Belgian Pro League
usa.1  = MLS
idn.1  = Indonesia / BRI Super League

=========================================================
*/

const LEAGUES = [
  {
    id: "epl",
    name: "Premier League",
    country: "England",
    espnId: "eng.1"
  },

  {
    id: "serie-a",
    name: "Serie A",
    country: "Italy",
    espnId: "ita.1"
  },

  {
    id: "bundesliga",
    name: "Bundesliga",
    country: "Germany",
    espnId: "ger.1"
  },

  {
    id: "la-liga",
    name: "La Liga",
    country: "Spain",
    espnId: "esp.1"
  },

  {
    id: "ligue-1",
    name: "Ligue 1",
    country: "France",
    espnId: "fra.1"
  },

  {
    id: "brasileirao",
    name: "Brasileirão Série A",
    country: "Brazil",
    espnId: "bra.1"
  },

  {
    id: "primeira-liga",
    name: "Primeira Liga",
    country: "Portugal",
    espnId: "por.1"
  },

  {
    id: "belgian-pro-league",
    name: "Belgian Pro League",
    country: "Belgium",
    espnId: "bel.1"
  },

  {
    id: "mls",
    name: "Major League Soccer",
    country: "United States",
    espnId: "usa.1"
  },

  {
    id: "bri-super-league",
    name: "BRI Super League",
    country: "Indonesia",
    espnId: "idn.1"
  }
];

const USER_AGENT =
  "Mozilla/5.0 (compatible; MarioBolaLiveScore/1.0)";

/*
Fetch yesterday + today + tomorrow.

This avoids losing matches around midnight
because ESPN and our local WIB/WITA/WIT date can differ.
*/

function getDateString(offsetDays = 0) {

  const now = new Date();

  const jakarta =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(now);

  const parts = {};

  for (const item of jakarta) {
    if (item.type !== "literal") {
      parts[item.type] = item.value;
    }
  }

  const base =
    new Date(
      `${parts.year}-${parts.month}-${parts.day}T12:00:00+07:00`
    );

  base.setDate(
    base.getDate() + offsetDays
  );

  return (
    base
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")
  );
}

const DATE_RANGE = [
  getDateString(-1),
  getDateString(0),
  getDateString(1)
];

/* ------------------------------------------------------
Helpers
------------------------------------------------------ */

function text(value) {
  return value == null
    ? ""
    : String(value).trim();
}

function number(value, fallback = null) {

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

/* ------------------------------------------------------
Fetch ESPN
------------------------------------------------------ */

async function fetchScoreboard(
  league,
  date
) {

  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnId}/scoreboard?dates=${date}`;

  console.log(
    `Fetching ${league.name} ${date}`
  );

  const response =
    await fetch(
      url,
      {
        headers: {
          "User-Agent":
            USER_AGENT,

          "Accept":
            "application/json"
        }
      }
    );

  if (!response.ok) {

    throw new Error(
      `HTTP ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/* ------------------------------------------------------
Status normalization
------------------------------------------------------ */

function getStatusInfo(
  event
) {

  const status =
    event?.status ??
    event?.competitions?.[0]?.status ??
    {};

  const type =
    status.type ?? {};

  const state =
    text(
      type.state ??
      status.state
    ).toLowerCase();

  const name =
    text(
      type.name ??
      status.name
    ).toLowerCase();

  const detail =
    text(
      type.detail ??
      status.detail
    );

  const description =
    text(
      type.description ??
      status.description
    );

  const all =
    `${state} ${name} ${detail} ${description}`
      .toLowerCase();

  let normalized =
    "unknown";

  if (
    state === "in" ||
    all.includes("in progress") ||
    all.includes("live")
  ) {

    normalized = "live";

  } else if (
    state === "post" ||
    all.includes("final") ||
    all.includes("finished") ||
    all.includes("complete")
  ) {

    normalized = "finished";

  } else if (
    state === "pre" ||
    all.includes("scheduled") ||
    all.includes("upcoming")
  ) {

    normalized = "upcoming";
  }

  return {

    state:
      normalized,

    displayClock:
      text(
        status.displayClock ??
        event?.displayClock ??
        ""
      ),

    displayPeriod:
      text(
        status.period ??
        event?.period ??
        ""
      ),

    detail,

    description
  };
}

/* ------------------------------------------------------
Competitors
------------------------------------------------------ */

function getCompetitor(
  event,
  side
) {

  return (
    event?.competitions?.[0]?.competitors
      ?.find(
        item =>
          item.homeAway === side
      )
  );
}

/* ------------------------------------------------------
Team
------------------------------------------------------ */

function normalizeTeam(
  competitor
) {

  const team =
    competitor?.team ?? {};

  const logo =
    team?.logos?.[0]?.href ??
    team?.logo ??
    "";

  return {

    id:
      text(
        team.id ??
        competitor?.id
      ),

    uid:
      text(
        team.uid
      ),

    name:
      text(
        team.displayName ??
        team.name ??
        team.shortDisplayName
      ),

    shortName:
      text(
        team.shortDisplayName ??
        team.shortName ??
        team.abbreviation
      ),

    abbreviation:
      text(
        team.abbreviation
      ),

    logo
  };
}

/* ------------------------------------------------------
Normalize event
------------------------------------------------------ */

function normalizeEvent(
  event,
  league,
  sourceDate
) {

  const home =
    getCompetitor(
      event,
      "home"
    );

  const away =
    getCompetitor(
      event,
      "away"
    );

  const status =
    getStatusInfo(
      event
    );

  const homeTeam =
    normalizeTeam(
      home
    );

  const awayTeam =
    normalizeTeam(
      away
    );

  const homeScore =
    number(
      home?.score
    );

  const awayScore =
    number(
      away?.score
    );

  return {

    eventId:
      text(
        event.id
      ),

    uid:
      text(
        event.uid
      ),

    league: {

      id:
        league.id,

      name:
        league.name,

      country:
        league.country,

      espnId:
        league.espnId
    },

    sourceDate,

    kickoff:
      event.date ??
      event.startDate ??
      null,

    venue:
      text(
        event?.competitions?.[0]?.venue?.fullName
      ),

    home:
      homeTeam,

    away:
      awayTeam,

    score: {

      home:
        homeScore,

      away:
        awayScore,

      display:
        `${homeScore ?? 0}-${awayScore ?? 0}`
    },

    status: {

      state:
        status.state,

      clock:
        status.displayClock,

      period:
        status.displayPeriod,

      detail:
        status.detail,

      description:
        status.description
    },

    link:
      event?.links?.[0]?.href ??
      "",

    broadcasts:
      safeArray(
        event?.competitions?.[0]?.broadcasts
      ).map(
        item =>
          text(
            item?.names?.[0]
          )
      )
  };
}

/* ------------------------------------------------------
Dedupe
------------------------------------------------------ */

function dedupeEvents(
  events
) {

  const map =
    new Map();

  for (const event of events) {

    if (!event.eventId) {
      continue;
    }

    map.set(
      event.eventId,
      event
    );
  }

  return [
    ...map.values()
  ];
}

/* ------------------------------------------------------
Sort
------------------------------------------------------ */

function sortEvents(
  events
) {

  return [
    ...events
  ].sort(
    (a, b) => {

      const aTime =
        a.kickoff
          ? new Date(
              a.kickoff
            ).getTime()
          : Infinity;

      const bTime =
        b.kickoff
          ? new Date(
              b.kickoff
            ).getTime()
          : Infinity;

      return (
        aTime -
        bTime
      );
    }
  );
}

/* ------------------------------------------------------
Main
------------------------------------------------------ */

async function main() {

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    " MARIOBOLA LIVE SCORE ENGINE"
  );
  console.log(
    "=========================================="
  );

  const allEvents =
    [];

  const leagueResults =
    [];

  for (
    const league
    of LEAGUES
  ) {

    const result = {

      id:
        league.id,

      name:
        league.name,

      country:
        league.country,

      espnId:
        league.espnId,

      status:
        "ok",

      events:
        0,

      errors:
        []
    };

    for (
      const date
      of DATE_RANGE
    ) {

      try {

        const payload =
          await fetchScoreboard(
            league,
            date
          );

        const events =
          safeArray(
            payload?.events
          );

        for (
          const event
          of events
        ) {

          const normalized =
            normalizeEvent(
              event,
              league,
              date
            );

          allEvents.push(
            normalized
          );
        }

        result.events +=
          events.length;

      } catch (error) {

        result.errors.push(
          `${date}: ${error.message}`
        );

        console.warn(
          `WARNING ${league.name} ${date}: ${error.message}`
        );
      }
    }

    if (
      result.errors.length
    ) {

      result.status =
        result.events
          ? "partial"
          : "error";
    }

    leagueResults.push(
      result
    );
  }

  const events =
    sortEvents(
      dedupeEvents(
        allEvents
      )
    );

  const live =
    events.filter(
      event =>
        event.status.state ===
        "live"
    );

  const upcoming =
    events.filter(
      event =>
        event.status.state ===
        "upcoming"
    );

  const finished =
    events.filter(
      event =>
        event.status.state ===
        "finished"
    );

  const generatedAt =
    new Date()
      .toISOString();

  const output = {

    version:
      1,

    generatedAt,

    source:
      "ESPN public soccer scoreboard",

    dateRange:
      DATE_RANGE,

    status:
      leagueResults.every(
        x =>
          x.status === "ok"
      )
        ? "ok"
        : "partial",

    summary: {

      totalEvents:
        events.length,

      live:
        live.length,

      upcoming:
        upcoming.length,

      finished:
        finished.length,

      leagues:
        LEAGUES.length,

      successfulLeagues:
        leagueResults.filter(
          x =>
            x.status === "ok"
        ).length
    },

    leagues:
      leagueResults,

    liveMatches:
      live,

    upcomingMatches:
      upcoming,

    finishedMatches:
      finished,

    matches:
      events
  };

  fs.mkdirSync(
    path.dirname(
      OUTPUT
    ),
    {
      recursive:
        true
    }
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
    "=========================================="
  );
  console.log(
    " LIVE SCORE BUILD COMPLETE"
  );
  console.log(
    "=========================================="
  );
  console.log(
    `Total events : ${events.length}`
  );
  console.log(
    `LIVE         : ${live.length}`
  );
  console.log(
    `UPCOMING     : ${upcoming.length}`
  );
  console.log(
    `FINISHED     : ${finished.length}`
  );
  console.log(
    `Output       : ${OUTPUT}`
  );
  console.log(
    "=========================================="
  );
  console.log("");

  /*
  We intentionally DO NOT fail the workflow when
  one league temporarily fails.

  This allows the other leagues to keep updating.

  However, if ALL leagues fail, exit 1 so the problem
  is visible in GitHub Actions.
  */

  const successful =
    leagueResults.filter(
      x =>
        x.events > 0
    ).length;

  if (
    successful === 0
  ) {

    console.error(
      "ERROR: tidak ada data pertandingan yang berhasil diambil."
    );

    process.exit(1);
  }
}

main()
  .catch(
    error => {

      console.error("");
      console.error(
        "MARIOBOLA LIVE SCORE ERROR"
      );
      console.error(
        error
      );

      process.exit(1);
    }
  );
