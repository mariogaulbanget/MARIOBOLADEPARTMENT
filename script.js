const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const scrollProgress = document.getElementById("scrollProgress");
const liveClock = document.getElementById("liveClock");
const toast = document.getElementById("toast");
const modal = document.getElementById("matchModal");
const standingsModal = document.getElementById("standingsModal");
const standingsTitle = document.getElementById("standingsTitle");
const standingsStatus = document.getElementById("standingsStatus");
const standingsRows = document.getElementById("standingsRows");
const orbitTracks = document.querySelectorAll(".team-orbit-track");

function setOrbitPaused(isPaused) {
  orbitTracks.forEach(track => {
    track.style.animationPlayState = isPaused ? "paused" : "running";
    track.querySelector(".orbit-team").style.animationPlayState = isPaused ? "paused" : "running";
  });
}

const fetchJson = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
};

async function showStandings(leagueElement) {
  const leagueId = leagueElement.dataset.league;
  const leagueName = leagueElement.dataset.leagueName;
  standingsTitle.textContent = leagueName.toUpperCase();
  standingsStatus.textContent = "MEMUAT KLASEMEN TERBARU...";
  standingsRows.innerHTML = "";
  standingsModal.classList.add("show");

  try {
    const seasonsData = await fetchJson(`https://www.sofascore.com/api/v1/unique-tournament/${leagueId}/seasons`);
    const seasons = seasonsData.seasons || [];
    let currentSeason;
    let rows = [];

    for (const season of seasons) {
      try {
        const standingsData = await fetchJson(`https://www.sofascore.com/api/v1/unique-tournament/${leagueId}/season/${season.id}/standings/total`);
        const availableRows = standingsData.standings?.[0]?.rows || [];
        if (availableRows.length) {
          currentSeason = season;
          rows = availableRows;
          break;
        }
      } catch {
        continue;
      }
    }

    if (!currentSeason) throw new Error("Standings unavailable");

    standingsStatus.textContent = `${currentSeason.name.toUpperCase()} • DATA LIVE`;
    standingsRows.innerHTML = rows.slice(0, 20).map(row => `
      <tr>
        <td>${row.position ?? "-"}</td>
        <td><strong>${row.team?.name ?? "Unknown team"}</strong></td>
        <td>${row.matches ?? row.played ?? 0}</td>
        <td>${row.goalDifference ?? 0}</td>
        <td><strong>${row.points ?? 0}</strong></td>
      </tr>
    `).join("");
  } catch {
    standingsStatus.textContent = "KLASEMEN BELUM TERSEDIA. COBA LAGI NANTI.";
  }
}

document.querySelectorAll(".orbit-team[data-league]").forEach(leagueElement => {
  leagueElement.addEventListener("pointerdown", () => setOrbitPaused(true));
  leagueElement.addEventListener("click", () => showStandings(leagueElement));
  leagueElement.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      showStandings(leagueElement);
    }
  });
});

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
  button.addEventListener("click", () => {
    button.closest(".modal")?.classList.remove("show");
    if (button.closest("#standingsModal")) setOrbitPaused(false);
  });
});

modal?.addEventListener("click", event => {
  if (event.target === modal) modal.classList.remove("show");
});

standingsModal?.addEventListener("click", event => {
  if (event.target === standingsModal) {
    standingsModal.classList.remove("show");
    setOrbitPaused(false);
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

