/* شريط «اقتباس اليوم»: اقتباسات قصيرة منسوبة من «مقالات عالمية» و«الرواق»، تتبدّل بانتقال سينمائي.
   البيانات: data/quotes.json (يختارها كل يوم tools/pick_quotes.py من data/quotes-pool.json). */
(() => {
  "use strict";
  const bar = document.querySelector(".qbar"); if (!bar) return;
  const stage = bar.querySelector(".qbar-stage"), count = bar.querySelector(".qbar-count");
  const root = document.documentElement, BASE = root.dataset.base || "";
  const AR = "٠١٢٣٤٥٦٧٨٩", ar = (n) => String(n).replace(/\d/g, (d) => AR[d]);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = () => root.dataset.motion === "reduce";
  const show = () => { try { return JSON.parse(localStorage.getItem("acf-settings") || "{}").quotes !== false; } catch { return true; } };

  let items = [], i = 0, timer = 0, start = 0, left = 0, dur = 0, hold = false;
  document.addEventListener("acf:settings", (e) => { bar.hidden = e.detail.quotes === false || !items.length; });

  function slide(q, n) {
    const words = esc(q.q).split(/\s+/).map((w, k) => `<span style="--i:${k}">${w}</span>`).join(" ");
    const kind = q.kind === "rawaq" ? "الرواق" : "مقالات عالمية";
    return `<a class="qbar-slide" href="${BASE}${esc(q.href)}" aria-label="${esc(q.q)} — ${esc(q.by)}، من «${esc(q.src)}»">
      <blockquote class="qbar-q" aria-hidden="true">${words}</blockquote>
      <span class="qbar-by" aria-hidden="true" style="--i:${n}"><b>${esc(q.by)}</b><span>«${esc(q.src)}»</span><em>${kind}</em></span></a>`;
  }

  function go(k) {
    if (!items.length) return;
    i = (k + items.length) % items.length;
    const q = items[i], n = q.q.split(/\s+/).length;
    const old = stage.querySelector(".qbar-slide:not(.out)");
    if (old) { old.classList.add("out"); setTimeout(() => old.remove(), reduced() ? 50 : 900); }
    stage.insertAdjacentHTML("beforeend", slide(q, n));
    count.textContent = `${ar(i + 1)} / ${ar(items.length)}`;
    dur = Math.min(14000, 6500 + n * 260); left = dur; arm();
  }

  function arm() {
    clearTimeout(timer);
    if (hold) return;
    start = performance.now();
    timer = setTimeout(() => go(i + 1), left);
  }
  const setHold = (v) => {
    if (v === hold) return;
    if (v) { left = Math.max(0, left - (performance.now() - start)); clearTimeout(timer); }
    hold = v; if (!v) arm();
  };

  bar.addEventListener("pointerenter", () => setHold(true));
  bar.addEventListener("pointerleave", () => setHold(false));
  bar.addEventListener("focusin", () => setHold(true));
  bar.addEventListener("focusout", (e) => { if (!bar.contains(e.relatedTarget)) setHold(false); });
  document.addEventListener("visibilitychange", () => setHold(document.hidden));

  fetch(`${BASE}data/quotes.json`, { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    items = (d.items || []).filter((q) => q.q && q.href);
    if (!items.length) return;
    bar.hidden = !show();
    // يبدأ كل زائر من موضع مختلف قليلًا في اليوم، فلا يرى الجميع الاقتباس نفسه أولًا
    go(Math.floor(Math.random() * items.length));
  }).catch(() => {});
})();
