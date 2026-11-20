/* صفحة الأخبار: تصفية بالمجال، بحث، تحميل تدريجي */
(async () => {
  const { $, $$, getJSON, fieldsP, newsCard, observe, arDate, arNum, esc, store } = window.ACF;
  const [news, F] = await Promise.all([getJSON("data/news.json").catch(() => ({ items: [], updated: "" })), fieldsP]);
  news.items = news.items.filter((i) => i.slug);
  const params = new URLSearchParams(location.search);
  let field = params.get("field") || "all", q = "", shown = 13;
  if (news.updated) $("#news-updated").textContent = "آخر تحديث: " + arDate(news.updated.slice(0, 10));
  const counts = news.items.reduce((m, i) => ((m[i.field] = (m[i.field] || 0) + 1), m), {});
  const fb = $("#news-filters");
  fb.innerHTML = `<button class="filter" data-f="all">الكل <small>${arNum(news.items.length)}</small></button>` +
    Object.values(F).map((f) => `<button class="filter" data-f="${f.id}" style="--c:${f.color}">${esc(f.name)} <small>${arNum(counts[f.id] || 0)}</small></button>`).join("") +
    (store.get().fields.length ? `<button class="filter" data-f="mine">مجالاتي</button>` : "");
  const list = $("#news-list"), more = $("#news-more");
  function render() {
    $$(".filter", fb).forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === field));
    const mine = store.get().fields;
    const items = news.items.filter((i) => (field === "all" || i.field === field || (field === "mine" && mine.includes(i.field))) &&
      (!q || (i.title + " " + (i.summary || "") + " " + (i.orig || "")).toLowerCase().includes(q)));
    $("#news-count").textContent = `${arNum(items.length)} خبرًا`;
    list.innerHTML = items.length ? items.slice(0, shown).map((i, k) => newsCard(i, F, k === 0 && !q)).join("")
      : '<div class="empty" style="grid-column:1/-1">لا توجد أخبار مطابقة الآن. جرّب مجالًا آخر.</div>';
    more.hidden = items.length <= shown;
    observe(list);
  }
  fb.addEventListener("click", (e) => {
    const b = e.target.closest(".filter"); if (!b) return;
    field = b.dataset.f; shown = 13;
    const u = new URL(location); field === "all" ? u.searchParams.delete("field") : u.searchParams.set("field", field); history.replaceState(null, "", u);
    render();
  });
  $("#news-q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); shown = 13; render(); });
  more.addEventListener("click", () => { shown += 12; render(); });
  render();
})();
