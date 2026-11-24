// يرسم شاشات البدء (الشعار + الاسم بخط الموقع) بمتصفح Playwright بالمقاسات الدقيقة لكل جهاز.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const items = JSON.parse(readFileSync(path.join(here, "startup-images.json"), "utf8"));
const data = (f, type) => `data:${type};base64,${readFileSync(path.join(root, f)).toString("base64")}`;
const font = (f) => data("assets/fonts/" + f, "font/woff2");
const emblem = data("assets/app/emblem-splash.png", "image/png");
const browser = await chromium.launch();
for (const it of items) {
  const [w, h] = path.basename(it.url, ".png").split("x").map(Number);
  const dpr = /pixel-ratio: 3/.test(it.media) ? 3 : 2;
  const page = await browser.newPage({ viewport: { width: w / dpr, height: h / dpr }, deviceScaleFactor: dpr });
  await page.setContent(`<!doctype html><html dir="rtl"><style>
    @font-face{font-family:A;src:url(${font("Amiri-Bold.woff2")})}@font-face{font-family:P;src:url(${font("IBMPlexSansArabic-SemiBold.woff2")})}
    html,body{margin:0;height:100%;background:#0c0e11}
    body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#f6f5f2}
    img{width:min(40vw,230px)}b{font:700 clamp(32px,8.6vw,56px)/1.25 A;margin-top:6px}i{width:44px;height:2px;background:#ffd529}small{font:600 clamp(14px,3.8vw,20px) P;color:#d9dbe0}
  </style><img src="${emblem}"><b>إرتوفيا الخيرية</b><i></i><small>المعرفة حقٌّ للجميع</small></html>`);
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(root, it.url) });
  await page.close();
}
await browser.close();
console.log("splash:", items.length);
