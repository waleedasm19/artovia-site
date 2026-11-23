/* صفحة «مقالات عالمية»: data/world.json ← بطاقات بصورة الغلاف وصورة الكاتب */
(async () => {
  const { $, $$, getJSON, observe, arDate, arNum, esc } = window.ACF;
  const W = await getJSON("data/world.json").catch(() => ({ items: [], themes: {} }));
  W.items = W.items.filter((i) => i.cover);
  const T = W.themes || {};
  let theme = new URLSearchParams(location.search).get("t") || "all", q = "", shown = 12;
  if (W.updated) $("#world-updated").textContent = "آخر تحديث: " + arDate(W.updated.slice(0, 10));
  const counts = W.items.reduce((m, i) => ((m[i.theme] = (m[i.theme] || 0) + 1), m), {});
  const fb = $("#world-filters");
  fb.innerHTML = `<button class="filter" data-f="all">الكل <small>${arNum(W.items.length)}</small></button>` +
    Object.entries(T).filter(([k]) => counts[k]).map(([k, t]) => `<button class="filter" data-f="${k}" style="--c:${t.color}">${esc(t.name)} <small>${arNum(counts[k])}</small></button>`).join("");
  const card = (i, feature) => {
    const t = T[i.theme] || {};
    return `<a class="essay-card reveal${feature ? " essay-feature" : ""}" href="essay.html?id=${esc(i.slug)}" style="--c:${t.color || "var(--accent)"}">
      ${i.cover ? `<div class="cover"><img src="${esc(i.cover)}" alt="" loading="lazy" width="1280" height="720"></div>` : ""}
      <div class="in">
        <div class="top"><span class="chip">${esc(t.name || "")}</span><span>${i.mode === "translation" ? "ترجمة كاملة" : "عرض وتحليل"}</span></div>
        <h3>${esc(i.title)}</h3>
        <p>${esc(i.deck)}</p>
        <div class="author">${i.photo ? `<img src="${esc(i.photo)}" alt="" loading="lazy" width="44" height="44">` : `<span class="ph">${esc((i.authorAr || "؟")[0])}</span>`}
          <span><b>${esc(i.authorAr)}</b><small>${esc(i.source)}${i.year ? ` · ${esc(i.year)}` : ""}</small></span></div>
      </div></a>`;
  };
  const list = $("#world-list"), more = $("#world-more");
  function render() {
    $$(".filter", fb).forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === theme));
    const items = W.items.filter((i) => (theme === "all" || i.theme === theme) &&
      (!q || [i.title, i.deck, i.authorAr, i.author, i.origTitle, i.source].join(" ").toLowerCase().includes(q)));
    $("#world-count").textContent = `${arNum(items.length)} مقالًا`;
    list.innerHTML = items.length ? items.slice(0, shown).map((i, k) => card(i, k === 0 && !q && theme === "all")).join("")
      : '<div class="empty" style="grid-column:1/-1">لا توجد مقالات مطابقة الآن.</div>';
    more.hidden = items.length <= shown;
    observe(list);
  }
  fb.addEventListener("click", (e) => {
    const b = e.target.closest(".filter"); if (!b) return;
    theme = b.dataset.f; shown = 12;
    const u = new URL(location); theme === "all" ? u.searchParams.delete("t") : u.searchParams.set("t", theme); history.replaceState(null, "", u);
    render();
  });
  $("#world-q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); shown = 12; render(); });
  more.addEventListener("click", () => { shown += 12; render(); });
  render();
})();
