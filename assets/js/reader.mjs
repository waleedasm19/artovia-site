/* قارئ الكتب: reader.html?id=<معرّف الكتاب>
   يعرض الكتاب صفحة صفحة داخل الموقع والتطبيق (PDF.js)، مع الفهرس والتكبير والوضع الليلي،
   ويتذكّر آخر صفحة قرأها القارئ، ويحفظ الكتاب في الجهاز للقراءة دون إنترنت عند الطلب. */
import * as pdfjs from "../vendor/pdfjs/pdf.min.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;

const { $, getJSON, esc, arNum, toast } = window.ACF;
const A = window.ACFAuth;
const id = new URLSearchParams(location.search).get("id");
const ui = {
  pages: $("#r-pages"), load: $("#r-load"), msg: $("#r-msg"), prog: $("#r-prog"), foot: $("#r-foot"),
  page: $("#r-page"), total: $("#r-total"), toc: $("#r-toc"), tocPanel: $("#r-toc-panel"), tocList: $("#r-toc-list"),
  save: $("#r-save"), mode: $("#r-mode"), title: $("#r-title"), sub: $("#r-sub"), back: $("#r-back")
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* */ } }
};
const fail = (html) => { ui.msg.innerHTML = html; ui.prog.parentElement.hidden = true; };

const night = () => ui.pages.classList.toggle("night", store.get("acf-reader-night", "0") === "1");
ui.mode.addEventListener("click", () => { store.set("acf-reader-night", store.get("acf-reader-night", "0") === "1" ? "0" : "1"); night(); });
night();

(async () => {
  const books = await getJSON("data/books.json").catch(() => []);
  const b = books.find((x) => x.id === id);
  if (!b) { ui.title.textContent = "كتاب غير موجود"; fail('لم نجد هذا الكتاب. <a href="library.html">عودة إلى المكتبة</a>'); return; }
  document.title = `${b.title} · القارئ | مؤسسة إرتوفيا الخيرية`;
  ui.title.textContent = b.title; ui.sub.textContent = b.pages || "";
  ui.back.href = `book.html?id=${encodeURIComponent(b.id)}`;
  if (!b.pdf || b.review) { fail(`هذا الكتاب لم يُتح للقراءة بعد. <a href="${ui.back.href}">صفحة الكتاب</a>`); return; }

  await A.ready;
  if (!A.user) { ui.load.innerHTML = A.gate("القراءة مجانية للأعضاء", "أنشئ حسابك المجاني في دقيقة، ثم اقرأ الكتاب كاملًا هنا أو نزّله إلى جهازك."); return; }

  const KEY = `books/${b.pdf}`;
  const cache = "caches" in window ? await caches.open("acf-books").catch(() => null) : null;
  let cached = cache ? await cache.match(KEY).catch(() => null) : null;
  let src;
  if (cached) src = { data: new Uint8Array(await cached.arrayBuffer()) };
  else {
    if (!navigator.onLine) { fail("أنت غير متصل الآن، وهذا الكتاب غير محفوظ في جهازك. اتصل بالإنترنت ثم افتحه، واضغط زر الحفظ لتقرأه لاحقًا دون إنترنت."); return; }
    try { src = { url: await A.fileUrl("books", b.pdf, true), rangeChunkSize: 262144, disableAutoFetch: true }; }
    catch (e) { fail(esc(e.message)); return; }
  }
  const task = pdfjs.getDocument({ ...src, isEvalSupported: false });
  task.onProgress = ({ loaded, total }) => { if (total) ui.prog.style.width = `${Math.min(100, loaded / total * 100)}%`; };
  let doc;
  try { doc = await task.promise; } catch (e) { console.error(e); fail("تعذّر فتح الكتاب الآن. تحقّق من اتصالك ثم أعد المحاولة."); return; }

  /* ---------- الصفحات ---------- */
  ui.load.hidden = true; ui.foot.hidden = false; ui.pages.classList.add("on");
  const N = doc.numPages;
  const first = (await doc.getPage(1)).getViewport({ scale: 1 });
  const ratio = first.height / first.width;
  ui.total.textContent = arNum(N); ui.page.max = N;
  let zoom = +store.get("acf-reader-zoom", "1") || 1;
  const els = [];
  const frag = document.createDocumentFragment();
  for (let n = 1; n <= N; n++) {
    const d = document.createElement("div"); d.className = "r-page"; d.dataset.n = n;
    d.innerHTML = `<span class="r-num">${arNum(n)}</span>`;
    els.push(d); frag.append(d);
  }
  ui.pages.append(frag);
  const width = () => Math.round(Math.min(ui.pages.clientWidth - 16, 880) * zoom);
  function layout() {
    const w = width();
    ui.pages.style.setProperty("--pw", `${w}px`); ui.pages.style.setProperty("--ph", `${Math.round(w * ratio)}px`);
    ui.pages.classList.toggle("zoomed", zoom > 1);
  }
  layout();

  const drawn = new Map();               // n -> {w, task}
  const want = new Set();
  async function draw(n) {
    const el = els[n - 1], w = width();
    if (drawn.get(n)?.w === w) return;
    drawn.get(n)?.task?.cancel();
    const page = await doc.getPage(n);
    const v1 = page.getViewport({ scale: 1 });
    const dpr = Math.min(devicePixelRatio || 1, 2.5);
    const scale = Math.min(w / v1.width * dpr, 4096 / v1.width);
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
    const t = page.render({ canvasContext: c.getContext("2d", { alpha: false }), viewport: vp });
    drawn.set(n, { w, task: t });
    try { await t.promise; } catch { return; }
    if (!want.has(n)) { drawn.delete(n); return; }
    el.querySelector("canvas")?.remove(); el.append(c); el.classList.add("ready");
    page.cleanup();
  }
  function forget(n) {
    drawn.get(n)?.task?.cancel(); drawn.delete(n);
    const el = els[n - 1]; el.querySelector("canvas")?.remove(); el.classList.remove("ready");
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const n = +e.target.dataset.n;
      if (e.isIntersecting) { want.add(n); draw(n); } else { want.delete(n); forget(n); }
    }
  }, { root: ui.pages, rootMargin: "120% 0px" });
  els.forEach((el) => io.observe(el));

  /* ---------- الصفحة الحالية وحفظ الموضع ---------- */
  const SAVE = `acf-read:${b.id}`;
  let cur = 1, tick = 0;
  function current() {
    const y = ui.pages.scrollTop + ui.pages.clientHeight * .35;
    let lo = 0, hi = N - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (els[m].offsetTop <= y) lo = m; else hi = m - 1; }
    return lo + 1;
  }
  ui.pages.addEventListener("scroll", () => {
    if (tick) return;
    tick = requestAnimationFrame(() => {
      tick = 0; const n = current();
      if (n !== cur) { cur = n; if (document.activeElement !== ui.page) ui.page.value = n; store.set(SAVE, String(n)); }
    });
  }, { passive: true });
  const go = (n, smooth) => { n = Math.max(1, Math.min(N, n | 0)); ui.pages.scrollTo({ top: els[n - 1].offsetTop - 8, behavior: smooth ? "smooth" : "auto" }); };
  ui.page.addEventListener("change", () => go(+ui.page.value, true));
  ui.page.addEventListener("keydown", (e) => { if (e.key === "Enter") { ui.page.blur(); go(+ui.page.value, true); } });

  /* ---------- التكبير ---------- */
  const setZoom = (z) => {
    const keep = cur; zoom = Math.max(.6, Math.min(2.5, Math.round(z * 10) / 10)); store.set("acf-reader-zoom", String(zoom));
    layout(); go(keep); want.forEach((n) => draw(n));
  };
  $("#r-zin").addEventListener("click", () => setZoom(zoom + .2));
  $("#r-zout").addEventListener("click", () => setZoom(zoom - .2));
  let lastW = ui.pages.clientWidth;
  addEventListener("resize", () => { if (Math.abs(ui.pages.clientWidth - lastW) > 40) { lastW = ui.pages.clientWidth; setZoom(zoom); } });

  /* ---------- الفهرس ---------- */
  const outline = await doc.getOutline().catch(() => null);
  if (outline?.length) {
    const li = (o, depth) => `<li class="d${depth}"><button type="button" data-dest='${esc(JSON.stringify(o.dest))}'>${esc(o.title)}</button>${
      depth < 1 && o.items?.length ? `<ol>${o.items.map((x) => li(x, depth + 1)).join("")}</ol>` : ""}</li>`;
    ui.tocList.innerHTML = outline.map((o) => li(o, 0)).join("");
    ui.toc.disabled = false;
    ui.tocList.addEventListener("click", async (e) => {
      const bt = e.target.closest("button[data-dest]"); if (!bt) return;
      try {
        let dest = JSON.parse(bt.dataset.dest);
        if (typeof dest === "string") dest = await doc.getDestination(dest);
        const ref = dest?.[0];
        const idx = typeof ref === "number" ? ref : await doc.getPageIndex(ref);
        closeToc(); go(idx + 1);
      } catch { toast("تعذّر الانتقال إلى هذا الجزء."); }
    });
  } else ui.toc.hidden = true;
  const closeToc = () => { ui.tocPanel.hidden = true; ui.toc.setAttribute("aria-expanded", "false"); };
  ui.toc.addEventListener("click", () => { ui.tocPanel.hidden = !ui.tocPanel.hidden; ui.toc.setAttribute("aria-expanded", String(!ui.tocPanel.hidden)); });
  $("#r-toc-close").addEventListener("click", closeToc);

  /* ---------- الحفظ للقراءة دون إنترنت ---------- */
  const markSaved = () => { ui.save.hidden = false; ui.save.classList.add("saved"); ui.save.setAttribute("aria-label", "الكتاب محفوظ في جهازك: اضغط لحذفه"); };
  if (cache) {
    ui.save.hidden = false;
    if (cached) markSaved();
    ui.save.addEventListener("click", async () => {
      if (ui.save.classList.contains("saved")) {
        await cache.delete(KEY); cached = null; ui.save.classList.remove("saved");
        ui.save.setAttribute("aria-label", "حفظ الكتاب للقراءة دون إنترنت"); toast("حُذف الكتاب من جهازك."); return;
      }
      if (ui.save.classList.contains("busy")) return;
      ui.save.classList.add("busy"); toast("جارٍ حفظ الكتاب في جهازك…");
      try {
        const url = src.url || await A.fileUrl("books", b.pdf, true);
        const r = await fetch(url); if (!r.ok) throw new Error();
        await cache.put(KEY, new Response(await r.blob(), { headers: { "Content-Type": "application/pdf" } }));
        markSaved(); toast("تم الحفظ: يمكنك قراءة الكتاب الآن دون إنترنت.");
      } catch { toast("تعذّر الحفظ الآن. تأكّد من الاتصال ومن وجود مساحة كافية."); }
      finally { ui.save.classList.remove("busy"); }
    });
  }

  /* ---------- البدء ---------- */
  const saved = +store.get(SAVE, "1") || 1;
  if (saved > 1 && saved <= N) { go(saved); cur = saved; ui.page.value = saved; toast(`أكملنا من حيث توقفت: صفحة ${arNum(saved)}`); }
})();
