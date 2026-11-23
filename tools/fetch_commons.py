#!/usr/bin/env python3
"""ينزّل الصور المرخّصة من ويكيميديا كومنز المطلوبة في data/commons-images.json، ويكتب بيانات الترخيص في ملفات المقالات.
كل عنصر: {"out": "assets/img/world/x.jpg", "title": "File:..." أو "query": "كلمات بحث", "width": 1280,
          "json": "data/world/x.json", "field": "cover" أو "author"}
- يتخطّى العنصر إن كان ملف الإخراج موجودًا.
- يقبل فقط: ملك عام، CC0، CC BY، CC BY-SA. لا صور مولَّدة بالذكاء الاصطناعي ولا رسومًا برمجية.
يعمل محليًّا وفي GitHub Actions. التشغيل: python3 tools/fetch_commons.py [--dry]
"""
import json, os, re, sys, time, html, urllib.request, urllib.parse
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "ArtoviaSiteBuilder/1.0 (https://github.com/waleedasm19/artovia-site; static site image fetch)"}
OK_LIC = re.compile(r"^(public domain|pd|cc0|cc by(-sa)? [0-9.]+|cc by(-sa)?$|attribution)", re.I)

def get(url, tries=7):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read()
        except Exception as e:
            wait = 15 * (i + 1); print(f"  retry {i+1} in {wait}s: {e}", file=sys.stderr); time.sleep(wait)
    raise RuntimeError("failed: " + url)

def api(**p):
    p.update(format="json", formatversion=2)
    return json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p)))

def meta(p):
    ii = p["imageinfo"][0]; m = ii["extmetadata"]
    clean = lambda s: html.unescape(re.sub(r"\s+", " ", re.sub("<[^>]+>", "", s))).strip()
    return dict(title=p["title"], thumb=(ii.get("thumburl") or ii["url"]).split("?")[0].replace("thumb.wikimedia.org", "upload.wikimedia.org"),
                page=ii["descriptionurl"], lic=clean(m.get("LicenseShortName", {}).get("value", "")),
                artist=clean(m.get("Artist", {}).get("value", ""))[:90] or "مجهول",
                desc=clean(m.get("ImageDescription", {}).get("value", ""))[:160])

def resolve(e):
    w = e.get("width", 1280)
    if e.get("title"):
        d = api(action="query", titles=e["title"], prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=w)
        ps = [p for p in d["query"]["pages"] if "imageinfo" in p]
    else:
        d = api(action="query", generator="search", gsrsearch=e["query"] + " filetype:bitmap", gsrnamespace=6, gsrlimit=8,
                prop="imageinfo", iiprop="url|extmetadata|size", iiurlwidth=w)
        ps = sorted(d.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
        ps = [p for p in ps if p["imageinfo"][0].get("width", 0) >= e.get("minw", 900)]
    for p in ps:
        m = meta(p)
        if OK_LIC.match(m["lic"]) and not re.search(r"\bAI[- ]generated|midjourney|stable diffusion|dall-?e", m["desc"] + m["title"], re.I): return m
    return None

def credit(m): return f'{m["artist"]} · {m["lic"]} · ويكيميديا كومنز'

def main(dry=False):
    man_p = os.path.join(ROOT, "data", "commons-images.json")
    if not os.path.exists(man_p): return
    man = json.load(open(man_p, encoding="utf-8")); world_p = os.path.join(ROOT, "data", "world.json")
    world = json.load(open(world_p, encoding="utf-8")) if os.path.exists(world_p) else None
    changed = 0
    for e in man:
        out = os.path.join(ROOT, e["out"])
        if os.path.exists(out): continue
        try: m = resolve(e)
        except Exception as ex: print("skip", e["out"], ex); continue
        time.sleep(4)
        if not m: print("no licensed match:", e.get("title") or e.get("query")); continue
        print(e["out"], "<-", m["title"], "|", m["lic"], "|", m["artist"][:40])
        if dry: continue
        try: data = get(m["thumb"])
        except Exception as ex: print("skip", e["out"], ex); continue
        os.makedirs(os.path.dirname(out), exist_ok=True); open(out, "wb").write(data); time.sleep(4)
        if e.get("json"):
            jp = os.path.join(ROOT, e["json"]); a = json.load(open(jp, encoding="utf-8"))
            if e["field"] == "author": a["author"].update(photo=e["out"], photoCredit=credit(m), photoUrl=m["page"])
            else: a.update(cover=e["out"], credit=credit(m), creditUrl=m["page"], coverAlt=a.get("coverAlt") or m["desc"][:120])
            json.dump(a, open(jp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            if world:
                for it in world["items"]:
                    if it["slug"] == a.get("slug"): it["photo" if e["field"] == "author" else "cover"] = e["out"]
        changed += 1
    if world and changed: json.dump(world, open(world_p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("downloaded:", changed)

if __name__ == "__main__": main("--dry" in sys.argv)
