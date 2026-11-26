/* صفحة الكتاب: book.html?id=... */
(async () => {
  const { $, getJSON, fieldsP, esc, arNum, observe, ICON } = window.ACF;
  const id = new URLSearchParams(location.search).get("id");
  const [books, F] = await Promise.all([getJSON("data/books.json"), fieldsP]);
  const b = books.find((x) => x.id === id);
  if (!b) { $("#book").innerHTML = '<div class="empty">لم نجد هذا الكتاب. <a class="link-arrow" href="library.html">عودة إلى المكتبة</a></div>'; return; }
  document.title = `${b.title} | مؤسسة إرتوفيا الخيرية`;
  $("#crumb").textContent = b.title;
  const f = F[b.field] || { name: b.fieldName, color: b.fieldColor };
  const dl = b.review ? `<span class="btn btn-ghost" aria-disabled="true" style="cursor:default">يُتاح للتنزيل بعد اعتماده رسميًا</span>` : b.pdf ? `<a class="btn btn-primary" href="reader.html?id=${encodeURIComponent(b.id)}">اقرأ الكتاب الآن ${ICON.arrow}</a><button class="btn btn-ghost" id="dl">تنزيل PDF</button>`
    : `<span class="btn btn-ghost" aria-disabled="true" style="cursor:default">${b.status === "done" ? "رابط التنزيل يُضاف قريبًا" : "يُتاح عند اكتماله"}</span>`;
  const sample = b.sample ? `<a class="btn btn-ghost" href="${esc(b.sample)}" target="_blank" rel="noopener">اقرأ عيّنة</a>` : "";
  $("#book").innerHTML = `
   <div class="cover-3d reveal"><div class="inner"><img src="${b.cover}" alt="غلاف كتاب ${esc(b.title)}" width="900" height="1200"></div></div>
   <div class="reveal" data-delay="1">
    <span class="chip" style="--c:${f.color}">${esc(f.name || "")}</span>
    <h1 style="font-size:clamp(2.2rem,5vw,3.6rem);margin:14px 0 6px">${esc(b.title)}</h1>
    <p style="color:var(--ink-2);font-size:1.12rem;margin-bottom:4px">${esc(b.subtitle)}</p>
    <p class="en" style="color:var(--ink-3);font-size:.86rem;text-align:right">${esc(b.en)}</p>
    <p style="color:var(--ink-2);margin-top:20px">${esc(b.blurb)}</p>
    ${b.status !== "done" ? `<div style="margin:18px 0 0;font-size:.84rem;color:var(--ink-3)">نسبة الإنجاز ${arNum(b.progress)}٪</div><div class="progress"><i style="width:${b.progress}%"></i></div>` : ""}
    <div class="facts">
     <div class="fact"><span>الطبعة</span><b>${esc(b.edition)}</b></div>
     <div class="fact"><span>الحجم</span><b>${esc(b.pages)}</b></div>
     <div class="fact"><span>المستوى</span><b>${esc(b.level)}</b></div>
     <div class="fact"><span>الصيغة</span><b>${esc(b.format)}</b></div>
     <div class="fact"><span>نوع العمل</span><b>${esc(b.type)}</b></div>
     <div class="fact"><span>السعر</span><b style="color:var(--teal)">مجاني</b></div>
    </div>
    <div class="hero-actions">${dl}${sample}</div>
    ${b.pdf && !b.review ? `<p style="font-size:.82rem;color:var(--ink-2);margin-top:14px" id="dl-note"></p>` : ""}
    <p style="font-size:.8rem;color:var(--ink-3);margin-top:18px">إصدار خيري مجاني من مؤسسة إرتوفيا الخيرية، لا يُباع ولا يُشترى. <a href="rights.html" style="color:var(--accent)">شروط الترخيص</a></p>
   </div>`;
  $("#book-more").innerHTML = `
   <div class="mission" style="align-items:start">
    <div class="reveal"><span class="kicker">ما يميّزه</span><h2>لماذا هذا الكتاب؟</h2>
     <ul class="toc-book">${b.features.map((x) => `<li class="part" style="font-family:var(--sans);font-size:1rem;padding:10px 0;border-bottom:1px dashed var(--line);border-radius:0">✦ ${esc(x)}</li>`).join("")}</ul></div>
    <div class="reveal" data-delay="1"><span class="kicker">الفهرس المختصر</span><h2>المحتويات</h2>
     <ol class="toc-book">${b.contents.map((c) => c.part ? `<li class="part">${esc(c.part)}</li>` : `<li>${esc(c.t)}${c.note ? `<small>${esc(c.note)}</small>` : ""}</li>`).join("")}</ol></div>
   </div>`;
  const refs = await getJSON("data/references.json").then((r) => r[b.id]).catch(() => null);
  if (refs && refs.groups?.length) {
    const KIND = { book: "📚", web: "🌐", tool: "🛠️", images: "🖼️" };
    const item = (x) => {
      const lang = x.lang === "en" ? ' lang="en" dir="ltr"' : "";
      const t = x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener"${lang}>${esc(x.t)}</a>` : `<span${lang}>${esc(x.t)}</span>`;
      const meta = x.license ? `<small class="ref-meta"><span lang="en" dir="ltr">${x.by ? esc(x.by) + " · " : ""}${esc(x.license)}</span> · ويكيميديا كومنز</small>`
        : x.note ? `<small class="ref-meta">${esc(x.note)}</small>` : "";
      return `<li>${t}${meta}</li>`;
    };
    const sec = document.createElement("div");
    sec.className = "book-refs reveal";
    sec.id = "references";
    sec.innerHTML = `<span class="kicker">كل ما ساهم في بناء الكتاب</span><h2>المراجع والمصادر</h2>
     ${refs.intro ? `<p class="ref-intro">${esc(refs.intro)}</p>` : ""}
     ${refs.groups.map((g, i) => `<details class="ref-group"${i === 0 ? " open" : ""}><summary><span aria-hidden="true">${KIND[g.kind] || "✦"}</span> ${esc(g.title)} <small>${arNum(g.items.length)}</small></summary>
       ${g.note ? `<p class="ref-note">${esc(g.note)}</p>` : ""}<ol class="ref-list">${g.items.map(item).join("")}</ol></details>`).join("")}`;
    $("#book-more").appendChild(sec);
  }
  observe(document);
  const A = window.ACFAuth;
  if (b.review) { const n = document.createElement("p"); n.style.cssText = "font-size:.84rem;color:var(--ink-2);margin-top:14px"; n.textContent = "اكتمل الكتاب وهو الآن قيد المراجعة لدى الجهات المختصة، وسيُتاح تنزيله مجانًا للأعضاء فور اعتماده."; $(".hero-actions", $("#book"))?.after(n); }
  $("#dl")?.addEventListener("click", (e) => A.download("books", b.pdf, e.currentTarget));
  A.onChange((u) => { const n = $("#dl-note"); if (n) n.textContent = u ? "القراءة والتنزيل متاحان لك لأنك عضو مسجَّل. يتذكّر القارئ آخر صفحة وصلت إليها." : "القراءة والتنزيل مجانيان للأعضاء المسجّلين: أنشئ حسابك في دقيقة."; });
})();
