/* صفحة الإعدادات */
(async () => {
  const { $, $$, store, fieldsP, esc, toast } = window.ACF;
  const F = await fieldsP;
  function sync() {
    const s = store.get();
    $$(".seg").forEach((g) => $$("button", g).forEach((b) => b.setAttribute("aria-pressed", s[g.dataset.key] === b.dataset.v)));
    $("#set-ticker").checked = s.ticker;
    $$("#set-fields .filter").forEach((b) => b.setAttribute("aria-pressed", s.fields.includes(b.dataset.f)));
  }
  $("#set-fields").innerHTML = Object.values(F).map((f) => `<button class="filter" data-f="${f.id}" style="--c:${f.color}">${esc(f.name)}</button>`).join("");
  $$(".seg").forEach((g) => g.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    store.set({ [g.dataset.key]: b.dataset.v }); sync(); toast("حُفظ الإعداد");
  }));
  $("#set-ticker").addEventListener("change", (e) => { store.set({ ticker: e.target.checked }); toast(e.target.checked ? "الشريط ظاهر" : "الشريط مخفي"); });
  $("#set-fields").addEventListener("click", (e) => {
    const b = e.target.closest(".filter"); if (!b) return;
    const s = store.get(), f = b.dataset.f;
    store.set({ fields: s.fields.includes(f) ? s.fields.filter((x) => x !== f) : [...s.fields, f] }); sync(); toast("حُفظت مجالاتك");
  });
  $("#set-reset").addEventListener("click", () => { try { localStorage.removeItem("acf-settings"); } catch {} window.ACF.apply(); sync(); toast("استُعيدت الإعدادات الافتراضية"); });
  sync();
})();
