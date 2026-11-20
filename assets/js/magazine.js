/* مجلة المدار: الغلاف والملخص للجميع، والتنزيل للأعضاء */
(async () => {
  const { $, getJSON, esc, arNum, arDate, observe, ICON } = window.ACF;
  const A = window.ACFAuth;
  const root = $("#mag-root");
  const issues = (await getJSON("data/magazine.json")).sort((a, b) => b.date.localeCompare(a.date));
  const btn = (i, u) => u
    ? `<button class="btn btn-primary" data-pdf="${esc(i.pdf)}">نزّل العدد PDF ${ICON.arrow}</button>`
    : `<button class="btn btn-ghost" data-pdf="${esc(i.pdf)}">سجّل لتقرأ العدد كاملًا</button>`;
  function render(u) {
    const [last, ...rest] = issues;
    root.innerHTML = `
      <div class="issue-feature reveal">
        <div class="issue-cover" style="border-radius:var(--radius);box-shadow:0 40px 80px -40px rgba(0,0,0,.9)"><img src="${last.cover}" alt="غلاف العدد ${arNum(last.issue)} من مجلة المدار" width="720" height="1018"></div>
        <div>
          <span class="kicker">العدد الأحدث · ${arNum(last.issue)}</span>
          <h2 style="font-size:clamp(2rem,4vw,3rem);margin:10px 0 6px">${esc(last.title)}</h2>
          <p style="color:var(--accent);font-weight:600;font-size:.9rem;margin-bottom:14px">الجمعة ${arDate(last.date)} · ${esc(last.hijri)} · ${arNum(last.pages)} صفحات</p>
          <p style="color:var(--ink-2);font-size:1.04rem">${esc(last.summary)}</p>
          <ul class="toc-book" style="margin:18px 0 22px">${last.highlights.map((h) => `<li class="part" style="font-family:var(--sans);font-size:.96rem;padding:8px 0;border-bottom:1px dashed var(--line);border-radius:0">✦ ${esc(h)}</li>`).join("")}</ul>
          <div class="hero-actions">${btn(last, u)}</div>
          <p style="font-size:.8rem;color:var(--ink-3);margin-top:14px">${u ? "التنزيل متاح لك لأنك عضو مسجَّل." : "الملخص متاح للجميع، والعدد الكامل للأعضاء المسجّلين مجانًا."} جميع الحقوق محفوظة لمؤسسة إرتوفيا الخيرية. <a href="rights.html" style="color:var(--accent)">شروط الاستخدام</a></p>
        </div>
      </div>
      <div class="section-head" style="margin-bottom:24px"><div><h2 style="font-size:1.8rem;margin:0">أرشيف الأعداد</h2><p>مرتّبة من الأحدث إلى الأقدم</p></div></div>
      <div class="issues">${issues.map((i) => `<article class="issue reveal">
        <div class="issue-cover"><img src="${i.cover}" alt="غلاف العدد ${arNum(i.issue)}" loading="lazy" width="720" height="1018"></div>
        <div class="issue-body"><span class="date">العدد ${arNum(i.issue)} · ${arDate(i.date)}</span><h3>${esc(i.title)}</h3>
          <p>${esc(i.summary.slice(0, 150))}…</p>${btn(i, u)}</div></article>`).join("")}
        ${rest.length ? "" : `<div class="issue" style="display:grid;place-items:center;text-align:center;padding:30px;border-style:dashed;color:var(--ink-3)"><div><b style="display:block;color:var(--ink-2);font-size:1.1rem;margin-bottom:6px">العدد ${arNum(issues[0].issue + 1)}</b>يصدر الجمعة القادمة</div></div>`}</div>`;
    root.querySelectorAll("[data-pdf]").forEach((b) => b.addEventListener("click", () => A.download("magazine", b.dataset.pdf, b)));
    observe(root);
  }
  A.onChange(render);
})();
