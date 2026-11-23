/* شاشة المعرفة: صور حقيقية مرخّصة تتعاقب تلقائيًّا بعرض الشاشة كاملًا، وتتجدّد كل يومين.
   البيانات: data/showcase.json — وما يُستبدل يُحفظ في data/knowledge.json (صفحة «معلومات عامة»). */
(async () => {
  const { $, getJSON, esc } = window.ACF;
  const host = $("#showcase"); if (!host) return;
  const data = await getJSON("data/showcase.json").catch(() => null); if (!data?.scenes?.length) return;
  const S = data.scenes;
  const slides = host.querySelector(".screen-slides"), txt = host.querySelector(".screen-text");
  slides.innerHTML = S.map((s, i) => `<figure class="slide" data-i="${i}"><img src="${esc(s.img)}" alt="" loading="${i ? "lazy" : "eager"}" decoding="async"></figure>`).join("");
  const F = [...slides.children];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || ["reduce", "off"].includes(document.documentElement.dataset.motion);
  const words = (s) => esc(s).split(/\s+/).map((w, i) => `<span style="--i:${i}">${w}</span>`).join(" ");
  let idx = -1, timer = null, visible = false;
  function show(i) {
    const first = idx < 0; idx = (i + S.length) % S.length; const s = S[idx];
    F.forEach((f, k) => f.classList.toggle("on", k === idx));
    txt.classList.remove("on"); txt.classList.toggle("quote", !s.title);
    setTimeout(() => {
      txt.innerHTML = (s.title ? `<h3>${esc(s.title)}</h3>` : "") + `<p>${words(s.text)}</p>` + (s.cite ? `<cite>${esc(s.cite)}</cite>` : "") + (s.credit ? `<small class="credit">الصورة: ${esc(s.credit)}</small>` : "");
      requestAnimationFrame(() => txt.classList.add("on"));
    }, first ? 0 : 450);
    schedule();
  }
  // تتنقل اللوحات تلقائيًّا بلا أي أزرار، وتتوقف فقط حين تكون الشاشة خارج النظر
  function schedule() { clearTimeout(timer); if (visible) timer = setTimeout(() => show(idx + 1), (S[idx].dur || 12) * 1000); }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { idx < 0 ? show(0) : schedule(); } else clearTimeout(timer); }, { threshold: .25 }).observe(host);
  document.addEventListener("visibilitychange", () => { if (document.hidden) clearTimeout(timer); else if (visible) schedule(); });

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
