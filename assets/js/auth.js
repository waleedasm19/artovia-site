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
  const arErr = (e) => ERR[e?.message] || e?.message || "حدث خطأ غير متوقع، حاول مجددًا.";
  const emit = () => listeners.forEach((f) => { try { f(user); } catch {} });

  /* ============ live: Supabase ============ */
  let sb;
  async function liveProfile(u) {
    if (!u) return null;
    const { data } = await sb.from("profiles").select("display_name,bio,role,created_at").eq("id", u.id).maybeSingle();
    return { id: u.id, email: u.email, name: data?.display_name || u.user_metadata?.name || u.email.split("@")[0], bio: data?.bio || "", role: data?.role || "member", since: data?.created_at || u.created_at };
  }
  const L = {
    async init() {
      sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: true, detectSessionInUrl: true } });
      const { data } = await sb.auth.getSession();
      user = await liveProfile(data.session?.user);
      sb.auth.onAuthStateChange(async (_e, s) => { user = await liveProfile(s?.user); emit(); });
    },
    async signUp(email, password, name) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, "account.html") } });
      if (error) throw new Error(arErr(error));
      return data.session ? "in" : "confirm";
    },
    async signIn(email, password) { const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(arErr(error)); },
    async signOut() { await sb.auth.signOut(); user = null; emit(); },
    async reset(email) { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "account.html") }); if (error) throw new Error(arErr(error)); },
    async saveProfile({ name, bio }) { const { error } = await sb.from("profiles").update({ display_name: name, bio }).eq("id", user.id); if (error) throw new Error(arErr(error)); user = { ...user, name, bio }; emit(); },
    async approved() { const { data, error } = await sb.from("articles_public").select("*").order("reviewed_at", { ascending: false }); if (error) throw new Error(arErr(error)); return data; },
    async article(id) { const { data } = await sb.from("articles_public").select("*").eq("id", id).maybeSingle(); return data; },
    async mine() { const { data } = await sb.from("articles").select("id,title,field,status,review_note,created_at").eq("author_id", user.id).order("created_at", { ascending: false }); return data || []; },
    async submit(a) { const { error } = await sb.from("articles").insert({ title: a.title, field: a.field, body: a.body }); if (error) throw new Error(arErr(error)); },
    async pending() { const { data } = await sb.from("articles_admin").select("*").eq("status", "pending").order("created_at"); return data || []; },
    async review(id, status, note) { const { error } = await sb.from("articles").update({ status, review_note: note || null, reviewed_at: new Date().toISOString() }).eq("id", id); if (error) throw new Error(arErr(error)); },
    async fileUrl(bucket, path) { const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 600, { download: true }); if (error) throw new Error("الملف غير متاح الآن."); return data.signedUrl; }
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
  const pub = (u) => u && { id: u.id, email: u.email, name: u.name, bio: u.bio || "", role: u.role, since: u.since };
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
    async saveProfile({ name, bio }) { const d = db.get(); const u = d.users.find((x) => x.id === user.id); Object.assign(u, { name, bio }); db.set(d); user = pub(u); emit(); },
    async approved() { return db.get().articles.filter((a) => a.status === "approved").sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at)); },
    async article(id) { return db.get().articles.find((a) => a.id == id && a.status === "approved") || null; },
    async mine() { return db.get().articles.filter((a) => a.author_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async submit(a) { const d = db.get(); d.articles.push({ id: d.nextId++, author_id: user.id, author: user.name, ...a, status: "pending", created_at: now() }); db.set(d); },
    async pending() { return db.get().articles.filter((a) => a.status === "pending"); },
    async review(id, status, note) { const d = db.get(); const a = d.articles.find((x) => x.id == id); Object.assign(a, { status, review_note: note || "", reviewed_at: now() }); db.set(d); },
    async fileUrl(bucket, path) { const u = `${bucket}/${path}`; const r = await fetch(u, { method: "HEAD" }).catch(() => null); if (!r || !r.ok) throw new Error("سيُتاح التنزيل بعد رفع الملف إلى المخزن."); return u; }
  };

  const impl = live ? L : D;
  ready = impl.init().catch((e) => console.error(e)).finally(emit);

  /* ============ واجهة عامة ============ */
  const A = {
    live, get user() { return user; }, ready,
    onChange(f) { listeners.add(f); ready.then(() => f(user)); return () => listeners.delete(f); },
    isAdmin: () => user?.role === "admin",
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
    b.innerHTML = u ? `<span class="avatar">${(u.name || "؟").trim().charAt(0)}</span>` : b.dataset.icon;
    b.setAttribute("aria-label", u ? `حسابي: ${u.name}` : "تسجيل الدخول");
    b.classList.toggle("signed", !!u);
  });
  if (!live) document.addEventListener("DOMContentLoaded", () => {
    const n = document.createElement("div"); n.className = "demo-ribbon"; n.textContent = "وضع المعاينة: الحسابات والمقالات محفوظة في متصفحك فقط حتى يُربط الموقع بقاعدة البيانات";
    document.body.append(n);
  });
})();
