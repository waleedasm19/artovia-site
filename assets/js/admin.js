/* لوحة الإدارة: مقالات الرواق (قبول، رفض، تعديل، إلغاء نشر، حذف) والأعضاء وصلاحياتهم.
   كل عملية هنا محميّة في قاعدة البيانات (is_admin)، فلا يستطيع غير المشرف تنفيذها ولو فتح الصفحة. */
(() => {
  const { $, esc, arDate, arNum, toast, fieldsP } = window.ACF;
  const A = window.ACFAuth, root = $("#adm-root");
  const ST = { pending: "بانتظار المراجعة", approved: "منشور", rejected: "مرفوض" };
  let F = {}, arts = [], members = [], tab = "pending", me = null;
  try { tab = sessionStorage.getItem("acf-admin-tab") || "pending"; } catch {}
  const day = (t) => (t ? arDate(String(t).slice(0, 10)) : "—");
  const fname = (k) => F[k]?.name || "أفكار حرّة";
  const words = (t) => (String(t).trim().match(/\S+/g) || []).length;

  async function load() {
    root.innerHTML = '<div class="empty">جارٍ التحميل…</div>';
    try { [arts, members] = await Promise.all([A.adminArticles(), A.adminMembers()]); }
    catch (e) { root.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
    render();
  }
  const count = (s) => arts.filter((a) => a.status === s).length;

  function render() {
    const tabs = [["pending", `بانتظار المراجعة (${arNum(count("pending"))})`], ["approved", `المنشورة (${arNum(count("approved"))})`],
      ["rejected", `المرفوضة (${arNum(count("rejected"))})`], ["members", `الأعضاء (${arNum(members.length)})`]];
    root.innerHTML = `
      <div class="fields adm-stats" style="margin-bottom:26px">
        ${[["بانتظار المراجعة", count("pending"), "var(--gold)"], ["مقالات منشورة", count("approved"), "var(--teal)"], ["مرفوضة", count("rejected"), "#e88b93"], ["الأعضاء", members.length, "var(--blue)"]]
          .map(([l, n, c]) => `<div class="field" style="--c:${c}"><h3 style="font-size:2rem;margin:0">${arNum(n)}</h3><span>${l}</span></div>`).join("")}
      </div>
      <div class="tabs" role="tablist" style="flex-wrap:wrap">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${tab === k}">${l}</button>`).join("")}</div>
      <div id="adm-body">${tab === "members" ? membersView() : articlesView(tab)}</div>`;
  }

  function articlesView(s) {
    const list = arts.filter((a) => a.status === s);
    if (!list.length) return `<div class="empty">${s === "pending" ? "لا توجد مقالات بانتظار المراجعة الآن." : "لا شيء هنا بعد."}</div>`;
    return list.map((a) => `<div class="review-item" data-id="${a.id}">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><h3 style="margin:0">${esc(a.title)}</h3><span class="status ${a.status}">${ST[a.status]}</span></div>
      <p class="meta-line" style="margin:6px 0 12px">${esc(a.author || "عضو")} · ${esc(fname(a.field))} · ${arNum(words(a.body))} كلمة · أُرسل ${day(a.created_at)}${a.reviewed_at ? ` · رُوجع ${day(a.reviewed_at)}` : ""}</p>
      ${a.review_note ? `<p class="note teal" style="font-size:.86rem;margin:0 0 12px">ملاحظتك للكاتب: ${esc(a.review_note)}</p>` : ""}
      <div class="body">${esc(a.body)}</div>
      <div class="form" style="margin-top:14px">
        ${s !== "approved" ? `<label>ملاحظة للكاتب (اختيارية، تظهر في حسابه)<input class="note-in" maxlength="300" value="${esc(a.review_note || "")}"></label>` : ""}
        <div class="hero-actions" style="flex-wrap:wrap">
          ${s !== "approved" ? '<button class="btn btn-primary" data-act="approved">قبول ونشر</button>' : '<a class="btn btn-ghost" href="rawaq.html?id=' + a.id + '">عرضه في الرواق</a>'}
          ${s === "pending" ? '<button class="btn btn-ghost" data-act="rejected">رفض</button>' : ""}
          ${s === "approved" ? '<button class="btn btn-ghost" data-act="pending">إلغاء النشر</button>' : ""}
          ${s === "rejected" ? '<button class="btn btn-ghost" data-act="pending">إعادة إلى المراجعة</button>' : ""}
          <button class="btn btn-ghost" data-edit>تعديل</button>
          <button class="btn btn-ghost" data-del style="color:#e88b93">حذف</button>
        </div></div></div>`).join("");
  }

  function editor(card, a) {
    card.innerHTML = `<form class="form" data-save>
      <label>العنوان<input name="title" maxlength="160" value="${esc(a.title)}" required></label>
      <label>المجال<select name="field">${Object.values(F).map((f) => `<option value="${f.id}"${f.id === a.field ? " selected" : ""}>${esc(f.name)}</option>`).join("")}<option value="ideas"${a.field === "ideas" ? " selected" : ""}>أفكار حرّة</option></select></label>
      <label>نص المقال<textarea name="body" maxlength="30000" style="min-height:320px">${esc(a.body)}</textarea></label>
      <div class="hero-actions"><button class="btn btn-primary" type="submit">حفظ التعديل</button><button class="btn btn-ghost" type="button" data-cancel>إلغاء</button></div></form>`;
  }

  function membersView() {
    if (!members.length) return '<div class="empty">لا يوجد أعضاء بعد.</div>';
    return `<div class="panel" style="overflow-x:auto"><table class="adm-table"><thead><tr><th>العضو</th><th>البريد</th><th>انضم</th><th>آخر دخول</th><th>المقالات</th><th>الصلاحية</th><th>إجراءات</th></tr></thead><tbody>
      ${members.map((m) => `<tr data-uid="${m.id}"><td><span style="display:inline-flex;align-items:center;gap:8px">${m.avatar_url ? `<img src="${esc(m.avatar_url)}" alt="" width="28" height="28" style="border-radius:50%;object-fit:cover">` : ""}${esc(m.display_name || "—")} ${A.flag(m.country, 13)}</span></td><td class="en">${esc(m.email || "")}</td><td>${day(m.created_at)}</td><td>${day(m.last_sign_in_at)}</td>
        <td>${arNum(m.articles)} (${arNum(m.approved)} منشور)</td><td><span class="status ${m.role === "admin" ? "approved" : "pending"}">${m.role === "admin" ? "مشرف" : "عضو"}</span></td>
        <td>${m.id === me ? '<span style="color:var(--ink-3);font-size:.8rem">أنت</span>' : `<button class="btn btn-ghost" data-role="${m.role === "admin" ? "member" : "admin"}" style="padding:6px 14px;font-size:.82rem">${m.role === "admin" ? "إزالة الإشراف" : "ترقية إلى مشرف"}</button>`}
          <button class="btn btn-ghost" data-wedit style="padding:6px 14px;font-size:.82rem;margin-top:4px">بيانات الكاتب</button></td></tr>`).join("")}
      </tbody></table></div>
      <p style="color:var(--ink-3);font-size:.84rem;margin-top:12px">المشرف يملك الصلاحيات نفسها التي لديك. لا يمكنك تغيير صلاحيتك أنت حتى لا تفقد الإدارة بالخطأ.</p>`;
  }

  /* تأكيد بنقرتين بدل نوافذ المتصفح المنبثقة */
  function confirmTwice(b, text) {
    if (b.dataset.armed) return true;
    const old = b.textContent; b.dataset.armed = "1"; b.textContent = text;
    setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = old; } }, 3500);
    return false;
  }
  async function act(b, fn, ok) {
    b.disabled = true;
    try { await fn(); toast(ok); await load(); } catch (e) { toast(e.message); b.disabled = false; }
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) { tab = t.dataset.tab; try { sessionStorage.setItem("acf-admin-tab", tab); } catch {} render(); return; }
    const card = e.target.closest(".review-item"); const id = card?.dataset.id; const a = arts.find((x) => String(x.id) === id);
    let b;
    if ((b = e.target.closest("[data-act]")) && a) {
      const s = b.dataset.act, note = card.querySelector(".note-in")?.value.trim() || a.review_note || "";
      return act(b, () => A.review(a.id, s, s === "approved" && !card.querySelector(".note-in") ? a.review_note : note),
        s === "approved" ? "نُشر المقال في الرواق" : s === "rejected" ? "رُفض المقال" : "أُعيد المقال إلى المراجعة");
    }
    if (e.target.closest("[data-edit]") && a) return editor(card, a);
    if (e.target.closest("[data-cancel]")) return render();
    if ((b = e.target.closest("[data-del]")) && a) { if (!confirmTwice(b, "اضغط مجددًا للحذف النهائي")) return; return act(b, () => A.deleteArticle(a.id), "حُذف المقال"); }
    if ((b = e.target.closest("[data-wedit]"))) {
      const tr = b.closest("tr"), m = members.find((x) => x.id === tr.dataset.uid); if (!m || tr.nextElementSibling?.classList.contains("w-edit")) return;
      tr.insertAdjacentHTML("afterend", `<tr class="w-edit"><td colspan="7"><form class="form" data-wsave="${m.id}" style="padding:8px 0">
        <label>الاسم الظاهر<input name="name" maxlength="40" value="${esc(m.display_name || "")}"></label>
        <label>الدولة<select name="country">${A.countryOptions(m.country)}</select></label>
        <label>النبذة<textarea name="bio" maxlength="600" style="min-height:80px">${esc(m.bio || "")}</textarea></label>
        ${m.avatar_url ? '<label style="flex-direction:row;align-items:center;gap:8px;display:flex"><input type="checkbox" name="clear" style="width:auto"> إزالة صورته</label>' : ""}
        <div class="hero-actions"><button class="btn btn-primary" type="submit">حفظ</button><button class="btn btn-ghost" type="button" data-cancel>إلغاء</button></div></form></td></tr>`);
      return;
    }
    if ((b = e.target.closest("[data-role]"))) {
      const uid = b.closest("tr").dataset.uid, role = b.dataset.role;
      if (role === "admin" && !confirmTwice(b, "اضغط مجددًا للتأكيد")) return;
      return act(b, () => A.setRole(uid, role), role === "admin" ? "أصبح العضو مشرفًا" : "أُزيل الإشراف");
    }
  });
  root.addEventListener("submit", (e) => {
    const wf = e.target.closest("[data-wsave]");
    if (wf) { e.preventDefault(); const d = Object.fromEntries(new FormData(wf));
      return act(wf.querySelector("[type=submit]"), () => A.adminUpdateWriter(wf.dataset.wsave, { name: d.name.trim(), bio: d.bio.trim(), country: d.country, clearAvatar: !!d.clear }), "حُفظت بيانات الكاتب"); }
    const f = e.target.closest("[data-save]"); if (!f) return; e.preventDefault();
    const id = f.closest(".review-item").dataset.id, d = Object.fromEntries(new FormData(f));
    if (d.title.trim().length < 5) return toast("العنوان قصير: خمسة أحرف على الأقل.");
    if (d.body.trim().length < 300) return toast("النص قصير: ٣٠٠ حرف على الأقل.");
    act(f.querySelector("[type=submit]"), () => A.editArticle(id, { title: d.title.trim(), field: d.field, body: d.body.trim() }), "حُفظ التعديل");
  });

  let shown;
  A.onChange(async (u) => {
    const key = u ? `${u.id}:${u.role}` : null; if (shown !== undefined && shown === key) return; shown = key;
    if (!u) { root.innerHTML = A.gate("سجّل الدخول أولًا", "هذه اللوحة لمشرفي المؤسسة."); return; }
    if (u.role !== "admin") { root.innerHTML = '<div class="empty">هذه الصفحة لمشرفي المؤسسة فقط.</div>'; return; }
    me = u.id; F = await fieldsP; load();
  });
})();
