/* صفحة المقال: article.html?id=slug ← data/articles/<slug>.json */
(async () => {
  const { $, getJSON, fieldsP, esc, arDate, ICON } = window.ACF;
  const id = (new URLSearchParams(location.search).get("id") || "").replace(/[^a-z0-9-]/gi, "");
  const root = $("#article");
  const [a, F] = await Promise.all([id ? getJSON(`data/articles/${id}.json`).catch(() => null) : null, fieldsP]);
  if (!a) { root.innerHTML = '<div class="empty">لم نجد هذا المقال. <a class="link-arrow" href="news.html">كل الأخبار</a></div>'; return; }
  const f = F[a.field] || {};
  document.title = `${a.title} | أخبار إرتوفيا`;
  const meta = document.querySelector('meta[name="description"]'); if (meta) meta.content = a.deck || a.title;
  const block = (b) => typeof b === "string" ? `<p>${esc(b)}</p>`
    : b.h ? `<h2>${esc(b.h)}</h2>` : b.q ? `<blockquote>«${esc(b.q)}»${b.by ? `<br><small style="color:var(--ink-3)">${esc(b.by)}</small>` : ""}</blockquote>` : "";
  root.innerHTML = `
    <nav class="crumbs" aria-label="مسار التصفح" style="max-width:1100px;margin:0 auto 18px"><a href="./">الرئيسية</a><span>/</span><a href="news.html">الأخبار العلمية</a><span>/</span><span>${esc(f.name || "")}</span></nav>
    ${a.cover ? `<figure class="article-hero reveal in"><img src="${esc(a.cover)}" alt="${esc(a.coverAlt || a.title)}" width="1600" height="900"></figure>
      <p class="credit">رسم: مؤسسة إرتوفيا الخيرية</p>` : ""}
    <article class="reader">
      <span class="chip" style="--c:${f.color}">${esc(f.name || "")}</span>
      <h1 style="margin-top:14px">${esc(a.title)}</h1>
      ${a.deck ? `<p class="deck">${esc(a.deck)}</p>` : ""}
      <p class="meta-line"><span>${arDate(a.date)}</span><span>تحرير: أخبار إرتوفيا</span>${a.readMin ? `<span>${esc(a.readMin)}</span>` : ""}</p>
      <div class="body">${a.body.map(block).join("")}</div>
      ${a.facts?.length ? `<aside class="keyfacts"><h3>في سطور</h3><ul>${a.facts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></aside>` : ""}
      <div class="source-box"><p>المصدر الأصلي: <b>${esc(a.source)}</b>${a.study ? `<br><small>${esc(a.study)}</small>` : ""}</p>
        <a class="btn btn-ghost" href="${esc(a.url)}" target="_blank" rel="noopener">اقرأ الخبر بلغته الأصلية ${ICON.ext || ""}</a></div>
      <p style="font-size:.78rem;color:var(--ink-3);margin-top:18px">صاغت هذا المقال أسرة تحرير إرتوفيا بالعربية اعتمادًا على المصدر المذكور، مع الحفاظ على دقة المعلومات. <a class="link-arrow" href="news.html">← المزيد من الأخبار</a></p>
    </article>`;
})();
