/* عامل الخدمة لتطبيق إرتوفيا: يجعل الموقع يعمل بلا إنترنت بعد أول زيارة.
   الصفحات والبيانات: الشبكة أولًا ثم النسخة المحفوظة. الملفات الثابتة والصور: المحفوظة فورًا مع تحديثها في الخلفية.
   غيّر VERSION عند تغيير قائمة SHELL. */
const VERSION = "artovia-v8";
const SHELL = [
  "./", "index.html", "library.html", "news.html", "magazine.html", "world.html", "account.html", "app.html", "offline.html",
  "reader.html", "field.html", "book.html", "article.html", "assets/js/reader.mjs", "assets/js/field.js", "assets/js/fields-icons.js",
  "assets/js/book.js", "assets/js/library.js", "assets/js/news.js", "assets/js/home.js", "assets/js/hero-slides.js",
  "assets/vendor/pdfjs/pdf.min.mjs", "assets/vendor/pdfjs/pdf.worker.min.mjs",
  "assets/css/main.css", "assets/css/editorial.css", "assets/js/site.js", "assets/js/app-shell.js",
  "assets/js/editorial-interactions.js", "assets/js/quotes.js", "assets/js/config.js", "assets/js/auth.js", "assets/vendor/supabase.js",
  "assets/fonts/Amiri-Bold.woff2", "assets/fonts/IBMPlexSansArabic-Regular.woff2", "assets/fonts/IBMPlexSansArabic-SemiBold.woff2",
  "assets/img/emblem-sm.png", "assets/app/icon-192.png", "assets/app/emblem-splash.png",
  "data/books.json", "data/news.json", "data/fields.json", "data/magazine.json", "data/world.json", "data/hero-slides.json", "data/knowledge.json", "data/showcase.json", "data/quotes.json",
];
const PAGES = `${VERSION}-pages`, STATIC = `${VERSION}-static`, IMAGES = `${VERSION}-images`;
const MAX_IMAGES = 160;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: "reload" }))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) && !k.startsWith("acf-")).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
async function networkFirst(req, name, fallback) {
  const c = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone());
    return res;
  } catch {
    return (await c.match(req, { ignoreSearch: req.mode === "navigate" })) || (await caches.match(req, { ignoreSearch: true }))
      || (fallback && (await caches.match(fallback))) || Response.error();
  }
}
async function staleWhileRevalidate(req, name, max) {
  const c = await caches.open(name), hit = await c.match(req);
  const fresh = fetch(req).then((res) => { if (res.ok) { c.put(req, res.clone()); if (max) trim(name, max); } return res; }).catch(() => null);
  return hit || (await fresh) || (await caches.match(req, { ignoreSearch: true })) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // Supabase وغيرها تمر مباشرة
  if (req.mode === "navigate") return e.respondWith(networkFirst(req, PAGES, "offline.html"));
  if (url.pathname.includes("/data/")) return e.respondWith(networkFirst(req, PAGES));
  if (/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(url.pathname)) return e.respondWith(staleWhileRevalidate(req, IMAGES, MAX_IMAGES));
  if (/\.(css|js|mjs|woff2?|json|webmanifest)$/i.test(url.pathname)) return e.respondWith(staleWhileRevalidate(req, STATIC));
});
