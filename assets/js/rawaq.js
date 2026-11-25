/* الرواق: قراءة المقالات المعتمدة، وكتابة مقال جديد يُرسل للمراجعة */
(() => {
  const { $, $$, esc, arDate, toast, fieldsP, observe } = window.ACF;
  const A = window.ACFAuth;
  const root = $("#rawaq-root");
  const para = (t) => esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

  async function list(F) {
    const items = await A.approved();
    const id = new URLSearchParams(location.search).get("id");
    if (id) return reader(F, id);
    root.innerHTML = `
      <div class="section-head" style="margin-bottom:26px"><div><h2 style="font-size:2rem;margin:0">أحدث ما كُتب</h2><p>${items.length ? `${items.length} مقالًا منشورًا` : ""}</p></div>
        <a class="btn btn-primary" href="#write">اكتب مقالًا</a></div>
      <div class="articles">${items.length ? items.map((a) => `<a class="article-card reveal" href="rawaq.html?id=${a.id}">
        <span class="chip" style="--c:${F[a.field]?.color}">${esc(F[a.field]?.name || "أفكار")}</span>
        <h3>${esc(a.title)}</h3><p>${esc(a.body.slice(0, 180))}…</p>
        <div class="by"><span>${esc(a.author || "عضو")}</span><span>${arDate((a.reviewed_at || a.created_at).slice(0, 10))}</span></div></a>`).join("")
        : `<div class="empty" style="grid-column:1/-1">لم يُنشر شيء بعد. كن أول من يكتب في الرواق.</div>`}</div>
      ${writer(F)}`;
    bindWriter();
    observe(root);
    if (location.hash === "#write") setTimeout(() => $("#write")?.scrollIntoView({ behavior: "smooth" }), 200);
  }

  async function reader(F, id) {
    const a = await A.article(id);
    if (!a) { root.innerHTML = '<div class="empty">هذا المقال غير موجود أو لم يُنشر بعد. <a class="link-arrow" href="rawaq.html">عودة إلى الرواق</a></div>'; return; }
    document.title = `${a.title} | الرواق`;
    root.innerHTML = `<article class="reader reveal in">
      <a class="link-arrow" href="rawaq.html" style="margin-bottom:24px">← كل المقالات</a>
      <div style="margin-top:18px"><span class="chip" style="--c:${F[a.field]?.color}">${esc(F[a.field]?.name || "أفكار")}</span></div>
      <h1 style="margin-top:14px">${esc(a.title)}</h1>
      <p class="meta-line">بقلم ${esc(a.author || "عضو")} · ${arDate((a.reviewed_at || a.created_at).slice(0, 10))}</p>
      <div class="body">${para(a.body)}</div>
      <div class="note teal" style="margin-top:40px;font-size:.88rem">آراء الكتّاب في الرواق تعبّر عنهم، وتُنشر بعد مراجعة تتحقق من الأدب والاحترام. للإبلاغ عن مقال راسلنا على <span class="en">artoviacentr@gmail.com</span></div>
    </article>`;
  }

  function writer(F) {
    return `<div class="panel" id="write" style="margin-top:64px;scroll-margin-top:100px;padding:clamp(22px,4vw,40px)">
      <span class="kicker">اكتب في الرواق</span><h2 style="font-size:1.8rem">مقال جديد</h2>
      <p style="color:var(--ink-2);font-size:.92rem">اكتب بحرية وجرأة، وبأدب واحترام. يصل مقالك إلى فريق المؤسسة للمراجعة، ويُنشر بعد الموافقة عليه، وتجد حالته في <a href="account.html" style="color:var(--accent)">حسابك</a>.</p>
      <form class="form" id="w-form" novalidate>
        <label for="w-title">العنوان<input id="w-title" name="title" maxlength="120" required placeholder="عنوان واضح وجذّاب"></label>
        <label for="w-field">المجال<select id="w-field" name="field">${Object.values(F).map((f) => `<option value="${f.id}">${esc(f.name)}</option>`).join("")}<option value="ideas">أفكار حرّة</option></select></label>
        <label for="w-body">نص المقال<textarea id="w-body" name="body" maxlength="20000" required placeholder="افصل بين الفقرات بسطر فارغ."></textarea><span class="hint" id="w-count">٠ كلمة · بين ١٥٠ و٣٠٠٠ كلمة</span></label>
        <div class="form-msg" id="w-msg" role="alert"></div>
        <button class="btn btn-primary" type="submit" style="justify-self:start">أرسل للمراجعة</button>
      </form></div>`;
  }
  function bindWriter() {
    const f = $("#w-form"); if (!f) return;
    const words = () => ($("#w-body").value.trim().match(/\S+/g) || []).length;
    /* مسودة محفوظة في المتصفح حتى لا يضيع النص إن انقطع الاتصال أو أُعيد تحميل الصفحة */
    const DK = "acf-rawaq-draft";
    const saveDraft = () => { try { localStorage.setItem(DK, JSON.stringify({ title: $("#w-title").value, field: $("#w-field").value, body: $("#w-body").value })); } catch {} };
    try { const dr = JSON.parse(localStorage.getItem(DK) || "null"); if (dr) { $("#w-title").value = dr.title || ""; if (dr.field) $("#w-field").value = dr.field; $("#w-body").value = dr.body || ""; } } catch {}
    const count = () => ($("#w-count").textContent = `${window.ACF.arNum(words())} كلمة · بين ١٥٠ و٣٠٠٠ كلمة`);
    count();
    f.addEventListener("input", () => { count(); saveDraft(); });
    const btn = f.querySelector('button[type="submit"]'); const label = btn.textContent;
    const say = (t, ok) => { const msg = $("#w-msg"); msg.className = "form-msg" + (ok ? " ok" : ""); msg.textContent = t; msg.scrollIntoView({ behavior: "smooth", block: "center" }); if (!ok) toast(t); };
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (btn.disabled) return;
      const d = Object.fromEntries(new FormData(f)); const n = words();
      if ((d.title || "").trim().length < 5) return say("اكتب عنوانًا من خمسة أحرف على الأقل.");
      if (n < 150) return say(`المقال قصير: ${window.ACF.arNum(n)} كلمة، والحد الأدنى ١٥٠ كلمة.`);
      if (n > 3000) return say("المقال طويل: ٣٠٠٠ كلمة على الأكثر.");
      btn.disabled = true; btn.textContent = "جارٍ الإرسال…"; $("#w-msg").textContent = "";
      try {
        await A.submit({ title: d.title.trim(), field: d.field, body: d.body.trim() });
        f.reset(); count(); try { localStorage.removeItem(DK); } catch {}
        say("وصل مقالك. سيُنشر بعد المراجعة، وتتابع حالته من حسابك.", true); toast("أُرسل المقال للمراجعة");
      } catch (err) { say(err.message || "حدث خطأ غير متوقع، حاول مجددًا."); }
      finally { btn.disabled = false; btn.textContent = label; }
    });
  }

  let shown; // لا نعيد رسم الصفحة (ومسح النموذج) إن لم يتغيّر المستخدم فعلًا
  A.onChange(async (u) => {
    const key = u?.id || null;
    if (shown !== undefined && shown === key) return;
    shown = key;
    const F = await fieldsP;
    if (!u) { root.innerHTML = A.gate("الرواق مفتوح للأعضاء", "سجّل مجانًا لتقرأ مقالات الأعضاء وتكتب أفكارك فيه. لن يستغرق ذلك أكثر من دقيقة."); return; }
    list(F);
  });
})();
