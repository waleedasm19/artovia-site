/* شاشة المعرفة: لوحات مرسومة في Krita تتعاقب بعرض الشاشة كاملًا، وتتجدّد كل يومين.
   البيانات: data/showcase.json — وما يُستبدل يُحفظ في data/knowledge.json (صفحة «معلومات عامة»). */
(async () => {
  const { $, getJSON, esc } = window.ACF;
  const host = $("#showcase"); if (!host) return;
  const data = await getJSON("data/showcase.json").catch(() => null); if (!data?.scenes?.length) return;
  const S = data.scenes;
  const slides = host.querySelector(".screen-slides"), txt = host.querySelector(".screen-text");
  const dots = host.querySelector(".screen-dots"), play = host.querySelector(".screen-play");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || ["reduce", "off"].includes(document.documentElement.dataset.motion);

  slides.innerHTML = S.map((s, i) => `<figure class="slide" data-i="${i}"><img src="${esc(s.img)}" alt="" loading="${i ? "lazy" : "eager"}" decoding="async"></figure>`).join("");
  dots.innerHTML = S.map((s, i) => `<button type="button" aria-label="اللوحة ${i + 1}"><i></i></button>`).join("");
  const F = [...slides.children], D = [...dots.children];

  let idx = -1, t0 = 0, paused = reduce, pausedAt = 0, visible = false, raf;
  const words = (s) => esc(s).split(/\s+/).map((w, i) => `<span style="--i:${i}">${w}</span>`).join(" ");
  function show(i) {
    idx = (i + S.length) % S.length; const s = S[idx];
    F.forEach((f, k) => f.classList.toggle("on", k === idx));
    D.forEach((d, k) => { d.classList.toggle("done", k < idx); d.classList.toggle("now", k === idx); d.querySelector("i").style.transform = k < idx ? "scaleX(1)" : "scaleX(0)"; });
    txt.classList.remove("on"); txt.classList.toggle("quote", !s.title);
    setTimeout(() => {
      txt.innerHTML = (s.title ? `<h3>${esc(s.title)}</h3>` : "") + `<p>${words(s.text)}</p>` + (s.cite ? `<cite>${esc(s.cite)}</cite>` : "") + (s.credit ? `<small class="credit">الصورة: ${esc(s.credit)}</small>` : "");
      requestAnimationFrame(() => txt.classList.add("on"));
    }, idx === i && t0 ? 450 : 0);
    t0 = performance.now(); pausedAt = 0;
  }
  function setPaused(p) {
    paused = p;
    play.innerHTML = p ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
    play.setAttribute("aria-label", p ? "تشغيل" : "إيقاف مؤقت");
    host.classList.toggle("paused", p);
    if (p) pausedAt = performance.now() - t0; else { t0 = performance.now() - pausedAt; loop(); }
  }
  function frame(now) {
    const d = (S[idx].dur || 12) * 1000, el = paused ? pausedAt : now - t0;
    D[idx].querySelector("i").style.transform = `scaleX(${Math.min(el / d, 1)})`;
    if (!paused && el >= d) show(idx + 1);
  }
  function loop() { cancelAnimationFrame(raf); if (paused || !visible) return; raf = requestAnimationFrame((n) => { frame(n); loop(); }); }

  D.forEach((d, k) => d.addEventListener("click", () => { show(k); if (paused) frame(performance.now()); }));
  play.addEventListener("click", () => setPaused(!paused));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { if (idx < 0) show(0); loop(); } }, { threshold: .25 }).observe(host);
  setPaused(paused);

  /* دمج الشاشة مع المشهد العلوي أثناء التمرير */
  const hero = $(".hero"), band = host.closest(".screen-band");
  if (hero && band && !reduce) {
    let ticking = false;
    const upd = () => {
      ticking = false;
      const h = hero.offsetHeight, y = scrollY;
      const p = Math.min(Math.max(y / (h * .9), 0), 1);              // تقدّم الخروج من المشهد العلوي
      hero.style.setProperty("--out", p.toFixed(3));
      const r = band.getBoundingClientRect(), q = Math.min(Math.max(1 - (r.top / innerHeight), 0), 1);
      band.style.setProperty("--in", q.toFixed(3));
    };
    addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    addEventListener("resize", upd); upd();
  }
})();
