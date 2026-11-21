/* شاشة الواجهة: ثلاثة مقاطع متحركة تتجدّد كل جمعة (data/showcase.json) */
(async () => {
  const { $, getJSON, esc } = window.ACF;
  const host = $("#showcase"); if (!host) return;
  const data = await getJSON("data/showcase.json").catch(() => null); if (!data) return;
  const S = data.scenes;
  const cv = host.querySelector("canvas"), ctx = cv.getContext("2d");
  const txt = host.querySelector(".screen-text"), dots = host.querySelector(".screen-dots"), play = host.querySelector(".screen-play");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
  const W = 1600, H = 900;
  let idx = 0, t0 = performance.now(), paused = reduce, pausedAt = 0, visible = true, raf;
  const rnd = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

  /* نجوم مشتركة */
  const R = rnd(7); const stars = Array.from({ length: 260 }, () => ({ x: R() * W, y: R() * H, r: R() * 1.4 + .2, p: R() * 6.28 }));
  function sky(t, tint = "#050816") {
    const g = ctx.createRadialGradient(W * .35, H * .5, 50, W * .35, H * .5, W * .8);
    g.addColorStop(0, tint); g.addColorStop(1, "#010205");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const s of stars) { ctx.globalAlpha = .35 + .35 * Math.sin(t * 1.3 + s.p); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.29); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  const glow = (x, y, r, c, a = 1) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill(); ctx.globalAlpha = 1; };
  const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);

  /* ١) الذرة: تكبير من نواة إلى سحابة إلكترونية ثم مقياس المسافة */
  function atom(t, d) {
    sky(t, "#071226");
    const cx = W * .3, cy = H * .5, k = ease(t / 4);           // k: من التكبير الشديد إلى المنظر الكامل
    const orbit = 90 + 240 * k;
    // سحابة الاحتمال
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * 1.05 + t * .12);
      ctx.strokeStyle = `rgba(110,170,255,${.18 + .1 * i})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(0, 0, orbit, orbit * .36, 0, 0, 6.29); ctx.stroke(); ctx.restore();
    }
    glow(cx, cy, orbit * 1.25, "rgba(70,110,220,.22)");
    // النواة: بروتون متوهج
    const nr = 46 - 38 * k;
    glow(cx, cy, nr * 5, "rgba(255,197,48,.55)");
    const ng = ctx.createRadialGradient(cx - nr * .3, cy - nr * .3, 1, cx, cy, nr);
    ng.addColorStop(0, "#fff3c8"); ng.addColorStop(.5, "#FFC530"); ng.addColorStop(1, "#9a5a12");
    ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(cx, cy, Math.max(nr, 9), 0, 6.29); ctx.fill();
    // الإلكترونات على المدارات
    for (let i = 0; i < 3; i++) {
      const a = t * (1.6 + i * .35) + i * 2.1, rot = i * 1.05 + t * .12;
      const ex = Math.cos(a) * orbit, ey = Math.sin(a) * orbit * .36;
      const x = cx + ex * Math.cos(rot) - ey * Math.sin(rot), y = cy + ex * Math.sin(rot) + ey * Math.cos(rot);
      glow(x, y, 26, "rgba(140,200,255,.9)"); ctx.fillStyle = "#e8f4ff"; ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.29); ctx.fill();
    }
    // مقياس: نواة ١ سم ← ٣٠٠ م
    const m = ease((t - 4.5) / 1.5);
    if (m > 0) {
      ctx.globalAlpha = m; ctx.strokeStyle = "rgba(255,197,48,.85)"; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(cx, cy + orbit * .62); ctx.lineTo(cx + orbit, cy + orbit * .62); ctx.stroke(); ctx.setLineDash([]);
      [cx, cx + orbit].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, cy + orbit * .62 - 10); ctx.lineTo(x, cy + orbit * .62 + 10); ctx.stroke(); });
      ctx.fillStyle = "#F4E3B5"; ctx.font = "600 30px 'Plex Arabic',sans-serif"; ctx.textAlign = "center"; ctx.direction = "rtl";
      ctx.fillText("≈ ٣٠٠ متر", cx + orbit / 2, cy + orbit * .62 + 46);
      ctx.font = "26px 'Plex Arabic',sans-serif"; ctx.fillStyle = "rgba(244,227,181,.75)";
      ctx.fillText("النواة بحجم ١ سم", cx, cy - 70);
      ctx.globalAlpha = 1;
    }
  }

  /* ٢) الحكيم: صورة ظلية ملحمية بإضاءة خلفية وحجرة مظلمة */
  const sage = new Path2D("M120 172C96 150 100 92 150 62C190 38 260 36 300 70C335 98 342 150 318 180C312 205 300 225 302 250C330 290 370 320 382 380C392 430 398 480 400 520L24 520C30 470 44 420 76 392C92 380 106 374 118 368C102 350 92 330 94 300C95 285 98 275 101 266C98 262 100 258 104 254C102 250 103 246 106 242L92 236C88 233 88 229 92 226C100 214 106 202 108 194C108 186 112 178 120 172Z");
  function sageScene(t, d) {
    sky(t, "#120c06");
    const sx = W * .3, sy = H * .5;
    // شعاع ضوء من ثقب في الجدار يسار المشهد
    const a = .55 + .2 * Math.sin(t * .9);
    const g = ctx.createLinearGradient(0, 0, W * .62, 0); g.addColorStop(0, `rgba(255,214,140,${a})`); g.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(40, H * .22); ctx.lineTo(W * .62, H * .02); ctx.lineTo(W * .62, H * .98); ctx.lineTo(40, H * .26); ctx.closePath(); ctx.fill();
    glow(40, H * .24, 60, "rgba(255,230,170,1)");
    // غبار في الشعاع
    const r = rnd(3); for (let i = 0; i < 70; i++) { const x = 60 + ((r() * W * .55 + t * 14 * (r() + .3)) % (W * .55)); const y = H * .24 + (r() - .5) * (x / (W * .62)) * H * .9; ctx.globalAlpha = .25 + .4 * r(); ctx.fillStyle = "#ffe6b0"; ctx.beginPath(); ctx.arc(x, y + Math.sin(t + i) * 4, r() * 1.8 + .4, 0, 6.29); ctx.fill(); }
    ctx.globalAlpha = 1;
    // هالة خلف الحكيم
    glow(sx + 40, sy - 40, 380, "rgba(255,197,48,.35)");
    ctx.save(); const s = 1.25 + .02 * Math.sin(t * .4); ctx.translate(sx - 216 * s + 30, sy - 300 * s + 20 + 6 * Math.sin(t * .5)); ctx.scale(s, s);
    ctx.shadowColor = "rgba(255,200,110,.85)"; ctx.shadowBlur = 40; ctx.fillStyle = "#0b0704"; ctx.fill(sage);
    ctx.shadowBlur = 0;
    ctx.save(); ctx.clip(sage); const lit = ctx.createLinearGradient(40, 0, 260, 0); lit.addColorStop(0, "rgba(255,196,110,.55)"); lit.addColorStop(.35, "rgba(160,96,30,.18)"); lit.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = lit; ctx.fillRect(0, 0, 420, 540); ctx.restore();
    ctx.strokeStyle = "rgba(255,205,120,.9)"; ctx.lineWidth = 2.4; ctx.stroke(sage);
    // لفّات العمامة وطيّات الثوب
    ctx.strokeStyle = "rgba(255,197,48,.4)"; ctx.lineWidth = 2;
    [[112, 120, 318, 110], [106, 145, 326, 140], [116, 165, 318, 172], [150, 70, 240, 150]].forEach(([a, b, c, e]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2, b - 26, c, e); ctx.stroke(); });
    [[130, 380, 110, 520], [220, 330, 230, 520], [310, 290, 340, 520]].forEach(([a, b, c, e]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo(a + 20, (b + e) / 2, c, e); ctx.stroke(); });
    ctx.restore();
    // أرضية
    const fl = ctx.createLinearGradient(0, H * .58, 0, H * .8); fl.addColorStop(0, "rgba(1,2,5,0)"); fl.addColorStop(1, "rgba(1,2,5,1)"); ctx.fillStyle = fl; ctx.fillRect(0, H * .6, W, H * .4);
  }

  /* ٣) رحلة الضوء من الشمس إلى الأرض مع عدّاد */
  function light(t, d) {
    sky(t, "#060a18");
    const sx = W * .06, ex = W * .48, y = H * .5;
    // الشمس
    glow(sx, y, 420, "rgba(255,170,60,.45)"); glow(sx, y, 220, "rgba(255,210,120,.8)");
    const sg = ctx.createRadialGradient(sx, y, 10, sx, y, 170); sg.addColorStop(0, "#fff8e0"); sg.addColorStop(.6, "#ffc24a"); sg.addColorStop(1, "#e0741c");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, y, 170, 0, 6.29); ctx.fill();
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.29 + t * .1; ctx.strokeStyle = "rgba(255,200,100,.18)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 185, y + Math.sin(a) * 185); ctx.lineTo(sx + Math.cos(a) * (240 + 30 * Math.sin(t * 2 + i)), y + Math.sin(a) * (240 + 30 * Math.sin(t * 2 + i))); ctx.stroke(); }
    // الأرض
    glow(ex, y, 70, "rgba(80,150,255,.5)");
    const eg = ctx.createRadialGradient(ex - 12, y - 12, 2, ex, y, 34); eg.addColorStop(0, "#9fd0ff"); eg.addColorStop(.6, "#2f6fd0"); eg.addColorStop(1, "#0c2a60");
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, y, 34, 0, 6.29); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.beginPath(); ctx.arc(ex, y, 34, -1.57, 1.57); ctx.fill();
    // المسار
    ctx.strokeStyle = "rgba(255,255,255,.14)"; ctx.setLineDash([4, 10]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 175, y); ctx.lineTo(ex - 40, y); ctx.stroke(); ctx.setLineDash([]);
    // الفوتون
    const T = Math.min(d - 3, 9), p = ease(Math.min(t / T, 1));
    const px = sx + 175 + (ex - 40 - sx - 175) * p;
    const tr = ctx.createLinearGradient(px - 220, 0, px, 0); tr.addColorStop(0, "rgba(255,230,160,0)"); tr.addColorStop(1, "rgba(255,240,190,.9)");
    ctx.strokeStyle = tr; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(Math.max(sx + 175, px - 220), y); ctx.lineTo(px, y); ctx.stroke();
    glow(px, y, 34, "rgba(255,245,200,1)");
    // العدّاد
    const secs = Math.round(500 * p), mm = Math.floor(secs / 60), ss = secs % 60;
    const ar = (n) => String(n).replace(/\d/g, (c) => "٠١٢٣٤٥٦٧٨٩"[c]);
    ctx.textAlign = "center"; ctx.direction = "ltr"; ctx.fillStyle = "#F4E3B5"; ctx.font = "700 64px 'Plex Arabic',sans-serif";
    ctx.fillText(`${ar(mm)}:${ar(String(ss).padStart(2, "0"))}`, (sx + ex) / 2 + 60, y - 90);
    ctx.direction = "rtl"; ctx.font = "26px 'Plex Arabic',sans-serif"; ctx.fillStyle = "rgba(244,227,181,.7)";
    ctx.fillText(p < 1 ? "دقيقة : ثانية منذ مغادرة الشمس" : "وصل الضوء إلى عينيك", (sx + ex) / 2 + 60, y - 46);
    ctx.fillText("١٥٠ مليون كم", (sx + ex) / 2 + 60, y + 70);
  }

  const DRAW = { atom, sage: sageScene, light };
  const fallback = (t) => { sky(t); glow(W * .3, H * .5, 300, "rgba(255,197,48,.3)"); };

  /* واجهة */
  dots.innerHTML = S.map((s, i) => `<button type="button" aria-label="المقطع ${i + 1}: ${esc(s.title || s.tag)}"><i></i></button>`).join("");
  const dotEls = [...dots.children];
  dotEls.forEach((b, i) => b.addEventListener("click", () => go(i)));
  const words = (s) => s.split(/\s+/).map((w, i) => `<span style="--i:${i}">${esc(w)}</span>`).join(" ");
  function show(i) {
    const s = S[i];
    txt.className = "screen-text" + (s.type === "sage" ? " quote" : "");
    txt.innerHTML = `<span class="tag">${esc(s.tag)}</span>${s.title ? `<h3>${esc(s.title)}</h3>` : ""}<p>${s.type === "sage" ? "«" : ""}${words(s.text)}${s.type === "sage" ? "»" : ""}</p><cite>${esc(s.cite || "")}</cite>`;
    void txt.offsetWidth; txt.classList.add("on");
    dotEls.forEach((b, j) => { b.classList.toggle("done", j < i); b.classList.toggle("now", j === i); b.querySelector("i").style.transform = j < i ? "scaleX(1)" : "scaleX(0)"; });
  }
  function go(i) { idx = (i + S.length) % S.length; t0 = performance.now(); pausedAt = 0; show(idx); if (paused) frame(performance.now()); }
  function setPaused(p) {
    paused = p; play.innerHTML = p ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>' : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
    play.setAttribute("aria-label", p ? "تشغيل" : "إيقاف مؤقت");
    if (p) pausedAt = performance.now() - t0; else { t0 = performance.now() - pausedAt; loop(); }
  }
  play.addEventListener("click", () => setPaused(!paused));
  function size() { const r = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth; cv.width = w * r; cv.height = w * 9 / 16 * r; }
  function frame(now) {
    const s = S[idx], d = s.dur || 12, t = reduce ? d * .75 : (paused ? pausedAt : now - t0) / 1000;
    ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
    (DRAW[s.type] || fallback)(t, d);
    if (t > d - .9) txt.classList.remove("on");
    dotEls[idx].querySelector("i").style.transform = `scaleX(${Math.min(t / d, 1)})`;
    if (!paused && t >= d) go(idx + 1);
  }
  function loop() { cancelAnimationFrame(raf); if (paused || !visible) return; raf = requestAnimationFrame((n) => { frame(n); loop(); }); }
  new ResizeObserver(() => { size(); frame(performance.now()); }).observe(cv);
  new IntersectionObserver(([e]) => { const was = visible; visible = e.isIntersecting; if (visible && !was && !paused) { t0 = performance.now() - pausedAt; loop(); } else if (!visible) pausedAt = performance.now() - t0; }).observe(host);
  document.fonts?.ready.then(() => frame(performance.now()));
  size(); show(0); setPaused(reduce);
  if (!reduce) loop(); else frame(performance.now());
})();
