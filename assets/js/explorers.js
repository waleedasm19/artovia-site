/* مستكشفات الصفحة الرئيسية: كل مستكشف يُحمَّل عند فتحه أول مرة فقط.
   الصور: صور حقيقية مرخّصة من ويكيميديا كومنز (data/explore/credits.json)، وخرائط الأرض من Solar System Scope (CC BY 4.0).
   البيانات الحية: موقع المحطة من wheretheiss.at، والزلازل من هيئة المسح الجيولوجي الأمريكية USGS (ملك عام). */
(() => {
  "use strict";
  const AR = "٠١٢٣٤٥٦٧٨٩";
  const ar = (v) => String(v).replace(/\d/g, (d) => AR[d]).replace(/\./g, "٫");
  const fmt = (n, d = 0) => ar(Number(n).toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/,/g, "٬"));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const json = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  let creditsP;
  const credits = () => (creditsP ||= json("data/explore/credits.json").catch(() => ({})));
  const photo = (c, alt, cls = "") => c ? `<figure class="xp-photo ${cls}"><img src="${esc(c.src)}" alt="${esc(alt)}" loading="lazy" decoding="async">
    <figcaption>الصورة: <a href="${esc(c.url)}" target="_blank" rel="noopener" lang="en">${esc(c.credit)}</a> · ويكيميديا كومنز</figcaption></figure>` : "";
  const img = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

  /* ---------- الجدول الدوري ---------- */
  const CATS = {
    alkali: ["فلزات قلوية", "#ff7a59"], alkaline: ["فلزات قلوية ترابية", "#ffb347"], transition: ["فلزات انتقالية", "#e7c35a"],
    post: ["فلزات ضعيفة", "#9cc5a1"], metalloid: ["أشباه فلزات", "#5fc8b5"], nonmetal: ["لافلزات", "#5aa9e6"],
    halogen: ["هالوجينات", "#7f9cf5"], noble: ["غازات نبيلة", "#b18cf0"], lanthanide: ["لانثانيدات", "#f28cb1"], actinide: ["أكتينيدات", "#e86f8a"],
  };
  const STATE = { gas: "غاز", liquid: "سائل", solid: "صلب", unknown: "غير معروفة (يعيش لحظات)" };
  function place(z) {
    if (z >= 57 && z <= 71) return [z - 57 + 3, 9];
    if (z >= 89 && z <= 103) return [z - 89 + 3, 10];
    const P = [[1, 1, 1], [2, 1, 18], [3, 2, 1], [4, 2, 2], [5, 2, 13], [11, 3, 1], [12, 3, 2], [13, 3, 13], [19, 4, 1], [37, 5, 1], [55, 6, 1], [56, 6, 2], [72, 6, 4], [87, 7, 1], [88, 7, 2], [104, 7, 4]];
    let best = P[0];
    for (const p of P) if (p[0] <= z) best = p;
    return [best[2] + (z - best[0]), best[1]];
  }
  async function periodic(root) {
    const [els, cr] = await Promise.all([json("data/explore/elements.json"), credits()]);
    root.innerHTML = `<div class="xp-pt-wrap"><div class="xp-pt" role="grid" aria-label="الجدول الدوري للعناصر">${els.map((e) => {
      const [g, p] = place(e.z);
      return `<button type="button" class="xp-el${cr["el-" + e.s] ? " has-photo" : ""}" data-z="${e.z}" data-c="${e.c}" style="--g:${g};--p:${p};--c:${CATS[e.c][1]}" aria-label="${esc(e.ar)}، العدد الذري ${ar(e.z)}"><small>${ar(e.z)}</small><b lang="en">${e.s}</b><span>${esc(e.ar)}</span></button>`;
    }).join("")}<div class="xp-pt-gap" style="--g:3;--p:6" aria-hidden="true">٥٧–٧١</div><div class="xp-pt-gap" style="--g:3;--p:7" aria-hidden="true">٨٩–١٠٣</div></div></div>
    <div class="xp-legend">${Object.entries(CATS).map(([k, [n, c]]) => `<button type="button" data-cat="${k}" style="--c:${c}">${n}</button>`).join("")}</div>
    <div class="xp-card xp-el-card" aria-live="polite"></div>`;
    const card = root.querySelector(".xp-el-card");
    const show = (z) => {
      const e = els[z - 1], c = cr["el-" + e.s];
      root.querySelectorAll(".xp-el.on").forEach((b) => b.classList.remove("on"));
      root.querySelector(`.xp-el[data-z="${z}"]`).classList.add("on");
      card.style.setProperty("--c", CATS[e.c][1]);
      card.innerHTML = `${photo(c, `عيّنة من عنصر ${e.ar}`)}<div class="xp-card-body">
        <div class="xp-el-big"><small>${ar(e.z)}</small><b lang="en">${e.s}</b></div>
        <h3>${esc(e.ar)} <span lang="en">${e.en}</span></h3>
        <dl class="xp-facts"><div><dt>العدد الذري</dt><dd>${ar(e.z)}</dd></div><div><dt>الكتلة الذرية</dt><dd>${ar(e.m)}</dd></div>
        <div><dt>العائلة</dt><dd>${CATS[e.c][0]}</dd></div><div><dt>الحالة في حرارة الغرفة</dt><dd>${STATE[e.st]}</dd></div></dl>
        <p>${esc(e.f || "اضغط عنصرًا آخر لتقارن. العناصر المعلَّمة بنقطة صغيرة لها صورة حقيقية لعيّنة منها.")}</p>
        ${e.m.startsWith("[") ? '<p class="xp-note">الرقم بين قوسين كتلة أكثر نظائره استقرارًا، لأنه عنصر مشعّ.</p>' : ""}</div>`;
    };
    root.addEventListener("click", (ev) => {
      const b = ev.target.closest(".xp-el"); if (b) return show(+b.dataset.z);
      const l = ev.target.closest("[data-cat]");
      if (l) {
        const on = !l.classList.contains("on");
        root.querySelectorAll("[data-cat]").forEach((x) => x.classList.remove("on"));
        l.classList.toggle("on", on);
        root.querySelector(".xp-pt").dataset.only = on ? l.dataset.cat : "";
      }
    });
    show(6);
  }

  /* ---------- خريطة الأرض (نهار/ليل حقيقيان) ---------- */
  function subsolar(t) {
    const d = (t - Date.UTC(2000, 0, 1, 12)) / 864e5, rad = Math.PI / 180;
    const g = (357.529 + 0.98560028 * d) * rad, q = 280.459 + 0.98564736 * d;
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad, e = (23.439 - 0.00000036 * d) * rad;
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / rad;
    const gmst = (280.46061837 + 360.98564736629 * d) % 360;
    let lon = ra - gmst; lon = ((lon + 540) % 360) - 180;
    return [dec / rad, lon];
  }
  async function earthMap(canvas) {
    const [day, night] = await Promise.all([img("assets/img/solar/earth_daymap.jpg"), img("assets/img/solar/earth_nightmap.jpg")]);
    const W = 1024, H = 512, base = document.createElement("canvas"); base.width = W; base.height = H;
    const bx = base.getContext("2d", { willReadFrequently: true });
    bx.drawImage(day, 0, 0, W, H); const D = bx.getImageData(0, 0, W, H);
    bx.drawImage(night, 0, 0, W, H); const N = bx.getImageData(0, 0, W, H);
    const out = bx.createImageData(W, H);
    function shade(t = Date.now()) {
      const [sd, sl] = subsolar(t), r = Math.PI / 180, sdS = Math.sin(sd * r), sdC = Math.cos(sd * r);
      for (let y = 0; y < H; y++) {
        const la = (90 - (y + 0.5) * 180 / H) * r, a = Math.sin(la) * sdS, b = Math.cos(la) * sdC;
        for (let x = 0; x < W; x++) {
          const lo = ((x + 0.5) * 360 / W - 180 - sl) * r, c = a + b * Math.cos(lo);
          const k = Math.min(1, Math.max(0, (c + 0.1) / 0.2)), i = (y * W + x) * 4;
          out.data[i] = D.data[i] * k + N.data[i] * (1 - k) * 1.4;
          out.data[i + 1] = D.data[i + 1] * k + N.data[i + 1] * (1 - k) * 1.4;
          out.data[i + 2] = D.data[i + 2] * k + N.data[i + 2] * (1 - k) * 1.4;
          out.data[i + 3] = 255;
        }
      }
      bx.putImageData(out, 0, 0);
    }
    shade(); setInterval(() => shade(), 60000);
    const ctx = canvas.getContext("2d");
    const fit = () => { const w = canvas.clientWidth, dpr = Math.min(2, devicePixelRatio || 1); canvas.width = w * dpr; canvas.height = w / 2 * dpr; };
    fit(); new ResizeObserver(fit).observe(canvas);
    const xy = (lat, lon) => [(lon + 180) / 360 * canvas.width, (90 - lat) / 180 * canvas.height];
    return { ctx, xy, draw() { ctx.drawImage(base, 0, 0, canvas.width, canvas.height); }, get s() { return Math.max(0.6, canvas.width / 1000); } };
  }

  /* ---------- محطة الفضاء الدولية مباشرة ---------- */
  async function iss(root) {
    const cr = await credits();
    root.innerHTML = `<div class="xp-live"><div class="xp-map"><canvas aria-label="خريطة الأرض تبيّن موقع محطة الفضاء الدولية الآن" role="img"></canvas>
      <span class="xp-live-dot">مباشر</span></div>
      <div class="xp-side"><dl class="xp-facts xp-iss"><div><dt>فوق</dt><dd data-k="over">…</dd></div><div><dt>خط العرض</dt><dd data-k="lat">…</dd></div>
      <div><dt>خط الطول</dt><dd data-k="lon">…</dd></div><div><dt>الارتفاع</dt><dd data-k="alt">…</dd></div><div><dt>السرعة</dt><dd data-k="vel">…</dd></div><div><dt>الآن</dt><dd data-k="vis">…</dd></div></dl>
      <p>تدور المحطة حول الأرض مرة كل ٩٢ دقيقة تقريبًا، فيرى روّادها ١٦ شروقًا و١٦ غروبًا كل يوم. الخط المتقطّع مسارها في الدقائق الخمسين القادمة، والخط المتصل ما قطعته للتو، والظل هو ليل الأرض الآن.</p>
      ${photo(cr.iss, "محطة الفضاء الدولية في مدارها فوق الأرض", "xp-photo-sm")}
      <p class="xp-src">البيانات: <a href="https://wheretheiss.at" target="_blank" rel="noopener" lang="en">wheretheiss.at</a> · الخريطة: Solar System Scope (CC BY 4.0)</p></div></div>`;
    const map = await earthMap(root.querySelector("canvas"));
    const set = (k, v) => { root.querySelector(`[data-k="${k}"]`).textContent = v; };
    const API = "https://api.wheretheiss.at/v1/satellites/25544";
    let now = null, past = [], next = [], over = "", trailAt = 0, overAt = 0, timer;
    const region = (cc) => { try { return new Intl.DisplayNames(["ar"], { type: "region" }).of(cc); } catch { return cc; } };
    async function trail() {
      const t = Math.floor(Date.now() / 1000), ts = (a) => a.map((m) => t + m * 60).join(",");
      const [a, b] = await Promise.all([json(`${API}/positions?timestamps=${ts([-50, -45, -40, -35, -30, -25, -20, -15, -10, -5])}`), json(`${API}/positions?timestamps=${ts([5, 10, 15, 20, 25, 30, 35, 40, 45, 50])}`)]);
      past = a; next = b; trailAt = Date.now();
    }
    function line(pts, dash) {
      const c = map.ctx; c.save(); c.setLineDash(dash ? [6 * map.s, 6 * map.s] : []); c.lineWidth = 2.2 * map.s; c.strokeStyle = dash ? "rgba(255,213,41,.75)" : "rgba(255,213,41,.95)";
      c.beginPath(); let prev = null;
      for (const p of pts) { const [x, y] = map.xy(p.latitude, p.longitude); if (!prev || Math.abs(p.longitude - prev.longitude) > 180) c.moveTo(x, y); else c.lineTo(x, y); prev = p; }
      c.stroke(); c.restore();
    }
    function draw() {
      map.draw(); if (!now) return;
      line([...past, now], false); line([now, ...next], true);
      const [x, y] = map.xy(now.latitude, now.longitude), c = map.ctx, s = map.s;
      const pulse = 1 + 0.25 * Math.sin(Date.now() / 250);
      c.fillStyle = "rgba(255,213,41,.22)"; c.beginPath(); c.arc(x, y, 18 * s * pulse, 0, 7); c.fill();
      c.fillStyle = "#ffd529"; c.strokeStyle = "#111"; c.lineWidth = 2 * s; c.beginPath(); c.arc(x, y, 7 * s, 0, 7); c.fill(); c.stroke();
    }
    async function tick() {
      try {
        now = await json(API);
        set("lat", `${fmt(Math.abs(now.latitude), 2)}° ${now.latitude >= 0 ? "شمالًا" : "جنوبًا"}`);
        set("lon", `${fmt(Math.abs(now.longitude), 2)}° ${now.longitude >= 0 ? "شرقًا" : "غربًا"}`);
        set("alt", `${fmt(now.altitude)} كم`); set("vel", `${fmt(now.velocity)} كم/ساعة`);
        set("vis", now.visibility === "daylight" ? "في ضوء الشمس" : "في ظل الأرض");
        if (Date.now() - trailAt > 4 * 60e3) await trail();
        if (Date.now() - overAt > 30e3) {
          overAt = Date.now();
          const g = await json(`https://api.wheretheiss.at/v1/coordinates/${now.latitude.toFixed(3)},${now.longitude.toFixed(3)}`).catch(() => null);
          over = g && g.country_code && g.country_code !== "??" ? region(g.country_code) : "مياه المحيط أو منطقة غير مأهولة";
          set("over", over);
        }
      } catch { set("over", "تعذّر الاتصال، سنحاول بعد لحظات"); }
    }
    const loop = () => { draw(); if (root.closest("details").open) requestAnimationFrame(loop); };
    const start = () => { clearInterval(timer); tick(); timer = setInterval(() => root.closest("details").open ? tick() : clearInterval(timer), 5000); requestAnimationFrame(loop); };
    root.closest("details").addEventListener("toggle", (e) => { if (e.target.open) start(); });
    start();
  }

  /* ---------- الزلازل مباشرة ---------- */
  async function quakes(root) {
    root.innerHTML = `<div class="xp-tabs" role="tablist"><button type="button" role="tab" aria-selected="true" data-feed="2.5_day">آخر ٢٤ ساعة (٢٫٥ فأكثر)</button><button type="button" role="tab" aria-selected="false" data-feed="4.5_week">آخر ٧ أيام (٤٫٥ فأكثر)</button><button type="button" role="tab" aria-selected="false" data-feed="significant_month">الأهمّ هذا الشهر</button></div>
      <div class="xp-live"><div class="xp-map"><canvas aria-label="خريطة الزلازل الأخيرة حول العالم" role="img"></canvas><span class="xp-live-dot">مباشر</span><div class="xp-tip" hidden></div></div>
      <div class="xp-side"><div class="xp-stat"><b data-k="n">…</b><span>زلزالًا مسجّلًا</span></div><div class="xp-stat"><b data-k="max">…</b><span>أقوى قدر</span></div>
      <ol class="xp-qlist" aria-label="أقوى الزلازل"></ol>
      <div class="xp-depth-key"><span style="--c:#ffd529">ضحل (أقل من ٧٠ كم)</span><span style="--c:#ff7a3d">متوسط (٧٠–٣٠٠ كم)</span><span style="--c:#e2262b">عميق (أكثر من ٣٠٠ كم)</span></div>
      <p>كل دائرة زلزال حقيقي سجّلته شبكات الرصد، وحجمها بحسب قوّته. لاحظ كيف ترسم الزلازل حدود الصفائح التكتونية، خاصة «حلقة النار» حول المحيط الهادئ. اضغط على دائرة أو اسم لترى التفاصيل.</p>
      <p class="xp-src">البيانات: <a href="https://earthquake.usgs.gov/earthquakes/feed/" target="_blank" rel="noopener">هيئة المسح الجيولوجي الأمريكية USGS</a> (ملك عام) · تُحدَّث كل دقيقة</p></div></div>`;
    const canvas = root.querySelector("canvas"), map = await earthMap(canvas), tip = root.querySelector(".xp-tip"), list = root.querySelector(".xp-qlist");
    let feed = "2.5_day", qs = [], sel = null, timer;
    const col = (d) => d < 70 ? "#ffd529" : d < 300 ? "#ff7a3d" : "#e2262b";
    const when = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `قبل ${ar(m)} دقيقة` : m < 1440 ? `قبل ${ar(Math.round(m / 60))} ساعة` : `قبل ${ar(Math.round(m / 1440))} يوم`; };
    function draw() {
      map.draw(); const c = map.ctx;
      for (const q of [...qs].sort((a, b) => a.mag - b.mag)) {
        const [x, y] = map.xy(q.lat, q.lon), r = Math.max(2.5, Math.pow(1.75, q.mag) * 0.55) * map.s;
        c.globalAlpha = 0.75; c.fillStyle = col(q.depth); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.globalAlpha = 1; c.strokeStyle = q === sel ? "#fff" : "rgba(0,0,0,.6)"; c.lineWidth = (q === sel ? 3 : 1) * map.s; c.stroke();
      }
    }
    function pick(q) {
      sel = q; draw();
      if (!q) { tip.hidden = true; return; }
      const [x, y] = map.xy(q.lat, q.lon), k = canvas.clientWidth / canvas.width;
      tip.hidden = false; tip.style.left = `${Math.min(x * k, canvas.clientWidth - 230)}px`; tip.style.top = `${y * k + 12}px`;
      tip.innerHTML = `<b>قوة ${ar(q.mag.toFixed(1))}</b> · عمق ${fmt(q.depth)} كم<br><span lang="en" dir="ltr">${esc(q.place)}</span><br>${when(q.time)} · <a href="${esc(q.url)}" target="_blank" rel="noopener">التفاصيل</a>`;
    }
    async function load() {
      try {
        const d = await json(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`);
        qs = d.features.filter((f) => f.properties.mag != null).map((f) => ({ mag: f.properties.mag, place: f.properties.place || "", time: f.properties.time, url: f.properties.url, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2] }));
        const top = [...qs].sort((a, b) => b.mag - a.mag);
        root.querySelector('[data-k="n"]').textContent = fmt(qs.length);
        root.querySelector('[data-k="max"]').textContent = top[0] ? ar(top[0].mag.toFixed(1)) : "—";
        list.innerHTML = top.slice(0, 6).map((q, i) => `<li><button type="button" data-i="${qs.indexOf(q)}"><b style="--c:${col(q.depth)}">${ar(q.mag.toFixed(1))}</b><span lang="en" dir="ltr">${esc(q.place)}</span><small>${when(q.time)}</small></button></li>`).join("");
        sel = null; tip.hidden = true; draw();
      } catch { list.innerHTML = "<li>تعذّر تحميل البيانات الآن، سنحاول بعد دقيقة.</li>"; draw(); }
    }
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-feed]");
      if (t) { feed = t.dataset.feed; root.querySelectorAll("[data-feed]").forEach((b) => b.setAttribute("aria-selected", b === t)); load(); return; }
      const b = e.target.closest("[data-i]"); if (b) pick(qs[+b.dataset.i]);
    });
    canvas.addEventListener("click", (e) => {
      const r = canvas.getBoundingClientRect(), k = canvas.width / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
      let best = null, bd = 1e9;
      for (const q of qs) { const [x, y] = map.xy(q.lat, q.lon), d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = q; } }
      pick(bd < 25 * map.s ? best : null);
    });
    new ResizeObserver(() => draw()).observe(canvas);
    const start = () => { clearInterval(timer); load(); timer = setInterval(() => root.closest("details").open ? load() : clearInterval(timer), 60000); };
    root.closest("details").addEventListener("toggle", (e) => { if (e.target.open) start(); });
    start();
  }

  /* ---------- رحلة بالمنزلقة: أعماق المحيط وسلّم الأحجام ---------- */
  async function journey(root, file, kind) {
    const [d, cr] = await Promise.all([json(file), credits()]);
    const st = d.stops, n = st.length;
    root.innerHTML = `<div class="xp-journey xp-${kind}"><div class="xp-gauge"><b data-k="big"></b><span data-k="sub"></span></div>
      <input type="range" min="0" max="${n - 1}" step="1" value="0" aria-label="${esc(d.label)}" class="xp-range">
      <div class="xp-ticks" aria-hidden="true">${st.map((s, i) => `<i style="--i:${i}"></i>`).join("")}</div>
      <div class="xp-card xp-stop"></div>
      <div class="xp-nav"><button type="button" data-step="-1">${esc(d.prev)}</button><span data-k="pos"></span><button type="button" data-step="1">${esc(d.next)}</button></div>
      <p class="xp-src">${d.source}</p></div>`;
    const range = root.querySelector(".xp-range"), card = root.querySelector(".xp-stop"), wrap = root.querySelector(".xp-journey");
    const q = (k) => root.querySelector(`[data-k="${k}"]`);
    function show(i) {
      const s = st[i], c = cr[s.img];
      range.value = i;
      if (kind === "ocean") {
        const depth = s.depth, light = Math.exp(-depth / 120);
        wrap.style.setProperty("--light", light.toFixed(3));
        q("big").textContent = depth ? `${fmt(depth)} م` : "سطح البحر";
        q("sub").textContent = `${s.zone} · الضغط ≈ ${fmt(1 + depth / 10)} ضغط جوي`;
      } else {
        const e = Math.floor(Math.log10(s.m)), mant = s.m / 10 ** e;
        q("big").innerHTML = `<bdi dir="ltr" lang="en">${mant >= 1.05 ? mant.toFixed(1) + " × " : ""}10<sup>${String(e).replace("-", "−")}</sup></bdi> م`;
        const prev = st[i - 1];
        q("sub").textContent = `${s.human}${prev ? ` · أكبر من سابقه بنحو ${fmt(s.m / prev.m)} مرة` : ""}`;
        wrap.style.setProperty("--zoom", (i / (n - 1)).toFixed(3));
      }
      card.innerHTML = `${photo(c, s.alt || s.title)}<div class="xp-card-body"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.note ? `<p class="xp-note">${esc(s.note)}</p>` : ""}</div>`;
      q("pos").textContent = `${ar(i + 1)} / ${ar(n)}`;
      root.querySelector('[data-step="-1"]').disabled = i === 0;
      root.querySelector('[data-step="1"]').disabled = i === n - 1;
      const nx = st[i + 1] && cr[st[i + 1].img]; if (nx) new Image().src = nx.src;
    }
    range.addEventListener("input", () => show(+range.value));
    root.addEventListener("click", (e) => { const b = e.target.closest("[data-step]"); if (b) show(Math.max(0, Math.min(n - 1, +range.value + +b.dataset.step))); });
    show(0);
  }

  const INIT = {
    "xp-periodic": periodic,
    "xp-iss": iss,
    "xp-quakes": quakes,
    "xp-ocean": (r) => journey(r, "data/explore/ocean.json", "ocean"),
    "xp-scale": (r) => journey(r, "data/explore/scale.json", "scale"),
  };
  for (const [id, fn] of Object.entries(INIT)) {
    const det = document.getElementById(id); if (!det) continue;
    const body = det.querySelector(".xp-body"); let done = false;
    const go = () => { if (!det.open || done) return; done = true; body.innerHTML = '<p class="xp-loading">جارٍ التحميل…</p>'; fn(body).catch(() => { body.innerHTML = '<p class="xp-loading">تعذّر التحميل، أعد المحاولة لاحقًا.</p>'; done = false; }); };
    det.addEventListener("toggle", go); go();
  }
})();
