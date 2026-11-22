/* صفحة «معلومات عامة»: المعروض حاليًّا على الشاشة + الأرشيف */
(async () => {
  const { $, getJSON, esc, arDate, observe } = window.ACF;
  const card = (s, date) => `<article class="know-card reveal${s.title ? "" : " quote"}">${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy">` : ""}<div class="body">${s.title ? `<h3>${esc(s.title)}</h3>` : ""}<p>${esc(s.text)}</p>${s.cite ? `<cite>${esc(s.cite)}</cite>` : ""}${s.credit ? `<span class="date">الصورة: ${esc(s.credit)}</span>` : ""}${date ? `<span class="date">عُرضت في ${arDate(date)}</span>` : ""}</div></article>`;
  const [now, arc] = await Promise.all([getJSON("data/showcase.json").catch(() => null), getJSON("data/knowledge.json").catch(() => ({ items: [] }))]);
  const a = $("#know-now"), b = $("#know-archive");
  a.innerHTML = now?.scenes?.map((s) => card(s, now.updated)).join("") || "";
  b.innerHTML = (arc.items || []).map((s) => card(s, s.shown)).join("") || '<div class="empty">سيظهر هنا ما يُستبدل من لوحات الشاشة.</div>';
  observe(a); observe(b);
})();
