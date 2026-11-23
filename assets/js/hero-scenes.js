/* المشهد العلوي يتنقّل بين مجالات العلم: يبدأ بالمجموعة الشمسية، ثم كل دقيقة ينتقل بتلاشٍ
   ناعم إلى صورة حقيقية مرخّصة لمجال آخر، ثم يعود للمجموعة الشمسية. البيانات: data/hero-fields.json */
(async () => {
  const { $, getJSON, esc } = window.ACF;
  const hero = $(".hero"); if (!hero) return;
  const data = await getJSON("data/hero-fields.json").catch(() => null); if (!data?.fields?.length) return;
  const F = data.fields, every = (data.interval || 60) * 1000;
  const layer = document.createElement("div"); layer.className = "hero-scenes"; layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = F.map((f) => `<figure class="hero-scene"><img alt="" decoding="async" data-src="${esc(f.img)}"></figure>`).join("");
  const tag = document.createElement("a"); tag.className = "field-tag"; tag.target = "_blank"; tag.rel = "noopener";
  hero.prepend(layer); hero.append(tag);
  const figs = [...layer.children], canvas = $("#globe"), label = $(".planet-label");
  const load = (k) => { const im = figs[k]?.querySelector("img"); if (im && !im.src) im.src = im.dataset.src; };
  let idx = -1, timer = null, onScreen = true;     // ‎-1 = المجموعة الشمسية
  function go(k) {
    idx = k >= F.length ? -1 : k;
    figs.forEach((f, i) => f.classList.toggle("on", i === idx));
    hero.classList.toggle("field-on", idx >= 0);
    canvas?.classList.toggle("away", idx >= 0);
    if (idx >= 0) {
      const f = F[idx];
      tag.innerHTML = `<b>${esc(f.name)}</b><small>${esc(f.credit)}</small>`; tag.href = f.url;
    }
    load(idx + 1);                                   // تحميل الصورة التالية مسبقًا
    plan();
  }
  function plan() { clearTimeout(timer); if (onScreen && !document.hidden) timer = setTimeout(() => go(idx + 1), every); }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; plan(); }, { threshold: .1 }).observe(hero);
  document.addEventListener("visibilitychange", plan);
  load(0); plan();
})();
