/* صفحة المجال: field.html?id=<المجال> تجمع كتبه وأخباره ومعلوماته في مكان واحد */
(async () => {
  const { $, getJSON, fieldsP, bookCard, newsCard, observe, tilt, esc, arNum } = window.ACF;
  const F = await fieldsP;
  const ids = Object.keys(F);
  let id = new URLSearchParams(location.search).get("id");
  if (!F[id]) id = ids[0];
  const f = F[id];
  const DESC = {
    space: "من الكواكب القريبة إلى أبعد المجرات: ما يكشفه العلماء كل يوم عن الكون الذي نعيش فيه.",
    physics: "قوانين الحركة والطاقة والمادة، من الذرّة الصغيرة إلى الأجسام الدوّارة والموجات.",
    chemistry: "المادة وتحوّلاتها: العناصر والتفاعلات والمواد الجديدة التي تغيّر حياتنا.",
    biology: "الحياة في كل صورها: الخلايا والجينات والكائنات والبيئات التي تحتضنها.",
    health: "جسم الإنسان وصحته: أحدث الأبحاث الطبية والعلاجات والاكتشافات.",
    earth: "كوكبنا: مناخه وبحاره وبراكينه، وكيف يتغيّر من حولنا.",
    tech: "الحواسيب والذكاء الاصطناعي والتقنيات التي تصنع الغد.",
    engineering: "كيف نصمّم ونبني: الإلكترونيات والآلات والمصانع والجسور.",
    math: "لغة العلم: الأعداد والأنماط والخوارزميات والحوسبة."
  };
  document.title = `${f.name} | مؤسسة إرتوفيا الخيرية`;
  $("#field-hero").style.setProperty("--c", f.color);
  $("#f-crumb").textContent = f.name;
  $("#f-title").textContent = f.name;
  $("#f-desc").textContent = DESC[id] || "";
  $("#f-icon").innerHTML = (window.FIELD_ICONS || {})[id] || "";
  $("#f-news-all").href = `news.html?field=${id}`;
  $("#f-switch").innerHTML = ids.map((k) => `<a href="field.html?id=${k}" style="--c:${F[k].color}"${k === id ? ' aria-current="page"' : ""}>${(window.FIELD_ICONS || {})[k] || ""}<span>${esc(F[k].name)}</span></a>`).join("");
  $("#f-switch [aria-current]")?.scrollIntoView({ inline: "center", block: "nearest" });

  const empty = (t) => `<div class="empty field-empty">${t}</div>`;
  const [books, news, know, show] = await Promise.all([
    getJSON("data/books.json").catch(() => []),
    getJSON("data/news.json").catch(() => ({ items: [] })),
    getJSON("data/knowledge.json").catch(() => ({ items: [] })),
    getJSON("data/showcase.json").catch(() => ({ scenes: [] }))
  ]);
  const B = books.filter((b) => b.field === id);
  $("#f-books").innerHTML = B.length ? B.map((b) => bookCard(b, F)).join("") : empty("لا يوجد كتاب في هذا المجال بعد، وكتبنا القادمة في الطريق.");
  $("#f-books").querySelectorAll(".book").forEach(tilt);

  const N = news.items.filter((i) => i.slug && i.field === id).slice(0, 9);
  $("#f-news").innerHTML = N.length ? N.map((i, k) => newsCard(i, F, k === 0)).join("") : empty("لا أخبار في هذا المجال اليوم. تابعنا، فالأخبار تتجدّد كل يوم.");

  const seen = new Set();
  const K = [...(show.scenes || []), ...(know.items || [])].filter((s) => s.field === id && s.title && !seen.has(s.title) && seen.add(s.title));
  const card = (s) => `<article class="know-card reveal">${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy">` : ""}<div class="body"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.cite ? `<cite>${esc(s.cite)}</cite>` : ""}</div></article>`;
  if (K.length) $("#f-know").innerHTML = K.map(card).join(""); else $("#f-know-sec").hidden = true;

  const parts = [B.length ? `${arNum(B.length)} ${B.length === 1 ? "كتاب" : "كتب"}` : "", N.length ? `${arNum(N.length)} من أحدث الأخبار` : "", K.length ? `${arNum(K.length)} معلومات` : ""].filter(Boolean);
  if (parts.length) $("#f-desc").textContent += ` في هذه الصفحة: ${parts.join(" · ")}.`;
  observe(document);
})();
