import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, "..");

const OUTPUT =
  path.join(
    ROOT,
    "data",
    "live-scores.json"
  );

/*
=========================================================
MARIOBOLA LIVE SCORE GENERATOR
=========================================================

12 COMPETITIONS

1. Premier League
2. La Liga
3. Serie A
4. Bundesliga
5. Ligue 1
6. Eredivisie
7. Primeira Liga
8. Brasileirão Série A
9. Major League Soccer
10. BRI Super League
11. Belgian Pro League
12. English Championship

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
    id: "la-liga",
    name: "La Liga",
    country: "Spain",
    espnId: "esp.1"
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
    id: "ligue-1",
    name: "Ligue 1",
    country: "France",
    espnId: "fra.1"
  },

  {
    id: "eredivisie",
    name: "Eredivisie",
    country: "Netherlands",
    espnId: "ned.1"
  },

  {
    id: "primeira-liga",
    name: "Primeira Liga",
    country: "Portugal",
    espnId: "por.1"
  },

  {
    id: "brasileirao",
    name: "Brasileirão Série A",
    country: "Brazil",
    espnId: "bra.1"
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
  },

  {
    id: "belgian-pro-league",
    name: "Belgian Pro League",
    country: "Belgium",
    espnId: "bel.1"
  },

  {
    id: "english-championship",
    name: "English Championship",
    country: "England",
    espnId: "eng.2"
  }

];


/*
=========================================================
DATE
=========================================================
*/

function getJakartaDate(offsetDays = 0){

  const now =
    new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Jakarta",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"
      }
    ).formatToParts(now);

  const values = {};

  for(
    const part
    of parts
  ){

    if(
      part.type !==
      "literal"
    ){

      values[
        part.type
      ] =
        part.value;
    }
  }

  const base =
    new Date(
      `${values.year}-${values.month}-${values.day}T12:00:00+07:00`
    );

  base.setDate(
    base.getDate() +
    offsetDays
  );

  return base
    .toISOString()
    .slice(0,10)
    .replaceAll("-","");
}


/*
=========================================================
FETCH ONE LEAGUE / ONE DATE
=========================================================
*/

async function fetchLeague(
  league,
  date
){

  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnId}/scoreboard?dates=${date}`;

  const response =
    await fetch(
      url,
      {
        headers:{
          "User-Agent":
            "MarioBolaLiveScore/1.0",

          "Accept":
            "application/json"
        }
      }
    );

  if(
    !response.ok
  ){

    throw new Error(
      `${league.name}: HTTP ${response.status}`
    );
  }

  const payload =
    await response.json();

  return payload?.events || [];
}


/*
=========================================================
STATUS
=========================================================
*/

function normalizeStatus(
  event
){

  const status =
    event?.status ||
    event?.competitions?.[0]?.status ||
    {};

  const type =
    status?.type ||
    {};

  const state =
    String(
      type.state ||
      status.state ||
      ""
    ).toLowerCase();

  const allText =
    [
      type.name,
      type.detail,
      type.description,
      status.detail,
      status.description
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  if(
    state === "in" ||
    allText.includes(
      "in progress"
    ) ||
    allText.includes(
      "live"
    )
  ){

    return "live";
  }

  if(
    state === "post" ||
    allText.includes(
      "final"
    ) ||
    allText.includes(
      "finished"
    ) ||
    allText.includes(
      "complete"
    )
  ){

    return "finished";
  }

  return "upcoming";
}


/*
=========================================================
TEAM
=========================================================
*/

function normalizeTeam(
  competitor
){

  const team =
    competitor?.team ||
    {};

  return {

    id:
      team.id ||
      competitor?.id ||
      "",

    uid:
      team.uid ||
      "",

    name:
      team.displayName ||
      team.name ||
      team.shortDisplayName ||
      "",

    shortName:
      team.shortDisplayName ||
      team.shortName ||
      team.abbreviation ||
      "",

    abbreviation:
      team.abbreviation ||
      "",

    logo:
      team.logos?.[0]?.href ||
      team.logo ||
      ""
  };
}


/*
=========================================================
EVENT
=========================================================
*/

function normalizeEvent(
  event,
  league,
  sourceDate
){

  const competition =
    event?.competitions?.[0] ||
    {};

  const homeCompetitor =
    competition?.competitors?.find(
      item =>
        item.homeAway ===
        "home"
    );

  const awayCompetitor =
    competition?.competitors?.find(
      item =>
        item.homeAway ===
        "away"
    );

  const status =
    event?.status ||
    competition?.status ||
    {};

  const type =
    status?.type ||
    {};

  const homeScore =
    Number.isFinite(
      Number(
        homeCompetitor?.score
      )
    )
      ? Number(
          homeCompetitor?.score
        )
      : 0;

  const awayScore =
    Number.isFinite(
      Number(
        awayCompetitor?.score
      )
    )
      ? Number(
          awayCompetitor?.score
        )
      : 0;

  return {

    eventId:
      event?.id ||
      "",

    uid:
      event?.uid ||
      "",

    league:{
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
      event?.date ||
      event?.startDate ||
      null,

    venue:
      competition?.venue?.fullName ||
      "",

    home:
      normalizeTeam(
        homeCompetitor
      ),

    away:
      normalizeTeam(
        awayCompetitor
      ),

    score:{
      home:
        homeScore,

      away:
        awayScore,

      display:
        `${homeScore}-${awayScore}`
    },

    status:{
      state:
        normalizeStatus(
          event
        ),

      clock:
        type.shortDetail ||
        type.detail ||
        status.displayClock ||
        "",

      period:
        status.period ||
        "",

      detail:
        type.detail ||
        status.detail ||
        "",

      description:
        type.description ||
        status.description ||
        ""
    },

    link:
      event?.links?.[0]?.href ||
      "",

    broadcasts:
      (competition?.broadcasts || [])
        .flatMap(
          item =>
            item?.names || []
        )
  };
}


/*
=========================================================
MAIN
=========================================================
*/

async function main(){

  console.log(
    "=========================================="
  );

  console.log(
    " MARIOBOLA LIVE SCORE GENERATOR"
  );

  console.log(
    " 12 LEAGUES"
  );

  console.log(
    "=========================================="
  );


  const dates = [

    getJakartaDate(-1),

    getJakartaDate(0),

    getJakartaDate(1)

  ];


  const allEvents = [];

  const leagueResults = [];


  for(
    const league
    of LEAGUES
  ){

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


    for(
      const date
      of dates
    ){

      try{

        const events =
          await fetchLeague(
            league,
            date
          );


        for(
          const event
          of events
        ){

          allEvents.push(
            normalizeEvent(
              event,
              league,
              date
            )
          );
        }


        result.events +=
          events.length;


      }catch(error){

        result.errors.push(
          `${date}: ${error.message}`
        );

        console.warn(
          `[WARNING] ${league.name} ${date}: ${error.message}`
        );
      }
    }


    if(
      result.errors.length
    ){

      result.status =
        result.events > 0
          ? "partial"
          : "error";
    }


    leagueResults.push(
      result
    );
  }


  /*
  DEDUPE
  */

  const unique =
    [
      ...new Map(
        allEvents
          .filter(
            event =>
              event.eventId
          )
          .map(
            event => [
              event.eventId,
              event
            ]
          )
      ).values()
    ];


  /*
  SORT
  */

  unique.sort(
    (a,b)=>{

      const at =
        a.kickoff
          ? Date.parse(
              a.kickoff
            )
          : Infinity;

      const bt =
        b.kickoff
          ? Date.parse(
              b.kickoff
            )
          : Infinity;

      return at-bt;
    }
  );


  /*
  GROUPS
  */

  const liveMatches =
    unique.filter(
      event =>
        event.status.state ===
        "live"
    );

  const upcomingMatches =
    unique.filter(
      event =>
        event.status.state ===
        "upcoming"
    );

  const finishedMatches =
    unique.filter(
      event =>
        event.status.state ===
        "finished"
    );


  /*
  OUTPUT
  */

  const output = {

    version:
      1,

    generatedAt:
      new Date().toISOString(),

    source:
      "ESPN public soccer scoreboard",

    dateRange:
      dates,

    status:
      leagueResults.some(
        league =>
          league.status ===
          "error"
      )
        ? "partial"
        : "ok",

    summary:{

      totalEvents:
        unique.length,

      live:
        liveMatches.length,

      upcoming:
        upcomingMatches.length,

      finished:
        finishedMatches.length,

      leagues:
        LEAGUES.length,

      successfulLeagues:
        leagueResults.filter(
          league =>
            league.status ===
            "ok"
        ).length
    },

    leagues:
      leagueResults,

    liveMatches,

    upcomingMatches,

    finishedMatches,

    matches:
      unique
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
    `Leagues  : ${LEAGUES.length}`
  );

  console.log(
    `Events   : ${unique.length}`
  );

  console.log(
    `LIVE     : ${liveMatches.length}`
  );

  console.log(
    `UPCOMING : ${upcomingMatches.length}`
  );

  console.log(
    `FINISHED : ${finishedMatches.length}`
  );

  console.log(
    `Output   : ${OUTPUT}`
  );

  console.log(
    "=========================================="
  );


  /*
  Do not fail merely because one league has
  no events today. A league with 0 events can
  be legitimate.
  */

  const available =
    leagueResults.filter(
      league =>
        league.status !==
        "error"
    ).length;


  if(
    available === 0
  ){

    throw new Error(
      "Semua sumber liga gagal diambil."
    );
  }
}


main()
  .catch(
    error => {

      console.error(
        "[MARIOBOLA LIVE SCORE ERROR]"
      );

      console.error(
        error
      );

      process.exit(1);
    }
  );
