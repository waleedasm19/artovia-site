/* صفحة الكتّاب: أعضاء الرواق المنشور لهم (من قاعدة البيانات) والكتّاب العالميون (data/writers.json) */
(() => {
  const { $, esc, arNum } = window.ACF;
  const A = window.ACFAuth;
  const initial = (n) => esc((n || "؟").trim().charAt(0));
  const flags = (list) => list.filter(Boolean).map((c) => `<span class="w-country">${A.flag(c, 15)}${esc(A.countryName(c))}</span>`).join("");

  function card(w) {
    return `<article class="writer-card reveal in">
      <div class="w-photo">${w.photo ? `<img src="${esc(w.photo)}" alt="${esc(w.name)}" loading="lazy">` : `<span>${initial(w.name)}</span>`}</div>
      <div class="w-main">
        <h3>${esc(w.name)}</h3>${w.en ? `<div class="en w-en">${esc(w.en)}</div>` : ""}
        <div class="w-flags">${flags(w.countries || [])}</div>
        ${w.bio ? `<p class="w-bio">${esc(w.bio)}</p>` : '<p class="w-bio" style="color:var(--ink-3)">لم يكتب نبذة عنه بعد.</p>'}
        ${w.works?.length ? `<ul class="w-works">${w.works.slice(0, 4).map((x) => `<li><a href="${esc(x.href)}"><small>${esc(x.kind)}</small> ${esc(x.title)}</a></li>`).join("")}${w.works.length > 4 ? `<li><small>و${arNum(w.works.length - 4)} أخرى</small></li>` : ""}</ul>` : ""}
      </div></article>`;
  }

  /* الكتّاب العالميون */
  let world = [];
  const renderWorld = () => {
    const q = ($("#w-search").value || "").trim().toLowerCase();
    const list = world.filter((w) => !q || [w.name, w.en, ...(w.countries || []).map(A.countryName)].join(" ").toLowerCase().includes(q));
    $("#world-writers").innerHTML = list.length ? list.map(card).join("") : '<div class="empty" style="grid-column:1/-1">لا نتائج.</div>';
  };
  fetch("data/writers.json").then((r) => r.json()).then((d) => { world = d.items; renderWorld(); })
    .catch(() => ($("#world-writers").innerHTML = '<div class="empty" style="grid-column:1/-1">تعذّر التحميل.</div>'));
  $("#w-search").addEventListener("input", renderWorld);

  /* كتّاب الرواق */
  let done = false;
  A.onChange(async () => {
    if (done) return; done = true;
    try {
      const list = await A.publicWriters();
      $("#members-writers").innerHTML = list.length ? list.map((m) => card({
        name: m.name, photo: m.avatar_url, countries: [m.country], bio: m.bio,
        works: (m.articles || []).map((a) => ({ title: a.title, href: `rawaq.html?id=${a.id}`, kind: "مقال" }))
      })).join("") : '<div class="empty" style="grid-column:1/-1">لم يُنشر لأحد من الأعضاء بعد. كن أول كاتب في الرواق.</div>';
    } catch (e) { done = false; $("#members-writers").innerHTML = `<div class="empty" style="grid-column:1/-1">${esc(e.message)}</div>`; }
  });
})();
