/* مؤسسة إرتوفيا الخيرية — سكربت الموقع المشترك
   الإعدادات، الخلفية النجمية، الشريط الإخباري، الحركة عند التمرير، وأدوات صغيرة. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const BASE = root.dataset.base || "";

  /* ---------- الإعدادات (تُحفظ في متصفح الزائر فقط) ---------- */
  const DEFAULTS = { theme: "dark", fontsize: "md", motion: "auto", ticker: true, fields: [] };
  const store = {
    get() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("acf-settings") || "{}") }; } catch { return { ...DEFAULTS }; } },
    set(patch) { const s = { ...store.get(), ...patch }; try { localStorage.setItem("acf-settings", JSON.stringify(s)); } catch {} apply(s); return s; }
  };
  function apply(s = store.get()) {
    root.dataset.theme = s.theme;
    root.dataset.fontsize = s.fontsize;
    const reduce = s.motion === "reduce" || (s.motion === "auto" && matchMedia("(prefers-reduced-motion: reduce)").matches);
    root.dataset.motion = reduce ? "reduce" : "full";
    const t = $(".ticker"); if (t) t.hidden = !s.ticker;
    document.dispatchEvent(new CustomEvent("acf:settings", { detail: s }));
  }
  apply();

  /* ---------- أدوات عامة ---------- */
  const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  const arNum = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);
  const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  function arDate(iso) {
    const d = new Date(iso + (iso.length === 10 ? "T12:00:00Z" : ""));
    if (isNaN(d)) return "";
    return `${arNum(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${arNum(d.getUTCFullYear())}`;
  }
  function ago(iso) {
    const d = new Date(iso + (iso.length === 10 ? "T12:00:00Z" : "")), days = Math.round((Date.now() - d) / 864e5);
    if (days <= 0) return "اليوم"; if (days === 1) return "أمس"; if (days === 2) return "قبل يومين";
    if (days <= 10) return `قبل ${arNum(days)} أيام`; return arDate(iso);
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cache = {};
  const getJSON = (p) => (cache[p] ||= fetch(BASE + p, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(p); return r.json(); }));
  function toast(msg) {
    let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- روابط التواصل من الإعدادات ---------- */
  const CFG = window.ACF_CONFIG || {};
  if (CFG.instagram) $$(".insta").forEach((li) => { li.hidden = false; li.querySelector("a").href = CFG.instagram; });

  /* ---------- القائمة على الجوال ---------- */
  const menuBtn = $(".menu-btn"), links = $(".nav-links");
  menuBtn?.addEventListener("click", () => { const o = links.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); });
  $$(".nav-links a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));

  /* ---------- زر تبديل المظهر ---------- */
  $(".theme-btn")?.addEventListener("click", () => {
    const s = store.set({ theme: store.get().theme === "dark" ? "light" : "dark" });
    toast(s.theme === "dark" ? "المظهر الليلي" : "المظهر النهاري");
  });

  /* ---------- الخلفية النجمية ---------- */
  const cv = $("#stars");
  if (cv) {
    const ctx = cv.getContext("2d"); let W, H, stars = [], raf, mx = 0, my = 0;
    const DPR = Math.min(devicePixelRatio || 1, 2);
    function size() {
      W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR;
      cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
      const n = Math.min(420, Math.round((innerWidth * innerHeight) / 4200));
      stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * .9 + .1, r: Math.random() * 1.2 + .2, t: Math.random() * 6.28, s: Math.random() * .02 + .004, h: Math.random() < .08 ? (Math.random() < .5 ? "255,214,140" : "160,190,255") : "255,255,255" }));
    }
    let shoot = null;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      const still = root.dataset.motion === "reduce";
      for (const s of stars) {
        if (!still) s.t += s.s;
        const a = .35 + Math.sin(s.t) * .3 * s.z + .3 * s.z;
        ctx.fillStyle = `rgba(${s.h},${a})`;
        ctx.beginPath(); ctx.arc(s.x + mx * s.z * 18 * DPR, s.y + my * s.z * 18 * DPR, s.r * s.z * DPR * 1.2, 0, 6.283); ctx.fill();
      }
      if (!still) {
        if (!shoot && Math.random() < .003) shoot = { x: Math.random() * W, y: Math.random() * H * .5, l: 0, v: 14 * DPR };
        if (shoot) {
          shoot.l += 1; const x = shoot.x - shoot.l * shoot.v, y = shoot.y + shoot.l * shoot.v * .45;
          const g = ctx.createLinearGradient(x, y, x + 120 * DPR, y - 54 * DPR);
          g.addColorStop(0, "rgba(255,240,200,.9)"); g.addColorStop(1, "rgba(255,240,200,0)");
          ctx.strokeStyle = g; ctx.lineWidth = 1.4 * DPR; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 120 * DPR, y - 54 * DPR); ctx.stroke();
          if (shoot.l > 40) shoot = null;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    size(); frame();
    addEventListener("resize", size);
    addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(raf); else frame(); });
  }

  /* ---------- الظهور عند التمرير ---------- */
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 }) : null;
  const observe = (el = document) => $$(".reveal:not(.in)", el).forEach((n) => io ? io.observe(n) : n.classList.add("in"));
  observe();

  /* ---------- عدّادات ---------- */
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count; let done = false;
    const run = () => { if (done) return; done = true; const t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / 1400); el.textContent = arNum(Math.round(end * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step); };
    io ? new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { run(); o.disconnect(); } })).observe(el) : run();
  });

  /* ---------- إمالة البطاقات ---------- */
  function tilt(el) {
    if (matchMedia("(hover:none)").matches) return;
    el.addEventListener("pointermove", (e) => {
      if (root.dataset.motion === "reduce") return;
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  }

  /* ---------- البيانات المشتركة ---------- */
  const fieldsP = getJSON("data/fields.json").then((a) => Object.fromEntries(a.map((f) => [f.id, f]))).catch(() => ({}));

  /* ---------- الشريط الإخباري ---------- */
  async function ticker() {
    const t = $(".ticker-track"); if (!t) return;
    try {
      const [news, F] = await Promise.all([getJSON("data/news.json"), fieldsP]);
      const pref = store.get().fields;
      let items = news.items.filter((i) => !pref.length || pref.includes(i.field)).slice(0, 18);
      if (!items.length) items = news.items.slice(0, 18);
      const html = items.map((i) => { const f = F[i.field] || {}; return `<a class="ticker-item" href="${esc(i.url)}" target="_blank" rel="noopener"><span class="tag" style="color:${f.color || "var(--accent)"}">${esc(f.name || "")}</span>${esc(i.title)}</a>`; }).join("");
      t.innerHTML = html + html.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ');
      requestAnimationFrame(() => t.style.setProperty("--dur", Math.max(60, t.scrollWidth / 2 / 55) + "s"));
    } catch { t.innerHTML = '<span class="ticker-item">تعذّر تحميل الأخبار الآن</span>'; }
    const pb = $(".ticker-pause");
    pb?.addEventListener("click", () => { const p = $(".ticker").classList.toggle("paused"); pb.setAttribute("aria-label", p ? "تشغيل الشريط" : "إيقاف الشريط"); pb.innerHTML = p ? ICON.play : ICON.pause; });
  }
  const ICON = {
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 5v14L6 12z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
  };
  ticker();

  /* ---------- رسم بطاقات ---------- */
  function bookCard(b, F) {
    const f = F[b.field] || {};
    const badge = b.review ? '<span class="book-badge wip">مكتمل · قيد المراجعة والاعتماد</span>' : b.status === "done" ? '<span class="book-badge done">مكتمل · متاح مجانًا</span>' : `<span class="book-badge wip">قيد الكتابة · ${arNum(b.progress)}٪</span>`;
    return `<a class="book reveal" href="${BASE}book.html?id=${b.id}">
      <div class="book-cover">${badge}<img src="${BASE}${b.cover}" alt="غلاف كتاب ${esc(b.title)}" loading="lazy" width="900" height="1200"></div>
      <div class="book-body"><h3>${esc(b.title)}</h3><div class="sub">${esc(b.subtitle)}</div>
      ${b.status !== "done" ? `<div class="progress" aria-label="نسبة الإنجاز"><i style="width:${b.progress}%"></i></div>` : ""}
      <div class="book-meta"><span>${esc(b.type)}</span><span style="color:${f.color}">${esc(f.name || "")}</span><span>${esc(b.level)}</span></div></div></a>`;
  }
  function newsCard(i, F, feature = false) {
    const f = F[i.field] || {};
    return `<a class="news-card reveal${feature ? " news-feature" : ""}" href="${esc(i.url)}" target="_blank" rel="noopener" style="--c:${f.color}">
      <div class="top"><span class="chip">${esc(f.name || i.field)}</span><time datetime="${esc(i.date)}">${ago(i.date)}</time></div>
      <h3>${esc(i.title)}</h3>${i.orig ? `<div class="orig" lang="en">${esc(i.orig)}</div>` : ""}
      ${i.summary ? `<p>${esc(i.summary)}</p>` : ""}
      <div class="src"><span>المصدر: ${esc(i.source)}${i.orig ? " · اقرأه بلغته الأصلية" : ""}</span>${ICON.ext}</div></a>`;
  }

  window.ACF = { $, $$, store, apply, getJSON, fieldsP, arNum, arDate, ago, esc, toast, observe, tilt, bookCard, newsCard, ICON, BASE };
})();
