#!/usr/bin/env python3
"""يولّد أيقونات تطبيق إرتوفيا وشاشات البدء للآيفون والآيباد من شعار المؤسسة الرسمي (tools/app/emblem-3000.png).
التشغيل: python3 tools/app/make_app_assets.py   ثم  node tools/app/splash.mjs
"""
import json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "assets", "app"); BG = (12, 14, 17, 255)
emb = Image.open(os.path.join(HERE, "emblem-3000.png")).convert("RGBA")
emb = emb.crop(emb.getbbox())

def icon(size, scale, bg=True):
    im = Image.new("RGBA", (size, size), BG if bg else (0, 0, 0, 0))
    w = round(size * scale); e = emb.resize((w, round(w * emb.height / emb.width)), Image.LANCZOS)
    im.alpha_composite(e, ((size - e.width) // 2, (size - e.height) // 2))
    return im

icon(192, .84).save(os.path.join(OUT, "icon-192.png"))
icon(512, .84).save(os.path.join(OUT, "icon-512.png"))
icon(512, .62).save(os.path.join(OUT, "maskable-512.png"))       # المنطقة الآمنة للأيقونات المتكيّفة في أندرويد
icon(180, .80).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"))
icon(1024, .98, bg=False).save(os.path.join(OUT, "emblem-splash.png"))
# قائمة شاشات البدء بمسارات الموقع
items = json.load(open(os.path.join(HERE, "startup-images.json")))
for it in items: it["url"] = "assets/app/splash/" + os.path.basename(it["url"])
json.dump(items, open(os.path.join(HERE, "startup-images.json"), "w"), ensure_ascii=False, indent=1)
print("icons ok;", len(items), "splash sizes")
