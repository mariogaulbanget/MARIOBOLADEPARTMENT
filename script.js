const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const scrollProgress = document.getElementById("scrollProgress");
const liveClock = document.getElementById("liveClock");
const toast = document.getElementById("toast");
const modal = document.getElementById("matchModal");

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
  button.addEventListener("click", () => modal?.classList.remove("show"));
});

modal?.addEventListener("click", event => {
  if (event.target === modal) modal.classList.remove("show");
});

document.getElementById("year").textContent = new Date().getFullYear();

