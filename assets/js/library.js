/* صفحة المكتبة: تصفية وبحث */
(async () => {
  const { $, $$, getJSON, fieldsP, bookCard, observe, tilt } = window.ACF;
  const [books, F] = await Promise.all([getJSON("data/books.json"), fieldsP]);
  let f = "all", q = "";
  const el = $("#lib-books");
  function render() {
    const list = books.filter((b) => (f === "all" || b.status === f || b.type === f) &&
      (!q || (b.title + b.subtitle + b.blurb + b.en).toLowerCase().includes(q)));
    el.innerHTML = list.length ? list.map((b) => bookCard(b, F)).join("") : '<div class="empty" style="grid-column:1/-1">لا توجد كتب مطابقة بعد.</div>';
    el.querySelectorAll(".book").forEach(tilt); observe(el);
  }
  $$("#lib-filters .filter").forEach((b) => b.addEventListener("click", () => {
    $$("#lib-filters .filter").forEach((x) => x.setAttribute("aria-pressed", x === b)); f = b.dataset.f; render();
  }));
  $("#lib-q").addEventListener("input", (e) => { q = e.target.value.trim().toLowerCase(); render(); });
  render();
})();
