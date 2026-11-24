/* واجهة الرئيسية: عشرون مشهدًا حقيقيًا من مجالات العلم تتبدّل كل 5 ثوانٍ بتلاشٍ سينمائي واقتراب بطيء.
   الصور مرخّصة (ملكية عامة أو المشاع الإبداعي) ومذكور مصدر كل صورة. البيانات: data/hero-slides.json */
(async () => {
  const { $, getJSON, esc } = window.ACF;
  const hero = $(".front-hero"); if (!hero) return;
  const data = await getJSON("data/hero-slides.json").catch(() => null);
  const S = data?.slides || []; if (S.length < 2) return;
  const every = (data.interval || 5) * 1000;
  const narrow = matchMedia("(max-width: 760px)").matches;
  const src = (s) => (narrow && s.small) ? s.small : s.img;

  const stage = document.createElement("div"); stage.className = "hero-slides"; stage.setAttribute("aria-hidden", "true");
  stage.innerHTML = S.map((s, i) => `<img alt="" decoding="async" data-src="${esc(src(s))}" style="object-position:${esc(s.pos || "50% 50%")}"${i === 0 ? ` src="${esc(src(s))}" class="on"` : ""}>`).join("");
  hero.querySelector(".front-hero-image")?.replaceWith(stage);
  const cap = document.createElement("a"); cap.className = "hero-cap"; cap.target = "_blank"; cap.rel = "noopener";
  const dots = document.createElement("div"); dots.className = "hero-dots"; dots.setAttribute("aria-hidden", "true");
  dots.innerHTML = S.map(() => "<i></i>").join("");
  hero.append(cap, dots);

  const imgs = [...stage.children], marks = [...dots.children];
  const load = (k) => new Promise((res) => {
    const im = imgs[k]; if (!im) return res();
    if (im.complete && im.src) return res();
    im.onload = im.onerror = () => res(); if (!im.src) im.src = im.dataset.src;
  });
  let idx = 0, timer = null, onScreen = true;
  function show(k) {
    imgs[idx].classList.remove("on"); marks[idx].classList.remove("on");
    idx = k; imgs[idx].classList.add("on"); marks[idx].classList.add("on");
    const s = S[idx]; cap.href = s.url; cap.innerHTML = `<b>${esc(s.name)}</b><small>${esc(s.credit)}</small>`;
  }
  async function next() {
    const k = (idx + 1) % S.length;
    await load(k);                       // لا ننتقل إلى صورة لم تكتمل بعد
    show(k); load((k + 1) % S.length); plan();
  }
  function plan() { clearTimeout(timer); if (onScreen && !document.hidden) timer = setTimeout(next, every); }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; plan(); }, { threshold: .05 }).observe(hero);
  document.addEventListener("visibilitychange", plan);
  show(0); load(1);
})();
