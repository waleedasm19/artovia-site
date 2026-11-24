/* الصفحة الرئيسية: الكتب، المجالات، آخر الأخبار */
(async () => {
  const { $, getJSON, fieldsP, bookCard, newsCard, observe, tilt, arDate, esc } = window.ACF;
  const F = await fieldsP;
  getJSON("data/books.json").then((books) => {
    const el = $("#home-books"); el.innerHTML = books.slice(0, 4).map((b) => bookCard(b, F)).join("");
    el.querySelectorAll(".book").forEach(tilt); observe(el);
    const st = $("#stat-books"), n = books.filter((b) => b.status === "done").length;
    if (st && n) st.dataset.count = n;
  });
  const fe = $("#fields");
  fe.innerHTML = Object.values(F).map((f, i) => `<a class="field reveal" data-delay="${i % 4}" href="news.html?field=${f.id}" style="--c:${f.color}">${(window.FIELD_ICONS || {})[f.id] || ""}<h3>${esc(f.name)}</h3><span class="en">${esc(f.en)}</span></a>`).join("");
  observe(fe);
  getJSON("data/news.json").then((n) => {
    const el = $("#home-news"); el.innerHTML = n.items.filter((i) => i.slug).slice(0, 7).map((i, k) => newsCard(i, F, k === 0)).join("");
    $("#home-updated").textContent = "آخر تحديث: " + arDate(n.updated.slice(0, 10));
    observe(el);
  }).catch(() => ($("#home-news").innerHTML = '<div class="empty">تعذّر تحميل الأخبار الآن.</div>'));
})();
