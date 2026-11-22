/* صفحة «معلومات عامة»: المعروض حاليًّا على الشاشة ثم ما سبقه، بتصميم واحد */
(async () => {
  const { $, getJSON, esc, arDate, observe } = window.ACF;
  const card = (s, date) => `<article class="know-card reveal${s.title ? "" : " quote"}">${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy">` : ""}<div class="body">${s.title ? `<h3>${esc(s.title)}</h3>` : ""}<p>${esc(s.text)}</p>${s.cite ? `<cite>${esc(s.cite)}</cite>` : ""}${s.credit ? `<span class="date">الصورة: ${esc(s.credit)}</span>` : ""}</div></article>`;
  const [now, arc] = await Promise.all([getJSON("data/showcase.json").catch(() => null), getJSON("data/knowledge.json").catch(() => ({ items: [] }))]);
  const el = $("#know-all");
  el.innerHTML = [...(now?.scenes || []), ...(arc.items || [])].map((s) => card(s)).join("");
  observe(el);
})();
