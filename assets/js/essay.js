/* صفحة المقال العالمي: essay.html?id=slug ← data/world/<slug>.json */
(async () => {
  const { $, getJSON, esc, arDate, ICON } = window.ACF;
  const id = (new URLSearchParams(location.search).get("id") || "").replace(/[^a-z0-9-]/gi, "");
  const root = $("#essay");
  const [a, W] = await Promise.all([id ? getJSON(`data/world/${id}.json`).catch(() => null) : null, getJSON("data/world.json").catch(() => ({ themes: {}, items: [] }))]);
  if (!a) { root.innerHTML = '<div class="empty">لم نجد هذا المقال. <a class="link-arrow" href="world.html">كل المقالات</a></div>'; return; }
  const t = (W.themes || {})[a.theme] || {}, au = a.author || {};
  document.title = `${a.title} | مقالات عالمية، إرتوفيا`;
  const meta = document.querySelector('meta[name="description"]'); if (meta) meta.content = a.deck || a.title;
  const link = (txt, url) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(txt)}</a>` : esc(txt);
  const block = (b) => typeof b === "string" ? `<p>${esc(b)}</p>`
    : b.h ? `<h2>${esc(b.h)}</h2>`
    : b.q ? `<blockquote>«${esc(b.q)}»${b.en ? `<span class="en-q" dir="ltr">“${esc(b.en)}”</span>` : ""}${b.by ? `<small>${esc(b.by)}</small>` : ""}</blockquote>` : "";
  const isTr = a.mode === "translation";
  const more = (W.items || []).filter((i) => i.slug !== id).slice(0, 3);
  root.innerHTML = `
    <nav class="crumbs" aria-label="مسار التصفح" style="max-width:1100px;margin:0 auto 18px"><a href="./">الرئيسية</a><span>/</span><a href="world.html">مقالات عالمية</a><span>/</span><span>${esc(t.name || "")}</span></nav>
    ${a.cover ? `<figure class="article-hero reveal in"><img src="${esc(a.cover)}" alt="${esc(a.coverAlt || a.title)}" width="1600" height="900"></figure>
    <p class="credit">صورة الغلاف: ${link(a.credit || "", a.creditUrl)}</p>` : ""}
    <article class="reader" style="--c:${t.color || "var(--accent)"}">
      <span class="chip">${esc(t.name || "")}</span> <span class="chip mode">${isTr ? "ترجمة كاملة مرخّصة" : "عرض وتحليل بالعربية"}</span>
      <h1 style="margin-top:14px">${esc(a.title)}</h1>
      ${a.origTitle ? `<p class="orig-title" dir="ltr">${esc(a.origTitle)}</p>` : ""}
      ${a.deck ? `<p class="deck">${esc(a.deck)}</p>` : ""}
      <div class="byline">
        ${au.photo ? `<img src="${esc(au.photo)}" alt="${esc(au.nameAr)}" width="88" height="88">` : ""}
        <div><b>${esc(au.nameAr || "")}</b> <span class="en" dir="ltr">${esc(au.name || "")}</span>
          <p>${esc(au.bio || "")}</p>
          ${au.photo ? `<small>صورة الكاتب: ${link(au.photoCredit || "", au.photoUrl)}</small>` : ""}</div>
      </div>
      <p class="meta-line"><span>نُشر الأصل: ${esc(a.pubDate || "")} في ${esc(a.source || "")}</span><span>أضيف: ${arDate(a.added)}</span>${a.readMin ? `<span>${esc(a.readMin)}</span>` : ""}</p>
      ${a.ideas?.length ? `<aside class="keyfacts"><h3>الفكرة في سطور</h3><ul>${a.ideas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></aside>` : ""}
      <div class="body">${a.body.map(block).join("")}</div>
      ${a.critique?.length ? `<aside class="keyfacts critique"><h3>وماذا يقول المعترضون؟</h3><ul>${a.critique.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></aside>` : ""}
      ${a.think?.length ? `<aside class="think"><h3>أسئلة للتفكير</h3><ol>${a.think.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></aside>` : ""}
      <div class="source-box"><p>المقال الأصلي: <b>${esc(a.origTitle || a.title)}</b><br><small>${esc(au.name || "")}، ${esc(a.source || "")}، ${esc(a.pubDate || "")}${a.license ? ` · ${esc(a.license)}` : ""}</small></p>
        <a class="btn btn-ghost" href="${esc(a.url)}" target="_blank" rel="noopener">اقرأ المقال بلغته الأصلية ${ICON.ext || ""}</a></div>
      <p style="font-size:.78rem;color:var(--ink-3);margin-top:18px">${isTr
        ? `ترجمة أسرة تحرير إرتوفيا، منشورة وفق رخصة الأصل (${esc(a.license || "")}) مع نسبة العمل إلى صاحبه.`
        : "صاغت أسرة تحرير إرتوفيا هذا العرض بالعربية اعتمادًا على المقال الأصلي، والاقتباسات القصيرة منسوبة إلى صاحبها، وحقوق النص الكامل لأصحابه."}
        الآراء الواردة تعبّر عن كاتبها لا عن المؤسسة.</p>
      ${more.length ? `<h2 class="more-h">مقالات أخرى</h2><div class="more-list">${more.map((i) => `<a href="essay.html?id=${esc(i.slug)}">${i.cover ? `<img src="${esc(i.cover)}" alt="" loading="lazy">` : ""}<span>${esc(i.title)}<small>${esc(i.authorAr)}</small></span></a>`).join("")}</div>` : ""}
      <p style="margin-top:28px"><a class="link-arrow" href="world.html">← كل المقالات العالمية</a></p>
    </article>`;
})();
