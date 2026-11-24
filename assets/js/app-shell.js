/* وضع التطبيق: تسجيل عامل الخدمة، وشريط التنقل السفلي وشاشة البداية حين يُفتح الموقع من الشاشة الرئيسية. */
(() => {
  "use strict";
  const root = document.documentElement;
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
  // شاشة البداية تختفي من الصفحة بعد انتهاء حركتها
  const splash = document.getElementById("app-splash");
  if (splash) splash.addEventListener("animationend", (e) => { if (e.animationName === "app-splash-out") splash.remove(); });
  if (!root.classList.contains("app-mode")) return;

  const here = (location.pathname.split("/").pop() || "index.html").replace(/\?.*$/, "");
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const items = [
    ["index.html", "./", "الرئيسية", icon('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>')],
    ["library.html", "library.html", "المكتبة", icon('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/>')],
    ["news.html", "news.html", "الأخبار", icon('<path d="M3 12h4l3-8 4 16 3-8h4"/>')],
    ["magazine.html", "magazine.html", "المدار", icon('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>')],
    ["world.html", "world.html", "مقالات", icon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>')],
  ];
  const related = { "book.html": "library.html", "article.html": "news.html", "essay.html": "world.html" };
  const active = related[here] || here;
  const nav = document.createElement("nav");
  nav.className = "app-tabbar";
  nav.setAttribute("aria-label", "التنقل في التطبيق");
  nav.innerHTML = items.map(([page, href, label, svg]) =>
    `<a href="${href}"${page === active ? ' aria-current="page"' : ""}>${svg}<span>${label}</span></a>`).join("");
  document.body.append(nav);
})();
