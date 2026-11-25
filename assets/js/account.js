/* صفحة الحساب: دخول، تسجيل، استعادة كلمة المرور، الملف الشخصي ومقالاتي */
(() => {
  const { $, esc, arDate, toast, fieldsP } = window.ACF;
  const A = window.ACFAuth;
  const root = $("#acc-root");
  const qs = new URLSearchParams(location.search);
  const next = qs.get("next");
  let mode = qs.get("mode") === "register" ? "register" : "login";
  const STATUS = { pending: "بانتظار المراجعة", approved: "منشور", rejected: "لم يُقبل" };

  function authView() {
    $("#acc-title").textContent = mode === "register" ? "أنشئ حسابك المجاني" : "مرحبًا بعودتك";
    root.innerHTML = `<div class="auth-card reveal in">
      <div class="tabs" role="tablist"><button role="tab" data-m="login" aria-selected="${mode === "login"}">تسجيل الدخول</button><button role="tab" data-m="register" aria-selected="${mode === "register"}">حساب جديد</button></div>
      <form class="form" id="auth-form" novalidate>
        ${mode === "register" ? `<label for="f-name">الاسم الذي يظهر للآخرين<input id="f-name" name="name" required maxlength="40" autocomplete="nickname" placeholder="مثل: سارة العتيبي"></label>` : ""}
        <label for="f-email">البريد الإلكتروني<input id="f-email" name="email" type="email" required autocomplete="email" dir="ltr" placeholder="name@example.com"></label>
        <label for="f-pass">كلمة المرور<input id="f-pass" name="password" type="password" required minlength="6" autocomplete="${mode === "register" ? "new-password" : "current-password"}" dir="ltr"><span class="hint">ستة أحرف على الأقل.</span></label>
        ${mode === "register" ? `<label style="display:flex;gap:10px;align-items:flex-start;font-weight:400"><input type="checkbox" id="f-agree" required style="width:auto;margin-top:6px"> <span>قرأت <a href="terms.html" style="color:var(--accent)">شروط الاستخدام</a> و<a href="privacy.html" style="color:var(--accent)">سياسة الخصوصية</a>، وأتعهّد بالاحترام والأدب فيما أكتب.</span></label>` : ""}
        <div class="form-msg" id="f-msg" role="alert"></div>
        <button class="btn btn-primary" type="submit" style="justify-content:center">${mode === "register" ? "إنشاء الحساب" : "دخول"}</button>
        ${mode === "login" ? `<button class="link-btn" type="button" id="f-reset">نسيت كلمة المرور؟</button>` : ""}
      </form></div>`;
    root.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => { mode = b.dataset.m; authView(); }));
    const f = $("#auth-form"), msg = $("#f-msg");
    f.addEventListener("submit", async (e) => {
      e.preventDefault(); msg.className = "form-msg"; msg.textContent = "";
      const d = Object.fromEntries(new FormData(f));
      if (!/^\S+@\S+\.\S+$/.test(d.email || "")) return (msg.textContent = "اكتب بريدًا إلكترونيًا صحيحًا.");
      if ((d.password || "").length < 6) return (msg.textContent = "كلمة المرور قصيرة: ستة أحرف على الأقل.");
      if (mode === "register" && !(d.name || "").trim()) return (msg.textContent = "اكتب اسمك.");
      if (mode === "register" && !$("#f-agree").checked) return (msg.textContent = "وافق على الشروط للمتابعة.");
      const btn = f.querySelector("[type=submit]"); btn.disabled = true;
      try {
        if (mode === "register") {
          const r = await A.signUp(d.email, d.password, d.name.trim());
          if (r === "confirm") { msg.className = "form-msg ok"; msg.textContent = "أرسلنا رابط تفعيل إلى بريدك. افتحه ثم عُد لتسجيل الدخول."; btn.disabled = false; return; }
          toast("أهلًا بك في إرتوفيا");
        } else { await A.signIn(d.email, d.password); toast("تم تسجيل الدخول"); }
        if (next) location.href = next;
      } catch (err) { msg.textContent = err.message; }
      btn.disabled = false;
    });
    $("#f-reset")?.addEventListener("click", async () => {
      const email = $("#f-email").value.trim();
      if (!email) { msg.textContent = "اكتب بريدك أولًا ثم اضغط «نسيت كلمة المرور»."; return; }
      try { await A.reset(email); msg.className = "form-msg ok"; msg.textContent = "أرسلنا رابط استعادة كلمة المرور إلى بريدك."; } catch (err) { msg.textContent = err.message; }
    });
  }

  async function profileView(u) {
    $("#acc-title").textContent = `أهلًا، ${u.name}`;
    $("#acc-sub").textContent = "هذا ملفك في إرتوفيا: كل الكتب وأعداد المجلة والرواق مفتوحة لك.";
    const F = await fieldsP;
    root.innerHTML = `<div class="profile">
      <aside class="profile-card reveal in"><div class="big-avatar">${esc(u.name.trim().charAt(0))}</div>
        <h2 style="font-size:1.5rem;margin-bottom:4px">${esc(u.name)}</h2><div class="en" style="color:var(--ink-3);font-size:.84rem">${esc(u.email)}</div>
        <p style="margin:12px 0"><span class="badge-role">${u.role === "admin" ? "مشرف المؤسسة" : "عضو"}</span></p>
        <p style="color:var(--ink-3);font-size:.8rem">عضو منذ ${arDate((u.since || "").slice(0, 10))}</p>
        <div style="display:grid;gap:10px;margin-top:18px">
          <a class="btn btn-primary" style="justify-content:center" href="rawaq.html#write">اكتب مقالًا في الرواق</a>
          ${u.role === "admin" ? `<a class="btn btn-ghost" style="justify-content:center" href="admin.html">لوحة الإدارة</a>` : ""}
          <button class="btn btn-ghost" style="justify-content:center" id="out">تسجيل الخروج</button></div></aside>
      <div>
        <div class="panel reveal in"><h3>ما يتاح لك</h3><div class="fields" style="margin-top:14px">
          <a class="field" href="library.html" style="--c:var(--gold)"><h3>تنزيل الكتب</h3><span>كل كتب المكتبة بصيغة PDF</span></a>
          <a class="field" href="magazine.html" style="--c:var(--teal)"><h3>مجلة المدار</h3><span>عدد جديد كل جمعة</span></a>
          <a class="field" href="rawaq.html" style="--c:var(--blue)"><h3>الرواق</h3><span>اقرأ واكتب الأفكار</span></a></div></div>
        <div class="panel reveal in"><h3>ملفي</h3>
          <form class="form" id="p-form" style="margin-top:12px"><label for="p-name">الاسم<input id="p-name" name="name" maxlength="40" value="${esc(u.name)}"></label>
          <label for="p-bio">نبذة قصيرة عنك<textarea id="p-bio" name="bio" maxlength="300" style="min-height:90px">${esc(u.bio)}</textarea></label>
          <button class="btn btn-ghost" type="submit" style="justify-self:start">حفظ</button></form></div>
        <div class="panel reveal in"><h3>مقالاتي في الرواق</h3><ul class="rowlist" id="mine" style="margin-top:12px"><li>جارٍ التحميل…</li></ul></div>
      </div></div>`;
    $("#out").addEventListener("click", async () => { await A.signOut(); toast("خرجت من حسابك"); });
    $("#p-form").addEventListener("submit", async (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); try { await A.saveProfile({ name: d.name.trim() || u.name, bio: d.bio.trim() }); toast("حُفظ ملفك"); } catch (err) { toast(err.message); } });
    const mine = await A.mine();
    $("#mine").innerHTML = mine.length ? mine.map((a) => `<li><span><b>${esc(a.title)}</b> <small style="color:var(--ink-3)">· ${esc(F[a.field]?.name || "")} · ${arDate(a.created_at.slice(0, 10))}</small>${a.review_note ? `<br><small style="color:var(--ink-3)">ملاحظة المراجع: ${esc(a.review_note)}</small>` : ""}</span><span class="status ${a.status}">${STATUS[a.status]}</span></li>`).join("")
      : `<li style="color:var(--ink-3)">لم تكتب شيئًا بعد. <a class="link-arrow" href="rawaq.html#write">ابدأ أول مقال</a></li>`;
  }

  A.onChange((u) => (u ? profileView(u) : authView()));
})();
