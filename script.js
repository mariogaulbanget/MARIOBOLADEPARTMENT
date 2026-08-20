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

const fetchJson = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

menuToggle?.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen);
});

document.querySelectorAll(".main-nav a").forEach(link => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
});

function updateClock() {
  const now = new Date();
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);
  if (liveClock) liveClock.textContent = `${time} WIB`;
}
updateClock();
setInterval(updateClock, 1000);

function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatMatchTime(utcDate) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short"
  }).format(new Date(utcDate));
}

function statusLabel(status) {
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return "LIVE NOW";
  if (status === "FINISHED") return "FINISHED";
  return "UPCOMING";
}

function setCrest(element, team, fallback) {
  element.textContent = fallback;
  if (team) {
    element.style.backgroundImage = `url("${team}")`;
    element.classList.add("has-crest");
  } else {
    element.style.backgroundImage = "";
    element.classList.remove("has-crest");
  }
}

function setFixtureCard(index, match) {
  const home = document.getElementById(`fixtureTeam${index}`);
  const meta = document.getElementById(`fixtureMeta${index}`);
  const label = document.getElementById(`fixtureLabel${index}`);
  if (!home || !meta || !label) return;
  if (!match) {
    label.textContent = "NEXT";
    home.textContent = "NO FIXTURE";
    meta.textContent = "Waiting for schedule";
    return;
  }
  label.textContent = match.competitionCode || "UPCOMING";
  home.textContent = `${match.homeTeam} VS ${match.awayTeam}`;
  meta.textContent = `${formatMatchTime(match.utcDate)} • ${statusLabel(match.status)}`;
}

async function loadFeaturedMatch() {
  try {
    const data = await fetchJson(`/api/matches?date=${jakartaDate()}`);
    const match = data.match;
    if (!match) throw new Error("No match available");

    matchCompetition.textContent = match.competition;
    matchStatus.textContent = statusLabel(match.status);
    matchDate.textContent = match.competitionCode || "FEATURED FIXTURE";
    matchTime.textContent = formatMatchTime(match.utcDate);
    matchScore.textContent = match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : "VS";
    homeTeam.textContent = match.homeTeam;
    awayTeam.textContent = match.awayTeam;
    setCrest(homeCrest, match.homeCrest, "A");
    setCrest(awayCrest, match.awayCrest, "B");
    matchSource.textContent = "DATA LIVE • FOOTBALL-DATA.ORG";
    modalMatchTitle.textContent = `${match.homeTeam} VS ${match.awayTeam}`;
    modalMatchCopy.textContent = `${match.competition} • ${formatMatchTime(match.utcDate)} WIB • Status: ${statusLabel(match.status)}.`;
    data.upcoming?.slice(1, 4).forEach((upcomingMatch, index) => setFixtureCard(index + 1, upcomingMatch));
  } catch {
    matchCompetition.textContent = "FOOTBALL LEAGUE";
    matchStatus.textContent = "WAITING";
    matchDate.textContent = "BIG MATCH";
    matchTime.textContent = "API BELUM TERHUBUNG";
    matchScore.textContent = "VS";
    homeTeam.textContent = "TEAM A";
    awayTeam.textContent = "TEAM B";
    setCrest(homeCrest, "", "A");
    setCrest(awayCrest, "", "B");
    matchSource.textContent = "Tambahkan FOOTBALL_DATA_TOKEN di Cloudflare Pages";
    [1, 2, 3].forEach(index => setFixtureCard(index, null));
  }
}

loadFeaturedMatch();
setInterval(loadFeaturedMatch, 300000);

let toastTimer;
document.querySelectorAll("[data-demo-link]").forEach(item => {
  item.addEventListener("click", event => {
    event.preventDefault();
    const label = item.dataset.demoLink || "Link";
    toast.textContent = `${label}: belum dihubungkan. Nanti dikelola dari admin.`;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  });
});

document.querySelectorAll("[data-modal]").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.modal)?.classList.add("show");
  });
});

document.querySelectorAll(".modal-close, .modal-close-btn").forEach(button => {
  button.addEventListener("click", () => button.closest(".modal")?.classList.remove("show"));
});

modal?.addEventListener("click", event => {
  if (event.target === modal) modal.classList.remove("show");
});

document.getElementById("year").textContent = new Date().getFullYear();

