/* لوحة المشرف: قبول أو رفض مقالات الرواق */
(() => {
  const { $, esc, arDate, toast, fieldsP } = window.ACF;
  const A = window.ACFAuth, root = $("#rev-root");
  async function render() {
    const F = await fieldsP;
    const items = await A.pending();
    root.innerHTML = items.length ? items.map((a) => `<div class="review-item" data-id="${a.id}">
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><h3 style="margin:0">${esc(a.title)}</h3><span class="status pending">بانتظار المراجعة</span></div>
      <p class="meta-line" style="margin:6px 0 12px">${esc(a.author || "")} · ${esc(F[a.field]?.name || "أفكار حرّة")} · ${arDate(a.created_at.slice(0, 10))}</p>
      <div class="body">${esc(a.body)}</div>
      <div class="form" style="margin-top:14px"><label>ملاحظة للكاتب (اختيارية)<input class="note-in" maxlength="300"></label>
      <div class="hero-actions"><button class="btn btn-primary" data-act="approved">قبول ونشر</button><button class="btn btn-ghost" data-act="rejected">رفض</button></div></div></div>`).join("")
      : '<div class="empty">لا توجد مقالات بانتظار المراجعة الآن.</div>';
  }
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const card = b.closest(".review-item");
    try { await A.review(card.dataset.id, b.dataset.act, card.querySelector(".note-in").value.trim()); toast(b.dataset.act === "approved" ? "نُشر المقال في الرواق" : "رُفض المقال"); render(); }
    catch (err) { toast(err.message); }
  });
  A.onChange((u) => {
    if (!u) { root.innerHTML = A.gate("سجّل الدخول أولًا", "هذه اللوحة لمشرفي المؤسسة."); return; }
    if (u.role !== "admin") { root.innerHTML = '<div class="empty">هذه الصفحة لمشرفي المؤسسة فقط.</div>'; return; }
    render();
  });
})();
