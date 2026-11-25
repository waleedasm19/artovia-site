/* الحسابات والرواق والملفات المحمية.
   وضعان: live (Supabase: حسابات حقيقية، قاعدة بيانات، ملفات خاصة) و demo (معاينة داخل المتصفح فقط). */
(() => {
  "use strict";
  const C = window.ACF_CONFIG || {};
  const live = !!(C.supabaseUrl && C.supabaseKey && window.supabase);
  const listeners = new Set();
  let user = null, ready;

  const ERR = {
    "Invalid login credentials": "البريد أو كلمة المرور غير صحيحة.",
    "User already registered": "هذا البريد مسجَّل من قبل. سجّل الدخول بدلًا من ذلك.",
    "Email not confirmed": "فعّل حسابك أولًا من الرسالة التي وصلت بريدك.",
    "Password should be at least 6 characters.": "كلمة المرور قصيرة: ستة أحرف على الأقل."
  };
  const arErr = (e) => {
    const m = e?.message || "";
    if (ERR[m]) return ERR[m];
    if (/row-level security|JWT|not authorized|permission denied/i.test(m)) return "لا تملك صلاحية النشر الآن. سجّل الخروج ثم الدخول مجددًا وأعد المحاولة.";
    if (/cannot change own role/.test(m)) return "لا يمكنك تغيير صلاحيتك أنت.";
    if (/not authorized/.test(m)) return "هذه العملية للمشرفين فقط.";
    if (/foreign key/i.test(m)) return "ملفك الشخصي غير مكتمل. افتح صفحة حسابك واحفظ اسمك، ثم أعد الإرسال.";
    if (/articles_body_check/.test(m)) return "نص المقال يجب أن يكون بين ٣٠٠ و٣٠٠٠٠ حرف.";
    if (/articles_title_check/.test(m)) return "العنوان يجب أن يكون بين ٥ و١٦٠ حرفًا.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "تعذّر الاتصال بالخادم. تحقّق من الإنترنت وأعد المحاولة.";
    return m || "حدث خطأ غير متوقع، حاول مجددًا.";
  };
  const emit = () => listeners.forEach((f) => { try { f(user); } catch {} });

  /* ============ live: Supabase ============ */
  let sb;
  async function liveProfile(u) {
    if (!u) return null;
    let { data, error } = await sb.from("profiles").select("display_name,bio,role,created_at,country,avatar_url").eq("id", u.id).maybeSingle();
    if (error) ({ data } = await sb.from("profiles").select("display_name,bio,role,created_at").eq("id", u.id).maybeSingle()); // قبل إضافة الحقول الجديدة
    return { id: u.id, email: u.email, name: data?.display_name || u.user_metadata?.name || u.email.split("@")[0], bio: data?.bio || "", role: data?.role || "member", since: data?.created_at || u.created_at, country: data?.country || "", avatar: data?.avatar_url || "" };
  }
  const L = {
    async init() {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } });
      const { data } = await sb.auth.getSession();
      user = await liveProfile(data.session?.user);
      /* لا نستدعي Supabase داخل المستمع مباشرة: ذلك يقفل جلسة المصادقة فتتجمّد كل الطلبات بعده
         (ومنها إرسال المقال). نؤجّل العمل خارج المستمع، ونتجاهل تحديث الرمز إن لم يتغيّر المستخدم. */
      sb.auth.onAuthStateChange((e, s) => {
        const id = s?.user?.id || null;
        if (e === "TOKEN_REFRESHED" || (e === "SIGNED_IN" && id && id === user?.id)) return;
        setTimeout(async () => { user = await liveProfile(s?.user).catch(() => user); emit(); }, 0);
      });
    },
    async signUp(email, password, name) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, "account.html") } });
      if (error) throw new Error(arErr(error));
      return data.session ? "in" : "confirm";
    },
    async signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(arErr(error)); },
    async signOut() { await sb.auth.signOut(); user = null; emit(); },
    async reset(email) { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "account.html") }); if (error) throw new Error(arErr(error)); },
    async saveProfile({ name, bio, country }) {
      const row = { display_name: name, bio }; if (country !== undefined) row.country = country || null;
      const { error } = await sb.from("profiles").update(row).eq("id", user.id); if (error) throw new Error(arErr(error));
      user = { ...user, name, bio, ...(country !== undefined ? { country } : {}) }; emit();
    },
    async uploadAvatar(blob) {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error } = await sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error("تعذّر رفع الصورة: " + arErr(error));
      const url = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      const { error: e2 } = await sb.from("profiles").update({ avatar_url: url }).eq("id", user.id); if (e2) throw new Error(arErr(e2));
      const old = (user.avatar || "").split("/avatars/")[1]; if (old) sb.storage.from("avatars").remove([decodeURIComponent(old)]).catch(() => {});
      user = { ...user, avatar: url }; emit(); return url;
    },
    async removeAvatar() { const { error } = await sb.from("profiles").update({ avatar_url: null }).eq("id", user.id); if (error) throw new Error(arErr(error)); user = { ...user, avatar: "" }; emit(); },
    async publicWriters() { const { data, error } = await sb.rpc("public_writers"); if (error) throw new Error(arErr(error)); return data || []; },
    async adminUpdateWriter(id, w) { const { error } = await sb.rpc("admin_update_writer", { target: id, new_name: w.name, new_bio: w.bio, new_country: w.country || "", clear_avatar: !!w.clearAvatar }); if (error) throw new Error(arErr(error)); },
    async approved() { const { data, error } = await sb.from("articles_public").select("*").order("reviewed_at", { ascending: false }); if (error) throw new Error(arErr(error)); return data; },
    async article(id) { const { data } = await sb.from("articles_public").select("*").eq("id", id).maybeSingle(); return data; },
    async mine() { const { data } = await sb.from("articles").select("id,title,field,status,review_note,created_at").eq("author_id", user.id).order("created_at", { ascending: false }); return data || []; },
    async submit(a) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("انتهت جلستك. سجّل الدخول مجددًا ثم أعد الإرسال، ونصّك محفوظ.");
      const req = sb.from("articles").insert({ title: a.title, field: a.field, body: a.body });
      const late = new Promise((_, rej) => setTimeout(() => rej(new Error("تعذّر الاتصال بالخادم. تحقّق من الإنترنت وأعد المحاولة، ونصّك محفوظ.")), 20000));
      const { error } = await Promise.race([req, late]);
      if (error) throw new Error(arErr(error));
    },
    async pending() { const { data } = await sb.from("articles_admin").select("*").eq("status", "pending").order("created_at"); return data || []; },
    async review(id, status, note) { const { error } = await sb.from("articles").update({ status, review_note: note || null, reviewed_at: status === "pending" ? null : new Date().toISOString() }).eq("id", id); if (error) throw new Error(arErr(error)); },
    /* لوحة الإدارة: كل الصلاحيات محميّة في قاعدة البيانات (is_admin)، والواجهة تعرضها فقط */
    async adminArticles() { const { data, error } = await sb.from("articles_admin").select("*").order("created_at", { ascending: false }); if (error) throw new Error(arErr(error)); return data || []; },
    async editArticle(id, a) { const { error } = await sb.from("articles").update({ title: a.title, field: a.field, body: a.body }).eq("id", id); if (error) throw new Error(arErr(error)); },
    async deleteArticle(id) { const { error } = await sb.from("articles").delete().eq("id", id); if (error) throw new Error(arErr(error)); },
    async adminMembers() {
      const [{ data, error }, { data: extra }] = await Promise.all([sb.rpc("admin_members"), sb.from("profiles").select("id,bio,country,avatar_url")]);
      if (error) throw new Error(arErr(error));
      const x = Object.fromEntries((extra || []).map((p) => [p.id, p]));
      return (data || []).map((m) => ({ ...m, bio: x[m.id]?.bio || "", country: x[m.id]?.country || "", avatar_url: x[m.id]?.avatar_url || "" }));
    },
    async setRole(id, role) { const { error } = await sb.rpc("admin_set_role", { target: id, new_role: role }); if (error) throw new Error(arErr(error)); },
    async fileUrl(bucket, path, view) { const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, view ? 6 * 3600 : 600, view ? {} : { download: true }); if (error) throw new Error("الملف غير متاح الآن."); return data.signedUrl; }
  };

  /* ============ demo: داخل المتصفح فقط ============ */
  const KEY = "acf-demo-db";
  const now = () => new Date().toISOString();
  const seed = () => ({
    users: [], session: null, nextId: 3,
    articles: [
      { id: 1, author_id: "demo-1", author: "سارة (مثال)", title: "لماذا نحتاج أن نخطئ لنتعلّم؟", field: "math", status: "approved", created_at: "2026-11-18T10:00:00Z", reviewed_at: "2026-11-18T16:00:00Z",
        body: "هذا مقال مثال يوضّح شكل المقالات في الرواق.\n\nحين يحلّ الطالب مسألة رياضية ويخطئ، فإن الخطأ نفسه يكشف له الفكرة التي لم تستقر بعد. التعلّم ليس تكديس إجابات صحيحة، بل بناء خريطة ذهنية تعرف أين تقع الحفر فيها.\n\nفي الرواق نرحّب بالأفكار الجريئة ما دامت محترمة وصادقة." },
      { id: 2, author_id: "demo-2", author: "خالد (مثال)", title: "مدينة بلا إشارات مرور: تجربة ذهنية", field: "engineering", status: "approved", created_at: "2026-11-19T09:00:00Z", reviewed_at: "2026-11-19T12:00:00Z",
        body: "مقال مثال ثانٍ.\n\nتخيّل مدينة تتواصل فيها السيارات فيما بينها لحظة بلحظة، فتتفاوض على أولوية المرور بدل أن تنتظر ضوءًا أخضر. ما الذي سنكسبه؟ وما الذي قد نخسره إن تعطّل الاتصال؟\n\nأسئلة كهذه هي روح الرواق: نخرج من الصندوق ثم نعود إليه بفهم أعمق." }
    ]
  });
  const db = { get() { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } }, set(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} } };
  async function hash(s) { try { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); } catch { return s; } }
  const pub = (u) => u && { id: u.id, email: u.email, name: u.name, bio: u.bio || "", role: u.role, since: u.since, country: u.country || "", avatar: u.avatar || "" };
  const D = {
    async init() { const d = db.get(); user = pub(d.users.find((u) => u.id === d.session)); },
    async signUp(email, password, name) {
      const d = db.get(); email = email.trim().toLowerCase();
      if (password.length < 6) throw new Error(ERR["Password should be at least 6 characters."]);
      if (d.users.some((u) => u.email === email)) throw new Error(ERR["User already registered"]);
      const u = { id: "u" + Date.now(), email, name, pw: await hash(password), role: (C.adminEmails || []).includes(email) ? "admin" : "member", since: now() };
      d.users.push(u); d.session = u.id; db.set(d); user = pub(u); emit(); return "in";
    },
    async signIn(email, password) {
      const d = db.get(); const u = d.users.find((x) => x.email === email.trim().toLowerCase());
      if (!u || u.pw !== await hash(password)) throw new Error(ERR["Invalid login credentials"]);
      d.session = u.id; db.set(d); user = pub(u); emit();
    },
    async signOut() { const d = db.get(); d.session = null; db.set(d); user = null; emit(); },
    async reset() { throw new Error("استعادة كلمة المرور تعمل بعد ربط الموقع بقاعدة البيانات."); },
    async saveProfile({ name, bio, country }) { const d = db.get(); const u = d.users.find((x) => x.id === user.id); Object.assign(u, { name, bio }, country !== undefined ? { country } : {}); db.set(d); user = pub(u); emit(); },
    async uploadAvatar(blob) { const url = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); }); const d = db.get(); d.users.find((x) => x.id === user.id).avatar = url; db.set(d); user = pub(d.users.find((x) => x.id === user.id)); emit(); return url; },
    async removeAvatar() { const d = db.get(); d.users.find((x) => x.id === user.id).avatar = ""; db.set(d); user = pub(d.users.find((x) => x.id === user.id)); emit(); },
    async publicWriters() { const d = db.get(); return d.users.map((u) => { const arts = d.articles.filter((a) => a.author_id === u.id && a.status === "approved"); return arts.length ? { id: u.id, name: u.name, bio: u.bio || "", country: u.country || "", avatar_url: u.avatar || "", articles: arts.map((a) => ({ id: a.id, title: a.title, field: a.field })), last_published: arts.map((a) => a.reviewed_at).sort().pop() } : null; }).filter(Boolean); },
    async adminUpdateWriter(id, w) { const d = db.get(); const u = d.users.find((x) => x.id === id); Object.assign(u, { name: w.name, bio: w.bio, country: w.country }); if (w.clearAvatar) u.avatar = ""; db.set(d); },
    async approved() { return db.get().articles.filter((a) => a.status === "approved").sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at)); },
    async article(id) { return db.get().articles.find((a) => a.id == id && a.status === "approved") || null; },
    async mine() { return db.get().articles.filter((a) => a.author_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async submit(a) { const d = db.get(); d.articles.push({ id: d.nextId++, author_id: user.id, author: user.name, ...a, status: "pending", created_at: now() }); db.set(d); },
    async pending() { return db.get().articles.filter((a) => a.status === "pending"); },
    async review(id, status, note) { const d = db.get(); const a = d.articles.find((x) => x.id == id); Object.assign(a, { status, review_note: note || "", reviewed_at: status === "pending" ? null : now() }); db.set(d); },
    async adminArticles() { return db.get().articles.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async editArticle(id, x) { const d = db.get(); Object.assign(d.articles.find((a) => a.id == id), { title: x.title, field: x.field, body: x.body }); db.set(d); },
    async deleteArticle(id) { const d = db.get(); d.articles = d.articles.filter((a) => a.id != id); db.set(d); },
    async adminMembers() { const d = db.get(); return d.users.map((u) => ({ id: u.id, email: u.email, display_name: u.name, role: u.role, created_at: u.since, last_sign_in_at: null, bio: u.bio || "", country: u.country || "", avatar_url: u.avatar || "", articles: d.articles.filter((a) => a.author_id === u.id).length, approved: d.articles.filter((a) => a.author_id === u.id && a.status === "approved").length })); },
    async setRole(id, role) { if (id === user.id) throw new Error("لا يمكنك تغيير صلاحيتك أنت."); const d = db.get(); d.users.find((u) => u.id === id).role = role; db.set(d); },
    async fileUrl(bucket, path) { const u = `${bucket}/${path}`; const r = await fetch(u, { method: "HEAD" }).catch(() => null); if (!r || !r.ok) throw new Error("سيُتاح التنزيل بعد رفع الملف إلى المخزن."); return u; }
  };

  const impl = live ? L : D;
  ready = impl.init().catch((e) => console.error(e)).finally(emit);

  /* ============ واجهة عامة ============ */
  const A = {
    live, get user() { return user; }, ready,
    onChange(f) { listeners.add(f); ready.then(() => f(user)); return () => listeners.delete(f); },
    isAdmin: () => user?.role === "admin",
    /* أعلام الدول (flag-icons، رخصة MIT) وأسماؤها بالعربية من المتصفح نفسه */
    FLAGS: "ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cp cr cu cv cw cx cy cz de dg dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gb-eng gb-sct gb-wls gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu ic id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws xk ye yt za zm zw".split(" "),
    countryName(cc) { if (!cc) return ""; const sub = { "gb-sct": "اسكتلندا", "gb-eng": "إنجلترا", "gb-wls": "ويلز" }; if (sub[cc]) return sub[cc]; try { return new Intl.DisplayNames(["ar"], { type: "region" }).of(cc.toUpperCase()) || cc; } catch { return cc; } },
    flag(cc, h = 18) { return cc && A.FLAGS.includes(cc) ? `<img class="flag" src="assets/vendor/flags/${cc}.svg" alt="${A.countryName(cc)}" title="${A.countryName(cc)}" width="${Math.round(h * 4 / 3)}" height="${h}" loading="lazy">` : ""; },
    countryOptions(sel) { return '<option value="">— اختر دولتك —</option>' + A.FLAGS.filter((c) => c.length === 2).map((c) => [c, A.countryName(c)]).sort((a, b) => a[1].localeCompare(b[1], "ar")).map(([c, n]) => `<option value="${c}"${c === sel ? " selected" : ""}>${n}</option>`).join(""); },
    /* تصغير الصورة إلى مربع ٤٠٠×٤٠٠ قبل رفعها */
    async squareJpeg(file, size = 400) {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("الملف ليس صورة صالحة.")); i.src = URL.createObjectURL(file); });
      const s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas"); c.width = c.height = size;
      c.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      return new Promise((r) => c.toBlob(r, "image/jpeg", 0.88));
    },
    ...Object.fromEntries(Object.keys(impl).filter((k) => k !== "init").map((k) => [k, (...a) => impl[k](...a)])),
    /* بطاقة «للمسجّلين فقط» */
    gate(title, text) {
      const back = encodeURIComponent(location.pathname.split("/").pop() + location.search);
      return `<div class="gate reveal in"><div class="gate-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
        <h2>${title}</h2><p>${text}</p>
        <div class="hero-actions" style="justify-content:center"><a class="btn btn-primary" href="account.html?mode=register&next=${back}">أنشئ حسابًا مجانيًا</a><a class="btn btn-ghost" href="account.html?next=${back}">لديّ حساب</a></div></div>`;
    },
    /* تنزيل ملف محمي (كتاب أو عدد من المجلة) */
    async download(bucket, path, btn) {
      if (!user) { location.href = "account.html?mode=register&next=" + encodeURIComponent(location.pathname.split("/").pop() + location.search); return; }
      const old = btn?.innerHTML; if (btn) btn.innerHTML = "جارٍ التحضير…";
      try { const url = await impl.fileUrl(bucket, path); const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.append(a); a.click(); a.remove(); }
      catch (e) { window.ACF?.toast(e.message); }
      finally { if (btn) btn.innerHTML = old; }
    }
  };
  window.ACFAuth = A;

  /* زر الحساب في الترويسة */
  A.onChange((u) => {
    const b = document.querySelector(".account-btn"); if (!b) return;
    b.innerHTML = u ? (u.avatar ? `<img class="avatar" src="${u.avatar}" alt="">` : `<span class="avatar">${(u.name || "؟").trim().charAt(0)}</span>`) : b.dataset.icon;
    b.setAttribute("aria-label", u ? `حسابي: ${u.name}` : "تسجيل الدخول");
    b.classList.toggle("signed", !!u);
    /* زر «لوحة الإدارة» يظهر للمشرف وحده بجانب زر الحساب */
    let ad = document.querySelector(".admin-btn");
    if (u?.role === "admin" && !ad) {
      ad = document.createElement("a"); ad.className = "icon-btn admin-btn"; ad.href = "admin.html"; ad.title = "لوحة الإدارة"; ad.setAttribute("aria-label", "لوحة الإدارة");
      ad.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>';
      b.before(ad);
    } else if (u?.role !== "admin" && ad) ad.remove();
  });
  if (!live) document.addEventListener("DOMContentLoaded", () => {
    const n = document.createElement("div"); n.className = "demo-ribbon"; n.textContent = "وضع المعاينة: الحسابات والمقالات محفوظة في متصفحك فقط حتى يُربط الموقع بقاعدة البيانات";
    document.body.append(n);
  });
})();
