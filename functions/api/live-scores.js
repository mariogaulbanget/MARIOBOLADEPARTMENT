export async function onRequestGet(context) {
  const leagues = [
    ["epl", "Premier League", "England", "eng.1"],
    ["serie-a", "Serie A", "Italy", "ita.1"],
    ["bundesliga", "Bundesliga", "Germany", "ger.1"],
    ["la-liga", "La Liga", "Spain", "esp.1"],
    ["ligue-1", "Ligue 1", "France", "fra.1"],
    ["brasileirao", "Brasileirão Série A", "Brazil", "bra.1"],
    ["primeira-liga", "Primeira Liga", "Portugal", "por.1"],
    ["belgian-pro-league", "Belgian Pro League", "Belgium", "bel.1"],
    ["mls", "Major League Soccer", "United States", "usa.1"],
    ["bri-super-league", "BRI Super League", "Indonesia", "idn.1"]
  ];

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const dateParts = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      dateParts[part.type] = part.value;
    }
  }

  const base = new Date(
    `${dateParts.year}-${dateParts.month}-${dateParts.day}T12:00:00+07:00`
  );

  const dates = [-1, 0, 1].map(offset => {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);

    return d.toISOString()
      .slice(0, 10)
      .replaceAll("-", "");
  });

  async function fetchLeague(league, date) {
    const [, name, country, espnId] = league;

    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnId}/scoreboard?dates=${date}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "MarioBolaLiveScore/1.0",
        "Accept": "application/json"
      },
      cf: {
        cacheTtl: 15,
        cacheEverything: true
      }
    });

    if (!response.ok) {
      throw new Error(`${name}: HTTP ${response.status}`);
    }

    const payload = await response.json();

    return (payload.events || []).map(event => {
      const competition = event.competitions?.[0];

      const home = competition?.competitors?.find(
        item => item.homeAway === "home"
      );

      const away = competition?.competitors?.find(
        item => item.homeAway === "away"
      );

      const status =
        event.status ||
        competition?.status ||
        {};

      const type = status.type || {};

      let state = String(
        type.state ||
        status.state ||
        ""
      ).toLowerCase();

      const text =
        `${type.name || ""} ${type.detail || ""} ${type.description || ""}`
          .toLowerCase();

      if (
        !state &&
        (
          text.includes("live") ||
          text.includes("in progress")
        )
      ) {
        state = "in";
      }

      if (
        state === "post" ||
        text.includes("final") ||
        text.includes("finished")
      ) {
        state = "post";
      }

      if (
        state === "pre" ||
        text.includes("scheduled")
      ) {
        state = "pre";
      }

      const homeScore =
        Number.isFinite(Number(home?.score))
          ? Number(home.score)
          : 0;

      const awayScore =
        Number.isFinite(Number(away?.score))
          ? Number(away.score)
          : 0;

      return {
        eventId: event.id,

        league: {
          id: league[0],
          name,
          country,
          espnId
        },

        kickoff:
          event.date ||
          event.startDate ||
          null,

        home: {
          id: home?.team?.id || "",
          name:
            home?.team?.displayName ||
            home?.team?.shortDisplayName ||
            "",
          logo:
            home?.team?.logos?.[0]?.href ||
            home?.team?.logo ||
            "",
          score: homeScore
        },

        away: {
          id: away?.team?.id || "",
          name:
            away?.team?.displayName ||
            away?.team?.shortDisplayName ||
            "",
          logo:
            away?.team?.logos?.[0]?.href ||
            away?.team?.logo ||
            "",
          score: awayScore
        },

        score: {
          home: homeScore,
          away: awayScore
        },

        status: {
          state,

          clock:
            type.shortDetail ||
            type.detail ||
            status.displayClock ||
            "",

          period:
            status.period || null,

          detail:
            type.detail ||
            status.detail ||
            "",

          description:
            type.description ||
            status.description ||
            ""
        }
      };
    });
  }

  const requests = [];

  for (const league of leagues) {
    for (const date of dates) {
      requests.push(
        fetchLeague(league, date)
      );
    }
  }

  const results =
    await Promise.allSettled(requests);

  const events = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      events.push(...result.value);
    }
  }

  const unique = [
    ...new Map(
      events.map(event => [
        event.eventId,
        event
      ])
    ).values()
  ];

  const liveMatches = unique.filter(
    event =>
      event.status.state === "in"
  );

  const payload = {
    version: 1,

    generatedAt:
      new Date().toISOString(),

    source:
      "ESPN public soccer scoreboard",

    dateRange:
      dates,

    status:
      "ok",

    summary: {
      totalEvents:
        unique.length,

      live:
        liveMatches.length,

      upcoming:
        unique.filter(
          event =>
            event.status.state === "pre"
        ).length,

      finished:
        unique.filter(
          event =>
            event.status.state === "post"
        ).length,

      leagues:
        leagues.length
    },

    liveMatches,

    matches:
      unique
  };

  return new Response(
    JSON.stringify(payload),
    {
      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "public, max-age=10, s-maxage=15, stale-while-revalidate=30",

        "access-control-allow-origin":
          "*"
      }
    }
  );
}
