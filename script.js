const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const CONFIG = {
  login: "https://kingmariobola.net/?mob=0",
  analysis: "https://faktaglobal.info/category/sport/",
  liveStreaming: "https://shortq.org/nonton-bola",
  liveImage: "assets/live/live-mariobola.jpg",
  whatsapp: "https://shortq.org/waaktifmario",
  instagram: "https://shortq.org/sosial-media-mariobola",
  telegram: "https://shortq.org/sosial-media-mariobola",
  facebook: "https://shortq.org/sosial-media-mariobola",
  x: "https://shortq.org/sosial-media-mariobola"
};
let allMatches=[]; let currentFilter="all"; let newsArticles=[]; let standings=[]; let standingsIndex=0; let activeMatchId=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const initials=n=>String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const fetchJson=async url=>{const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw new Error(`${url} HTTP ${r.status}`);return r.json()};
function matchDateTime(m){return new Date(`${m.date}T${m.time}:00+07:00`)}
function formatDate(d){return new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",day:"2-digit",month:"short",year:"numeric"}).format(d)}
function dynamicStatus(m){const d=matchDateTime(m),now=new Date();if(m.actualStatus==="FINISHED"||m.status==="FINISHED"&&m.homeScore!=null&&m.awayScore!=null)return"FINISHED";if(m.actualStatus==="LIVE")return"LIVE";if(now<d)return"UPCOMING";return now<new Date(d.getTime()+125*60000)?"LIVE":"FINISHED"}
function decorate(m){return {...m,status:dynamicStatus(m)}}
function statusLabel(s){return s==="LIVE"?"LIVE":s==="FINISHED"?"FINISHED":"UPCOMING"}
function statusClass(s){return s.toLowerCase()}
function logoUrl(m,side){return side==="home"?m.homeCrest||"":m.awayCrest||""}
function logoMarkup(m,side){const n=side==="home"?m.homeTeam:m.awayTeam,u=logoUrl(m,side);return `<div class="preview-logo ${u?"has-logo":""}" ${u?`style="background-image:url('${esc(u)}')"`:""}>${u?"":initials(n)}</div>`}
function setCrest(el,url,name){if(!el)return;el.textContent=url?"":initials(name);el.style.backgroundImage=url?`url("${url}")`:"";el.classList.toggle("has-crest",!!url)}
function applyLinks(){ $$('[data-config-link]').forEach(el=>{const key=el.dataset.configLink,url=CONFIG[key];if(url){el.href=url;el.target="_blank";el.rel="noopener noreferrer"}});const img=$("#liveImage");if(img&&CONFIG.liveImage){img.src=CONFIG.liveImage;img.onerror=()=>{img.src="assets/live/live-placeholder.svg"}}}
function renderFeatured(m){if(!m)return;activeMatchId=m.id;$("#matchCompetition").textContent=m.competition||"FOOTBALL";const st=$("#matchStatus");st.textContent=statusLabel(m.status);st.className=`match-status ${statusClass(m.status)}`;$("#matchDate").textContent=formatDate(matchDateTime(m));$("#matchTime").textContent=`${m.time} WIB`;$("#matchScore").textContent=m.homeScore!=null&&m.awayScore!=null?`${m.homeScore} - ${m.awayScore}`:"VS";$("#homeTeam").textContent=m.homeTeam;$("#awayTeam").textContent=m.awayTeam;$("#matchHandicap").textContent=m.handicap||"-";$("#matchPrediction").textContent=m.prediction||"-";setCrest($("#homeCrest"),m.homeCrest,m.homeTeam);setCrest($("#awayCrest"),m.awayCrest,m.awayTeam);$("#matchModal").dataset.matchId=m.id}
function renderNextSchedule(m){const sorted=allMatches.filter(x=>x.status!=="FINISHED").sort((a,b)=>matchDateTime(a)-matchDateTime(b));let idx=sorted.findIndex(x=>x.id===m?.id);if(idx<0)idx=0;[1,2,3].forEach((n,i)=>{const x=sorted[(idx+i+1)%Math.max(sorted.length,1)];if(x){$("#fixtureTeam"+n).textContent=`${x.homeTeam} vs ${x.awayTeam}`;$("#fixtureMeta"+n).textContent=`${formatDate(matchDateTime(x))} • ${x.time} WIB • ${statusLabel(x.status)}`}})}
function renderPreview(filter=currentFilter){currentFilter=filter;const list=allMatches.filter(m=>filter==="all"||m.status.toLowerCase()===filter).sort((a,b)=>matchDateTime(a)-matchDateTime(b));$("#previewSummary").textContent=`${list.length} pertandingan • sumber TXT harian MARIOBOLA • WIB`;const grid=$("#matchPreviewGrid");if(!list.length){grid.innerHTML='<div class="preview-empty">NO MATCH FOUND FOR THIS FILTER.</div>';return}const card=m=>`<article class="fixture-ticker-card"><div class="fixture-ticker-league">${esc(m.competition)}</div><div class="fixture-ticker-team">${logoMarkup(m,"home")}<strong>${esc(m.homeTeam)}</strong></div><div class="fixture-ticker-vs">VS</div><div class="fixture-ticker-team">${logoMarkup(m,"away")}<strong>${esc(m.awayTeam)}</strong></div><div class="fixture-ticker-time"><strong>${esc(m.time)}</strong><small>${esc(formatDate(matchDateTime(m)))}</small></div><div class="fixture-ticker-prediction"><small>PRED</small><strong>${esc(m.prediction||"-")}</strong></div><div class="fixture-ticker-status">${statusLabel(m.status)}</div></article>`;const html=list.map(card).join("");grid.innerHTML=`<div class="fixtures-marquee"><div class="fixtures-marquee-group">${html}</div><div class="fixtures-marquee-group">${html}</div></div>`;requestAnimationFrame(()=>{const group=$(".fixtures-marquee-group",grid),marquee=$(".fixtures-marquee",grid);if(group&&marquee){marquee.style.animationDuration=`${Math.max(40,group.scrollWidth/20)}s`}})}
function renderPredictionBoard(){const box=$("#predictionBoard");const list=[...allMatches].sort((a,b)=>matchDateTime(a)-matchDateTime(b));box.innerHTML=list.map((m,i)=>`<article class="prediction-card-modern"><div class="prediction-card-number">${String(i+1).padStart(2,"0")}</div><div><div class="prediction-card-league"><span>${esc(m.competition)}</span><b class="${statusClass(m.status)}">${statusLabel(m.status)}</b></div><div class="prediction-card-date">${esc(formatDate(matchDateTime(m)))} • ${esc(m.time)} WIB</div><div class="prediction-card-teams"><div class="prediction-team">${logoMarkup(m,"home")}<strong>${esc(m.homeTeam)}</strong></div><div class="prediction-vs">VS</div><div class="prediction-team">${logoMarkup(m,"away")}<strong>${esc(m.awayTeam)}</strong></div></div></div><div class="prediction-card-info"><div><small>HANDICAP</small><strong>${esc(m.handicap||"-")}</strong></div><div><small>PREDICTION</small><strong>${esc(m.prediction||"-")}</strong></div></div><button class="prediction-detail-modern ${statusClass(m.status)}" data-preview-id="${esc(m.id)}">${statusLabel(m.status)} <span>${m.status==="LIVE"?"●":"↗"}</span></button></article>`).join("")||'<div class="preview-empty">NO PREDICTION DATA.</div>';$$("[data-preview-id]",box).forEach(b=>b.addEventListener("click",()=>openMatch(b.dataset.previewId)))}
function openMatch(id){const m=allMatches.find(x=>x.id===id);if(!m)return;renderFeatured(m);$("#modalMatchTitle").textContent=`${m.homeTeam} VS ${m.awayTeam}`;$("#modalMatchCopy").textContent=`${m.competition} • ${formatDate(matchDateTime(m))} • ${m.time} WIB • ${statusLabel(m.status)}.`;$("#modalMatchMeta").innerHTML=`<div>HANDICAP<br><strong>${esc(m.handicap||"-")}</strong></div><div>PREDICTION<br><strong>${esc(m.prediction||"-")}</strong></div><div>STATUS<br><strong>${statusLabel(m.status)}</strong></div>`;setActionLink($("#modalDetailLink"),m.matchDetailUrl,"MATCH DETAIL →");setActionLink($("#modalStreamLink"),m.liveStreamingUrl||CONFIG.liveStreaming,"LIVE STREAMING →");$("#matchModal").classList.add("show");$("#matchModal").setAttribute("aria-hidden","false")}
function setActionLink(el,url,label){if(!el)return;el.textContent=label;if(url){el.href=url;el.target="_blank";el.rel="noopener noreferrer";el.style.pointerEvents="auto";el.style.opacity="1"}else{el.href="#";el.style.pointerEvents="none";el.style.opacity=".45"}}
function renderNews(){const a=newsArticles.find(x=>x&&x.url&&x.url!=="#")||newsArticles[0];if(!a)return;const title=$("#featuredNewsTitle"),copy=$("#featuredNewsCopy");if(title)title.innerHTML=`${esc(a.title||"THE NEXT BIG MATCH")}<br><span>STARTS HERE.</span>`;if(copy)copy.textContent=a.summary||"Analisis dan berita bola terbaru dari sumber editorial MARIOBOLA."}
function renderStandings(){const league=standings[standingsIndex];if(!league){$("#standingsLeagueName").textContent="STANDINGS UNAVAILABLE";$("#standingsBody").innerHTML='<tr><td colspan="8" class="table-loading">Belum ada data klasemen. Jalankan GitHub Actions.</td></tr>';return}$("#standingsLeagueName").textContent=league.name;$("#standingsMeta").textContent=`${league.status==="ok"?"LIVE DATA":"LAST KNOWN DATA"} • ${league.season||"-"} • ${league.teams?.length||0} TEAMS`;$("#standingsCounter").textContent=`${String(standingsIndex+1).padStart(2,"0")} / ${String(standings.length).padStart(2,"0")}`;const body=$("#standingsBody");body.innerHTML=(league.teams||[]).map(r=>`<tr><td>${r.rank}</td><td><div class="table-team">${r.team?.logo?`<img class="table-logo" src="${esc(r.team.logo)}" onerror="this.style.display='none'">`:""}<span>${esc(r.team?.shortName||r.team?.name||"Unknown")}</span></div></td><td>${r.played??0}</td><td>${r.wins??0}</td><td>${r.draws??0}</td><td>${r.losses??0}</td><td>${r.goalDifference>0?"+":""}${r.goalDifference??0}</td><td><strong>${r.points??0}</strong></td></tr>`).join("")||'<tr><td colspan="8" class="table-loading">NO STANDINGS DATA.</td></tr>';$$(".standings-dot").forEach((d,i)=>d.classList.toggle("active",i===standingsIndex))}
function buildStandingsDots(){const box=$("#standingsDots");box.innerHTML=standings.map((_,i)=>`<span class="standings-dot" data-index="${i}"></span>`).join("");$$(".standings-dot").forEach(d=>d.addEventListener("click",()=>{standingsIndex=Number(d.dataset.index);renderStandings()}));renderStandings()}
async function loadData(){try{const [schedule,news,config,stand]=await Promise.all([fetchJson("data/schedule.json"),fetchJson("data/news.json").catch(()=>({articles:[]})),fetchJson("data/site-config.json").catch(()=>({})),fetchJson("data/standings.json").catch(()=>({leagues:[]}))]);Object.assign(CONFIG,config||{});applyLinks();allMatches=(schedule.matches||[]).map(decorate).sort((a,b)=>matchDateTime(a)-matchDateTime(b));newsArticles=news.articles||[];standings=(stand.leagues||[]).filter(x=>Array.isArray(x.teams)&&x.teams.length);const live=allMatches.find(m=>m.status==="LIVE");const upcoming=allMatches.find(m=>m.status==="UPCOMING");const featured=live||allMatches.find(m=>m.featured&&m.status==="UPCOMING")||upcoming||allMatches[allMatches.length-1];if(featured){renderFeatured(featured);renderNextSchedule(featured)}renderPreview(currentFilter);renderPredictionBoard();renderNews();buildStandingsDots();const liveMatch=live||featured;$("#liveEmptyLabel").innerHTML=liveMatch?.status==="LIVE"?`LIVE NOW<br><b>${esc(liveMatch.homeTeam)} VS ${esc(liveMatch.awayTeam)}</b>`:"LIVE STREAMING<br><b>READY</b>";setActionLink($("#liveStreamingLink"),CONFIG.liveStreaming||liveMatch?.liveStreamingUrl,"LIVE STREAMING →");}catch(e){console.error(e);$("#matchCompetition").textContent="DATA ERROR";$("#matchStatus").textContent="CHECK FILE";$("#previewSummary").textContent="schedule.json belum tersedia atau tidak valid."}}
function updateClock(){const t=new Intl.DateTimeFormat("id-ID",{timeZone:"Asia/Jakarta",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date());$("#liveClock").textContent=`${t} WIB`}
$("#menuToggle")?.addEventListener("click",()=>$("#mainNav").classList.toggle("open"));$$('.main-nav a').forEach(a=>a.addEventListener("click",()=>$("#mainNav").classList.remove("open")));window.addEventListener("scroll",()=>{const max=document.documentElement.scrollHeight-innerHeight;$("#scrollProgress").style.width=`${max?scrollY/max*100:0}%`});$$('.preview-filter').forEach(b=>b.addEventListener("click",()=>{$$('.preview-filter').forEach(x=>x.classList.remove("active"));b.classList.add("active");renderPreview(b.dataset.filter)}));$$('[data-scroll-target]').forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.scrollTarget)?.scrollIntoView({behavior:"smooth"})));$("#standingsPrev")?.addEventListener("click",()=>{if(!standings.length)return;standingsIndex=(standingsIndex-1+standings.length)%standings.length;renderStandings()});$("#standingsNext")?.addEventListener("click",()=>{if(!standings.length)return;standingsIndex=(standingsIndex+1)%standings.length;renderStandings()});$("#matchModal")?.addEventListener("click",e=>{if(e.target.id==="matchModal"||e.target.closest(".modal-close,.modal-close-btn")){$("#matchModal").classList.remove("show");$("#matchModal").setAttribute("aria-hidden","true")}});/* =========================================================
   MARIOBOLA MATCH CENTER — LIVE SCORE
   HOME IS LOCKED
   ========================================================= */

const LIVE_SCORE_API = "/api/live-scores";
const LIVE_SCORE_FALLBACK = "data/live-scores.json";
const LIVE_SCORE_REFRESH = 20000;

function normalizeLiveTeam(name){
  return String(name || "")
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

const LIVE_TEAM_ALIASES = {
  "manchester united":[
    "manchester united",
    "man utd",
    "man united"
  ],

  "manchester city":[
    "manchester city",
    "man city"
  ],

  "tottenham hotspur":[
    "tottenham hotspur",
    "tottenham",
    "spurs"
  ],

  "newcastle united":[
    "newcastle united",
    "newcastle"
  ],

  "west ham united":[
    "west ham united",
    "west ham"
  ],

  "wolverhampton wanderers":[
    "wolverhampton wanderers",
    "wolverhampton",
    "wolves"
  ],

  "brighton hove albion":[
    "brighton hove albion",
    "brighton"
  ],

  "nottingham forest":[
    "nottingham forest",
    "nottingham"
  ],

  "real betis":[
    "real betis",
    "betis"
  ],

  "atletico madrid":[
    "atletico madrid",
    "atletico"
  ],

  "inter milan":[
    "inter milan",
    "internazionale",
    "inter"
  ],

  "ac milan":[
    "ac milan",
    "milan"
  ],

  "paris saint germain":[
    "paris saint germain",
    "psg"
  ]
};

function liveTeamVariants(name){

  const normalized =
    normalizeLiveTeam(name);

  const result =
    new Set([normalized]);

  Object.values(
    LIVE_TEAM_ALIASES
  ).forEach(list => {

    const normalizedAliases =
      list.map(normalizeLiveTeam);

    if (
      normalizedAliases.includes(
        normalized
      )
    ){

      normalizedAliases.forEach(
        item =>
          result.add(item)
      );
    }

  });

  return [...result];
}

function liveTeamSimilarity(a,b){

  const av =
    liveTeamVariants(a);

  const bv =
    liveTeamVariants(b);

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
          Math.max(best,1);

        continue;
      }

      if (
        x.includes(y) ||
        y.includes(x)
      ){

        best =
          Math.max(best,.88);

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
        [...ax].filter(
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

async function fetchLiveScoreData(){

  try{

    const response =
      await fetch(
        LIVE_SCORE_API,
        {
          cache:"no-store"
        }
      );

    if (!response.ok){
      throw new Error(
        `LIVE API HTTP ${response.status}`
      );
    }

    return await response.json();

  }catch(error){

    console.warn(
      "[MARIOBOLA LIVE] API gagal, memakai fallback.",
      error
    );

    try{

      const fallback =
        await fetch(
          LIVE_SCORE_FALLBACK,
          {
            cache:"no-store"
          }
        );

      if (!fallback.ok){
        throw new Error(
          `Fallback HTTP ${fallback.status}`
        );
      }

      return await fallback.json();

    }catch(fallbackError){

      console.warn(
        "[MARIOBOLA LIVE] Fallback gagal.",
        fallbackError
      );

      return null;
    }
  }
}

function getLiveEvents(payload){

  if (!payload)
    return [];

  if (
    Array.isArray(
      payload.liveMatches
    )
  ){
    return payload.liveMatches;
  }

  if (
    Array.isArray(
      payload.matches
    )
  ){
    return payload.matches;
  }

  if (
    Array.isArray(
      payload.events
    )
  ){
    return payload.events;
  }

  return [];
}

function getLiveHomeName(event){

  return String(
    event?.home?.name ||
    event?.homeTeam ||
    ""
  );
}

function getLiveAwayName(event){

  return String(
    event?.away?.name ||
    event?.awayTeam ||
    ""
  );
}

function getLiveHomeScore(event){

  const score =
    event?.score?.home ??
    event?.home?.score ??
    event?.homeScore;

  return Number.isFinite(
    Number(score)
  )
    ? Number(score)
    : 0;
}

function getLiveAwayScore(event){

  const score =
    event?.score?.away ??
    event?.away?.score ??
    event?.awayScore;

  return Number.isFinite(
    Number(score)
  )
    ? Number(score)
    : 0;
}

function getLiveClock(event){

  return String(
    event?.status?.clock ||
    event?.status?.detail ||
    event?.clock ||
    ""
  );
}

function getLiveState(event){

  const value =
    String(
      event?.status?.state ||
      event?.state ||
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
    value.includes("finish") ||
    value.includes("final") ||
    value.includes("complete")
  ){
    return "FINISHED";
  }

  return "UPCOMING";
}

function findLiveEventForMatch(
  match,
  events
){

  let best = null;
  let bestScore = 0;

  for (
    const event
    of events
  ){

    const homeScore =
      liveTeamSimilarity(
        match.homeTeam,
        getLiveHomeName(event)
      );

    const awayScore =
      liveTeamSimilarity(
        match.awayTeam,
        getLiveAwayName(event)
      );

    if (
      homeScore >= .70 &&
      awayScore >= .70
    ){

      const combined =
        (homeScore + awayScore) /
        2;

      if (
        combined > bestScore
      ){

        bestScore =
          combined;

        best =
          event;
      }
    }
  }

  return best;
}

async function updateMatchCenterLive(){

  if (
    !Array.isArray(allMatches) ||
    !allMatches.length
  ){
    return;
  }

  const payload =
    await fetchLiveScoreData();

  if (!payload)
    return;

  const events =
    getLiveEvents(payload);

  if (!events.length)
    return;

  allMatches =
    allMatches.map(
      match => {

        const event =
          findLiveEventForMatch(
            match,
            events
          );

        if (!event){
          return match;
        }

        return {
          ...match,

          homeScore:
            getLiveHomeScore(event),

          awayScore:
            getLiveAwayScore(event),

          actualStatus:
            getLiveState(event),

          liveData:{
            clock:
              getLiveClock(event),

            state:
              getLiveState(event),

            homeScore:
              getLiveHomeScore(event),

            awayScore:
              getLiveAwayScore(event),

            eventId:
              event.eventId ||
              event.id ||
              null
          },

          status:
            getLiveState(event)
        };
      }
    );

  /*
    Pertahankan pertandingan yang sedang
    tampil sebagai Featured Match.
  */

  let featured =
    allMatches.find(
      m =>
        m.id ===
        activeMatchId
    );

  if (!featured){

    featured =
      allMatches.find(
        m =>
          m.status ===
          "LIVE"
      );
  }

  if (!featured){

    featured =
      allMatches.find(
        m =>
          m.status ===
          "UPCOMING"
      );
  }

  if (!featured){
    featured =
      allMatches[0];
  }

  if (featured){

    renderFeatured(
      featured
    );

    renderNextSchedule(
      featured
    );
  }

  /*
    Update ticker.
  */

  renderPreview(
    currentFilter
  );

  /*
    Update ALL PREDICTIONS.
  */

  renderPredictionBoard();

  /*
    Update LIVE HUB label.
  */

  const live =
    allMatches.find(
      m =>
        m.status === "LIVE"
    );

  if (live){

    $("#liveEmptyLabel").innerHTML =
      `LIVE NOW<br>
       <b>
       ${esc(live.homeTeam)}
       ${live.homeScore ?? 0}
       -
       ${live.awayScore ?? 0}
       ${esc(live.awayTeam)}
       </b>`;

  }
}


/* =========================================================
   SAFE STARTUP
   ========================================================= */

function marioBolaStart(){

  const year =
    $("#year");

  if (year){
    year.textContent =
      new Date()
        .getFullYear();
  }

  updateClock();

  setInterval(
    updateClock,
    1000
  );

  /*
    FIRST normal website load.
  */
  loadData();

  /*
    Normal schedule/data refresh.
  */
  setInterval(
    loadData,
    60000
  );

  /*
    LIVE SCORE refresh.
  */
  setInterval(
    updateMatchCenterLive,
    LIVE_SCORE_REFRESH
  );

  /*
    First live-score request immediately.
  */
  setTimeout(
    updateMatchCenterLive,
    1500
  );
}

if (
  document.readyState ===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    marioBolaStart,
    {
      once:true
    }
  );

}else{

  marioBolaStart();
}
