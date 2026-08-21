const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const scrollProgress = document.getElementById("scrollProgress");
const liveClock = document.getElementById("liveClock");
const toast = document.getElementById("toast");
const modal = document.getElementById("matchModal");
const matchCompetition = document.getElementById("matchCompetition");
const matchStatus = document.getElementById("matchStatus");
const matchDate = document.getElementById("matchDate");
const matchScore = document.getElementById("matchScore");
const matchTime = document.getElementById("matchTime");
const homeTeam = document.getElementById("homeTeam");
const awayTeam = document.getElementById("awayTeam");
const homeCrest = document.getElementById("homeCrest");
const awayCrest = document.getElementById("awayCrest");
const matchSource = document.getElementById("matchSource");
const modalMatchTitle = document.getElementById("modalMatchTitle");
const modalMatchCopy = document.getElementById("modalMatchCopy");
const modalMatchMeta = document.getElementById("modalMatchMeta");
const modalDetailLink = document.getElementById("modalDetailLink");
const modalStreamLink = document.getElementById("modalStreamLink");
const previewGrid = document.getElementById("matchPreviewGrid");
const previewSummary = document.getElementById("previewSummary");
const matchHandicap = document.getElementById("matchHandicap");
const matchPrediction = document.getElementById("matchPrediction");
const predictionBoard = document.getElementById("predictionBoard");

const CONFIG = { login: "https://kingmariobola.net/?mob=0", analysis: "https://faktaglobal.info/category/sport/", liveStreaming: "", liveImage: "assets/live/live-placeholder.svg", whatsapp: "", instagram: "", telegram: "", facebook: "", x: "" };

let allMatches = [];
let currentFilter = "all";
let newsArticles = [];

const fetchJson = async url => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen);
});
document.querySelectorAll(".main-nav a").forEach(link => link.addEventListener("click", () => mainNav.classList.remove("open")));
window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollProgress) scrollProgress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
});

function updateClock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
  if (liveClock) liveClock.textContent = `${time} WIB`;
}
updateClock(); setInterval(updateClock, 1000);

function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function matchDateTime(match) { return new Date(`${match.date}T${match.time}:00+07:00`); }
function dynamicStatus(match) {
  const kickoff = matchDateTime(match);
  const now = new Date();
  if (match.homeScore != null && match.awayScore != null) return "FINISHED";
  const end = new Date(kickoff.getTime() + 125 * 60 * 1000);
  if (now < kickoff) return "UPCOMING";
  if (now < end) return "LIVE";
  return "FINISHED";
}
function applyDynamicStatus(match) { return {...match, status: dynamicStatus(match)}; }
function slugTeam(name) { return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
const leagueCountry = {
  "ENGLISH PREMIER LEAGUE":"england", "SPAIN LA LIGA":"spain", "FRANCE LIGUE 1":"france",
  "GERMAN BUNDESLIGA":"germany", "ITALIAN SERIE A":"italy", "NETHERLANDS EREDIVISIE":"netherlands",
  "BELGIAN PRO LEAGUE":"belgium", "TURKEY SUPER LIG":"turkiye", "SCOTTISH PREMIERSHIP":"scotland",
  "PORTUGAL PRIMEIRA LIGA":"portugal", "AUSTRIA BUNDESLIGA":"austria", "SWISS SUPER LEAGUE":"switzerland",
  "DENMARK SUPERLIGA":"denmark", "POLAND EKSTRAKLASA":"poland", "CZECH FIRST LEAGUE":"czech-republic",
  "CROATIA HNL":"croatia", "ROMANIA SUPERLIGA":"romania", "RUSSIA PREMIER LEAGUE":"russia",
  "SWEDEN ALLSVENSKAN":"sweden", "NORWAY ELITESERIEN":"norway", "FINLAND VEIKKAUSLIIGA":"finland",
  "GREECE SUPER LEAGUE":"greece", "ISRAEL PREMIER LEAGUE":"israel", "UKRAINE PREMIER LEAGUE":"ukraine"
};
function countryForCompetition(competition) {
  const c = String(competition || "").toUpperCase();
  if (leagueCountry[c]) return leagueCountry[c];
  const rules = [
    [/ENGLAND|ENGLISH|CHAMPIONSHIP|LEAGUE ONE|LEAGUE TWO/,'england'],[/SPAIN|LA LIGA|SEGUNDA/,'spain'],[/FRANCE|LIGUE/,'france'],
    [/GERMANY|BUNDESLIGA|DFB/,'germany'],[/ITALY|SERIE A|SERIE B|COPPA ITALIA/,'italy'],[/NETHERLAND|EREDIVISIE/,'netherlands'],
    [/BELGIUM|BELGIAN/,'belgium'],[/TURKEY|TURKIYE|SUPER LIG/,'turkiye'],[/SCOTLAND/,'scotland'],[/PORTUGAL/,'portugal'],
    [/AUSTRIA/,'austria'],[/SWITZERLAND|SWISS/,'switzerland'],[/DENMARK/,'denmark'],[/POLAND/,'poland'],[/CZECH/,'czech-republic'],
    [/CROATIA/,'croatia'],[/ROMANIA/,'romania'],[/RUSSIA/,'russia'],[/SWEDEN/,'sweden'],[/NORWAY/,'norway'],[/FINLAND/,'finland'],
    [/GREECE/,'greece'],[/ISRAEL/,'israel'],[/UKRAINE/,'ukraine'],[/ARGENTINA/,'argentina'],[/MEXICO/,'mexico'],[/CHILE/,'chile'],[/PARAGUAY/,'paraguay'],[/URUGUAY/,'uruguay'],[/COSTA RICA/,'costa-rica'],[/JAPAN|J1/,'japan']
  ];
  return rules.find(([re])=>re.test(c))?.[1] || '';
}
function logoCandidates(match, side) {
  const explicit =
    side === "home"
      ? match.homeCrest
      : match.awayCrest;

  /*
    Prioritas utama:
    logo yang sudah ditemukan oleh GitHub Actions
    dari database Football Logos.
  */
  if (explicit) {
    return [explicit];
  }

  /*
    Fallback terakhir.
    Tidak lagi menggunakan football-badges.
    Kita sengaja mengosongkan fallback agar
    website tidak menampilkan logo klub yang salah.
  */
  return [];
}
function logoMarkup(match, side) {
  const name = side === "home" ? match.homeTeam : match.awayTeam;
  const urls = logoCandidates(match, side);
  const data = esc(JSON.stringify(urls));
  return `<div class="preview-logo" data-logo-candidates='${data}' data-team-name="${esc(name)}">${initials(name)}</div>`;
}
function formatDate(date) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" }).format(date); }
function statusLabel(status) {
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return "LIVE NOW";
  if (status === "FINISHED") return "FINISHED";
  return "UPCOMING";
}
function statusClass(status) { return status === "LIVE" ? "live" : status === "FINISHED" ? "finished" : "upcoming"; }
function initials(name) { return (name || "?").split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join("").toUpperCase(); }
function setCrest(element, url, name) {
  if (!element) return;
  element.textContent = initials(name);
  element.style.backgroundImage = url ? `url("${url}")` : "";
  element.classList.toggle("has-crest", Boolean(url));
}
function esc(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function loadCrestCandidates(element, urls, name) {
  if (!element || !urls.length) return;
  let i = 0;
  const tryNext = () => {
    if (i >= urls.length) { element.style.backgroundImage = ""; element.classList.remove("has-crest"); element.textContent = initials(name); return; }
    const img = new Image();
    img.onload = () => { element.textContent = ""; element.style.backgroundImage = `url("${urls[i]}")`; element.classList.add("has-crest"); };
    img.onerror = () => { i++; tryNext(); };
    img.src = urls[i];
  };
  tryNext();
}

function resolveTeamLogo(match, side) {
  const key = side === "home" ? "homeCrest" : "awayCrest";
  return match[key] || "";
}

function renderFeatured(match) {
  if (!match) return;
  matchCompetition.textContent = match.competition;
  matchStatus.textContent = statusLabel(match.status);
  matchDate.textContent = formatDate(matchDateTime(match));
  matchTime.textContent = `${match.time} WIB`;
  matchScore.textContent = match.homeScore != null && match.awayScore != null ? `${match.homeScore} - ${match.awayScore}` : "VS";
  homeTeam.textContent = match.homeTeam;
  awayTeam.textContent = match.awayTeam;
  if (matchHandicap) matchHandicap.textContent = match.handicap || "-";
  if (matchPrediction) matchPrediction.textContent = match.prediction || "-";
  setCrest(homeCrest, resolveTeamLogo(match,"home"), match.homeTeam);
  setCrest(awayCrest, resolveTeamLogo(match,"away"), match.awayTeam);
  loadCrestCandidates(homeCrest, logoCandidates(match,"home"), match.homeTeam);
  loadCrestCandidates(awayCrest, logoCandidates(match,"away"), match.awayTeam);
  matchSource.textContent = "DATA MANUAL • TXT MARIOBOLA";
  document.querySelector(".match-board")?.setAttribute("data-match-id", match.id);
  modalMatchTitle.textContent = `${match.homeTeam} VS ${match.awayTeam}`;
  modalMatchCopy.textContent = `${match.competition} • ${formatDate(matchDateTime(match))} • ${match.time} WIB • ${statusLabel(match.status)}.`;
  modalMatchMeta.innerHTML = `<span>HANDICAP <b>${esc(match.handicap || "-")}</b></span><span>PREDICTION <b>${esc(match.prediction || "-")}</b></span>`;
  setLink(modalDetailLink, match.matchDetailUrl, "MATCH DETAIL →");
  setLink(modalStreamLink, match.liveStreamingUrl, "LIVE STREAMING →");

  const nextMatches = allMatches.filter(m => m.id !== match.id && m.status !== "FINISHED").sort((a,b)=>matchDateTime(a)-matchDateTime(b)).slice(0, 3);
  [1,2,3].forEach((n,i) => {
    const m = nextMatches[i];
    const a=document.getElementById(`fixtureTeam${n}`), b=document.getElementById(`fixtureMeta${n}`), c=document.getElementById(`fixtureLabel${n}`);
    if (!a) return;
    if (!m) { a.textContent="NO NEXT MATCH"; b.textContent="Waiting for schedule"; c.textContent="NEXT"; return; }
    a.textContent=`${m.homeTeam} VS ${m.awayTeam}`;
    b.textContent=`${formatDate(matchDateTime(m))} • ${m.time} WIB • ${statusLabel(m.status)}`;
    c.textContent=i === 0 ? "NEXT" : `+${i+1}`;
  });
}
function setLink(el, url, label) {
  if (!el) return;
  el.textContent=label;
  el.href=url || "#";
  el.classList.toggle("disabled-link", !url);
}
function renderPreview(filter=currentFilter) {
  if (!previewGrid) return;

  currentFilter = filter;

  const matches = allMatches
    .filter(
      m =>
        filter === "all" ||
        statusClass(m.status) === filter
    )
    .sort(
      (a, b) =>
        matchDateTime(a) -
        matchDateTime(b)
    );

  previewSummary.textContent =
    `${matches.length} pertandingan • sumber: TXT harian MARIOBOLA • ${formatDate(new Date())}`;

  if (!matches.length) {
    previewGrid.innerHTML =
      `<div class="preview-empty">NO MATCH FOUND FOR THIS FILTER.</div>`;
    return;
  }

  const makeTicker = list =>
    list.map(m => `
      <article class="fixture-ticker-card">

        <div class="fixture-ticker-league">
          ${esc(m.competition)}
        </div>

        <div class="fixture-ticker-team">
          ${logoMarkup(m, "home")}
          <strong>${esc(m.homeTeam)}</strong>
        </div>

        <div class="fixture-ticker-vs">
          VS
        </div>

        <div class="fixture-ticker-team">
          ${logoMarkup(m, "away")}
          <strong>${esc(m.awayTeam)}</strong>
        </div>

        <div class="fixture-ticker-time">
          <strong>${esc(m.time)}</strong>
          <small>${esc(formatDate(matchDateTime(m)))}</small>
        </div>

        <div class="fixture-ticker-prediction">
          <small>PRED</small>
          <strong>${esc(m.prediction || "-")}</strong>
        </div>

        <div class="fixture-ticker-status">
          ${statusLabel(m.status)}
        </div>

      </article>
    `).join("");

  /*
    Dua salinan identik membuat ticker
    bisa berjalan terus tanpa putus.
  */

  const content = makeTicker(matches);

previewGrid.innerHTML = `
  <div class="fixtures-marquee">
    <div class="fixtures-marquee-group">
      ${content}
    </div>

    <div class="fixtures-marquee-group">
      ${content}
    </div>
  </div>
`;

/*
  KECEPATAN TICKER DIKUNCI BERDASARKAN
  PIXEL PER DETIK.

  Jadi:
  ALL       = sama
  UPCOMING  = sama
  LIVE      = sama
  FINISHED  = sama

  Jumlah pertandingan tidak akan membuat
  ticker terasa lebih cepat.
*/

requestAnimationFrame(() => {
  const marquee = previewGrid.querySelector(".fixtures-marquee");
  const group = previewGrid.querySelector(".fixtures-marquee-group");

  if (!marquee || !group) return;

  const pixelsPerSecond = 22;

  const distance = group.scrollWidth;

  const duration = Math.max(
    35,
    distance / pixelsPerSecond
  );

  marquee.style.animationDuration = `${duration}s`;
});

  previewGrid
    .querySelectorAll("[data-logo-candidates]")
    .forEach(el => loadPreviewLogo(el));
}
function loadPreviewLogo(el) {
  try {
    const urls = JSON.parse(el.dataset.logoCandidates || "[]");
    const name = el.dataset.teamName || "";
    let i = 0;
    const next = () => {
      if (i >= urls.length) return;
      const img = new Image();
      img.onload = () => { el.textContent = ""; el.style.backgroundImage = `url("${urls[i]}")`; el.classList.add("has-logo"); };
      img.onerror = () => { i++; next(); };
      img.src = urls[i];
    };
    next();
  } catch (_) {}
}

function openMatch(id) {
  const m=allMatches.find(x=>x.id===id); if(!m || !modal) return;
  renderFeatured(m);
  modal.classList.add("show");
}
function renderPredictionBoard() {
  if (!predictionBoard) return;

  const matches = [...allMatches]
    .sort(
      (a, b) =>
        matchDateTime(a) - matchDateTime(b) ||
        (a.sortOrder || 0) - (b.sortOrder || 0)
    );

  predictionBoard.innerHTML =
    matches.map((m, i) => `
      <article class="prediction-card-modern ${m.featured ? "is-featured" : ""}">

        <div class="prediction-card-number">
          ${String(i + 1).padStart(2, "0")}
        </div>

        <div class="prediction-card-main">

          <div class="prediction-card-league">
            <span>${esc(m.competition)}</span>
            <b class="${statusClass(m.status)}">
              ${statusLabel(m.status)}
            </b>
          </div>

          <div class="prediction-card-date">
            ${esc(formatDate(matchDateTime(m)))} •
            ${esc(m.time)} WIB
          </div>

          <div class="prediction-card-teams">

            <div class="prediction-team">
              ${logoMarkup(m, "home")}
              <strong>${esc(m.homeTeam)}</strong>
            </div>

            <div class="prediction-vs">
              VS
            </div>

            <div class="prediction-team">
              ${logoMarkup(m, "away")}
              <strong>${esc(m.awayTeam)}</strong>
            </div>

          </div>

        </div>

        <div class="prediction-card-info">

          <div>
            <small>HANDICAP</small>
            <strong>${esc(m.handicap || "-")}</strong>
          </div>

          <div>
            <small>PREDICTION</small>
            <strong>${esc(m.prediction || "-")}</strong>
          </div>

        </div>

        <button
  class="prediction-detail-modern status-action ${statusClass(m.status)}"
  data-preview-id="${esc(m.id)}"
  type="button"
>
  ${statusLabel(m.status)}
  <span>
    ${m.status === "LIVE" ? "●" : "↗"}
  </span>
</button>

      </article>
    `).join("") ||
    `<div class="preview-empty">NO PREDICTION DATA.</div>`;

  predictionBoard
    .querySelectorAll("[data-preview-id]")
    .forEach(btn => {
      btn.addEventListener(
        "click",
        () => openMatch(btn.dataset.previewId)
      );
    });

  predictionBoard
    .querySelectorAll("[data-logo-candidates]")
    .forEach(el => loadPreviewLogo(el));
}

function renderNews() {
  const article = newsArticles.find(x => x && x.url && x.url !== "#") || newsArticles[0];
  const feature = document.querySelector(".prediction-feature");
  if (!article || !feature) return;
  const tag = feature.querySelector(".tag");
  const title = feature.querySelector("h3");
  const copy = feature.querySelector("p");
  const link = feature.querySelector('[data-config-link="analysis"]');
  if (tag) tag.textContent = article.category || "FEATURED ANALYSIS";
  if (title) title.innerHTML = `${esc(article.title || "THE NEXT BIG MATCH")}<br><span>STARTS HERE.</span>`;
  if (copy) copy.textContent = article.summary || "Analisis dan berita bola terbaru dari sumber editorial MARIOBOLA.";
  if (link && article.url && article.url !== "#") { link.href = article.url; link.target = "_blank"; link.rel = "noopener noreferrer"; }
}

async function loadData() {
  try {
    const [data, news, siteConfig] = await Promise.all([fetchJson("data/schedule.json"), fetchJson("data/news.json").catch(() => ({articles:[]})), fetchJson("data/site-config.json").catch(() => ({}))]);
    Object.assign(CONFIG, siteConfig || {});
    const liveImage=document.getElementById("liveImage");
    if (liveImage && CONFIG.liveImage) liveImage.src = CONFIG.liveImage;
    const login=document.querySelector('[data-config-link="login"]');
    if (login && CONFIG.login) { login.href=CONFIG.login; login.target="_blank"; login.rel="noopener noreferrer"; }
    const raw=(data.matches||[]).map(m=>applyDynamicStatus({...m}));
    // Keep FINISHED matches in the database so the Match Preview filters really work.
    allMatches=raw.sort((a,b)=>{
      const ta=matchDateTime(a).getTime(), tb=matchDateTime(b).getTime();
      return ta-tb || (a.sortOrder||0)-(b.sortOrder||0);
    });
    newsArticles = news.articles || [];

    // BIG MATCH rotation: LIVE first; otherwise the explicitly featured match;
    // otherwise the earliest upcoming match. Once it finishes, the next match takes over.
    const live=allMatches.find(m=>m.status==="LIVE");
    const featuredUpcoming=allMatches.find(m=>m.featured && m.status==="UPCOMING");
    const featured=live || featuredUpcoming || allMatches.find(m=>m.status==="UPCOMING") || allMatches[0];

    renderFeatured(featured);
    renderPreview();
    renderPredictionBoard();
    renderNews();

    const liveLink=document.getElementById("liveStreamingLink");
    const liveMatch=allMatches.find(m=>m.status==="LIVE" && m.liveStreamingUrl) || featured;
    setLink(liveLink, CONFIG.liveStreaming || liveMatch?.liveStreamingUrl, "LIVE STREAMING →");
    const liveLabel=document.getElementById("liveEmptyLabel");
    if (liveLabel) liveLabel.innerHTML = liveMatch?.status === "LIVE" ? `LIVE NOW<br><b>${esc(liveMatch.homeTeam)} VS ${esc(liveMatch.awayTeam)}</b>` : "LIVE STREAMING<br><b>READY</b>";
  } catch (e) {
    console.error(e);
    if (matchCompetition) matchCompetition.textContent="DATA ERROR";
    if (matchStatus) matchStatus.textContent="CHECK FILE";
    if (previewSummary) previewSummary.textContent="schedule.json belum tersedia.";
  }
}


document.querySelectorAll(".preview-filter").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".preview-filter").forEach(x=>x.classList.remove("active")); btn.classList.add("active"); renderPreview(btn.dataset.filter);
}));
document.querySelectorAll("[data-scroll-target]").forEach(btn=>btn.addEventListener("click",()=>document.getElementById(btn.dataset.scrollTarget)?.scrollIntoView({behavior:"smooth"})));

document.querySelectorAll("[data-config-link]").forEach(el=>el.addEventListener("click",e=>{
  const key=el.dataset.configLink; const url=CONFIG[key] || "";
  if(!url){e.preventDefault(); toast.textContent=`Link ${key.toUpperCase()} belum diisi. Nanti cukup masukkan link di CONFIG.`; toast.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>toast.classList.remove("show"),2600);} else { el.href=url; el.target="_blank"; el.rel="noopener"; }
}));

document.querySelectorAll("[data-modal]").forEach(button=>button.addEventListener("click",()=>{
  const id=document.querySelector(".match-board")?.dataset.matchId || allMatches[0]?.id; if(id) openMatch(id);
}));
document.querySelectorAll(".modal-close, .modal-close-btn").forEach(button=>button.addEventListener("click",()=>button.closest(".modal")?.classList.remove("show")));
modal?.addEventListener("click",e=>{if(e.target===modal) modal.classList.remove("show")});
document.getElementById("year").textContent=new Date().getFullYear();
loadData();
setInterval(loadData, 60000);
