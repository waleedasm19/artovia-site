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

  // شريط صغير حين ينقطع الاتصال: الصفحات المحفوظة تبقى تعمل
  const net = document.createElement("div");
  net.className = "net-note"; net.setAttribute("role", "status");
  net.textContent = "أنت غير متصل الآن، وتتصفّح النسخة المحفوظة في جهازك.";
  const syncNet = () => net.classList.toggle("on", !navigator.onLine);
  document.body.append(net); syncNet();
  addEventListener("online", syncNet); addEventListener("offline", syncNet);

  // دعوة لطيفة لتثبيت التطبيق في الجوال (تظهر مرة، وتختفي 30 يومًا إن أُغلقت)
  let installEvent = null;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; });
  const page = location.pathname.split("/").pop();
  const dismissed = () => { try { return Date.now() - (+localStorage.getItem("acf-install-dismissed") || 0) < 30 * 864e5; } catch { return false; } };
  if (!root.classList.contains("app-mode") && page !== "app.html" && matchMedia("(max-width: 900px)").matches && !dismissed()) {
    setTimeout(() => {
      if (root.classList.contains("app-mode") || dismissed()) return;
      const card = document.createElement("aside");
      card.className = "install-nudge"; card.setAttribute("aria-label", "تثبيت التطبيق");
      card.innerHTML = `<img src="assets/app/icon-192.png" alt="" width="44" height="44"><div><b>ثبّت تطبيق إرتوفيا</b><span>أسرع، ويعمل بلا إنترنت</span></div>
        <a class="btn btn-primary" href="app.html">ثبّت</a><button type="button" class="install-close" aria-label="إغلاق">×</button>`;
      card.querySelector("a").addEventListener("click", async (e) => {
        if (!installEvent) return;
        e.preventDefault(); installEvent.prompt(); await installEvent.userChoice.catch(() => null); installEvent = null; card.remove();
      });
      card.querySelector("button").addEventListener("click", () => {
        try { localStorage.setItem("acf-install-dismissed", String(Date.now())); } catch { /* */ }
        card.remove();
      });
      document.body.append(card);
      requestAnimationFrame(() => card.classList.add("on"));
    }, 9000);
  }

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
