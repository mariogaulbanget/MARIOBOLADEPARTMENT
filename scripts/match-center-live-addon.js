/* =========================================================
   MARIOBOLA MATCH CENTER — LIVE SCORE ADDON
   HOME IS LOCKED. DO NOT TOUCH HOME.
   ========================================================= */

(function MarioBolaLiveScore(){

  const API =
    "/api/live-scores";

  const FALLBACK =
    "data/live-scores.json";

  const REFRESH =
    20000;

  let liveTimer = null;

  function normalize(value){
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .replace(/&/g," and ")
      .replace(/[^a-z0-9]+/g," ")
      .replace(
        /\b(fc|cf|sc|afc|ac|bc|club|football|futbol|calcio)\b/g,
        " "
      )
      .replace(/\s+/g," ")
      .trim();
  }

  const aliases = {
    "manchester united": [
      "manchester united",
      "man utd",
      "man united"
    ],

    "manchester city": [
      "manchester city",
      "man city"
    ],

    "tottenham hotspur": [
      "tottenham hotspur",
      "tottenham",
      "spurs"
    ],

    "newcastle united": [
      "newcastle united",
      "newcastle"
    ],

    "west ham united": [
      "west ham united",
      "west ham"
    ],

    "inter milan": [
      "inter milan",
      "internazionale",
      "inter"
    ],

    "ac milan": [
      "ac milan",
      "milan"
    ],

    "paris saint germain": [
      "paris saint germain",
      "psg"
    ]
  };

  function variants(name){

    const n =
      normalize(name);

    const result =
      new Set([n]);

    Object.values(
      aliases
    ).forEach(list => {

      const values =
        list.map(normalize);

      if (
        values.includes(n)
      ){
        values.forEach(
          value =>
            result.add(value)
        );
      }

    });

    return [...result];
  }

  function similarity(a,b){

    const av =
      variants(a);

    const bv =
      variants(b);

    let best = 0;

    for (
      const x of av
    ){

      for (
        const y of bv
      ){

        if (!x || !y)
          continue;

        if (x === y){
          best =
            Math.max(
              best,
              1
            );

          continue;
        }

        if (
          x.includes(y) ||
          y.includes(x)
        ){
          best =
            Math.max(
              best,
              .88
            );

          continue;
        }

        const ax =
          new Set(
            x.split(" ")
          );

        const by =
          new Set(
            y.split(" ")
          );

        const overlap =
          [...ax]
            .filter(
              word =>
                by.has(word)
            );

        const union =
          new Set([
            ...ax,
            ...by
          ]);

        if (union.size){
          best =
            Math.max(
              best,
              overlap.length /
              union.size
            );
        }

      }

    }

    return best;
  }

  function liveEvents(data){

    if (!data)
      return [];

    if (
      Array.isArray(
        data.liveMatches
      )
    ){
      return data.liveMatches;
    }

    if (
      Array.isArray(
        data.matches
      )
    ){
      return data.matches;
    }

    if (
      Array.isArray(data.events)
    ){
      return data.events;
    }

    return [];
  }

  function liveHome(event){
    return String(
      event.home?.name ||
      event.homeTeam ||
      ""
    );
  }

  function liveAway(event){
    return String(
      event.away?.name ||
      event.awayTeam ||
      ""
    );
  }

  function liveHomeScore(event){

    const value =
      event.score?.home ??
      event.home?.score ??
      event.homeScore;

    return Number.isFinite(
      Number(value)
    )
      ? Number(value)
      : 0;
  }

  function liveAwayScore(event){

    const value =
      event.score?.away ??
      event.away?.score ??
      event.awayScore;

    return Number.isFinite(
      Number(value)
    )
      ? Number(value)
      : 0;
  }

  function liveClock(event){

    return String(
      event.status?.clock ||
      event.status?.detail ||
      event.clock ||
      ""
    );
  }

  function state(event){

    const value =
      String(
        event.status?.state ||
        event.state ||
        ""
      ).toLowerCase();

    if (
      value === "in" ||
      value.includes("live") ||
      value.includes("progress")
    ){
      return "LIVE";
    }

    if (
      value === "post" ||
      value.includes("final") ||
      value.includes("finish") ||
      value.includes("complete")
    ){
      return "FINISHED";
    }

    return "UPCOMING";
  }

  function getCurrentMatch(){

    /*
      Match Center current board.
      The existing site uses .match-board.
    */

    return document.querySelector(
      ".match-board"
    );
  }

  function getTeamNames(board){

    if (!board)
      return null;

    const teams =
      board.querySelectorAll(
        ".team h3"
      );

    if (
      teams.length < 2
    ){
      return null;
    }

    return {
      home:
        teams[0].textContent.trim(),

      away:
        teams[1].textContent.trim()
    };
  }

  function findLiveMatch(
    current,
    events
  ){

    if (!current)
      return null;

    let best = null;
    let bestScore = 0;

    events.forEach(
      event => {

        const homeScore =
          similarity(
            current.home,
            liveHome(event)
          );

        const awayScore =
          similarity(
            current.away,
            liveAway(event)
          );

        if (
          homeScore >= .70 &&
          awayScore >= .70
        ){

          const score =
            (homeScore + awayScore) /
            2;

          if (
            score > bestScore
          ){

            bestScore =
              score;

            best =
              event;
          }

        }

      }
    );

    return best;
  }

  function updateFeaturedBoard(
    event
  ){

    const board =
      getCurrentMatch();

    if (!board || !event)
      return;

    const home =
      liveHomeScore(event);

    const away =
      liveAwayScore(event);

    const currentState =
      state(event);

    /*
      .versus strong is the existing
      score/VS element.
    */

    const score =
      board.querySelector(
        ".versus strong"
      );

    if (score){

      score.textContent =
        `${home} - ${away}`;

    }

    const status =
      board.querySelector(
        ".match-status"
      );

    if (status){

      status.textContent =
        currentState;

      status.classList.remove(
        "live",
        "finished"
      );

      status.classList.add(
        currentState.toLowerCase()
      );

    }

    const versusSpans =
      board.querySelectorAll(
        ".versus span"
      );

    if (
      versusSpans.length
    ){

      const clock =
        liveClock(event);

      versusSpans[0].textContent =
        clock ||
        currentState;

    }

    /*
      Dispatch event so any existing Match Center
      UI can also consume the new score.
    */

    window.dispatchEvent(
      new CustomEvent(
        "mariobola:score-update",
        {
          detail:{
            event,
            homeScore:home,
            awayScore:away,
            state:currentState,
            clock:liveClock(event)
          }
        }
      )
    );
  }

  async function getLiveData(){

    try{

      const response =
        await fetch(
          API,
          {
            cache:"no-store"
          }
        );

      if (
        !response.ok
      ){
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      return await response.json();

    }catch(error){

      console.warn(
        "[MarioBola Live] API fallback:",
        error
      );

      try{

        const fallback =
          await fetch(
            FALLBACK,
            {
              cache:"no-store"
            }
          );

        if (
          !fallback.ok
        ){
          return null;
        }

        return await fallback.json();

      }catch{
        return null;
      }

    }

  }

  async function refresh(){

    const board =
      getCurrentMatch();

    if (!board)
      return;

    const current =
      getTeamNames(board);

    if (!current)
      return;

    const payload =
      await getLiveData();

    if (!payload)
      return;

    const events =
      liveEvents(payload);

    const match =
      findLiveMatch(
        current,
        events
      );

    if (!match)
      return;

    updateFeaturedBoard(
      match
    );

  }

  function start(){

    if (liveTimer)
      return;

    refresh();

    liveTimer =
      setInterval(
        refresh,
        REFRESH
      );

  }

  /*
    Start only after document is loaded.
    This touches MATCH CENTER only.
  */

  if (
    document.readyState ===
    "loading"
  ){

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  }else{

    start();

  }

})();
