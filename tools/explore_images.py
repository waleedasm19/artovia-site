#!/usr/bin/env python3
"""ينزّل صور «مستكشفات» الصفحة الرئيسية من ويكيميديا كومنز (صور حقيقية مرخّصة فقط) ويكتب بيانات الترخيص.
البيان: data/explore/images.json — كل عنصر {"id","out","title" أو "query","width"}.
النتيجة: data/explore/credits.json  {id: {"src","credit","url","title"}}
- يطلب العناوين دفعةً واحدة (حتى 40 في الطلب) لتجنّب حدّ الطلبات في كومنز.
- يقبل فقط: ملك عام، CC0، CC BY، CC BY-SA؛ ويرفض ما يُوصف بأنه مولّد بالذكاء الاصطناعي أو رسم.
التشغيل: python3 tools/explore_images.py
"""
import json, os, re, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_commons import get, api, meta, OK_LIC, ROOT

BAD = re.compile(r"\bAI[- ]generated|midjourney|stable diffusion|dall-?e|illustration|artist'?s (impression|concept)|rendering|diagram", re.I)

def ok(m): return OK_LIC.match(m["lic"]) and not BAD.search(m["desc"] + " " + m["title"])

def main():
    man = json.load(open(os.path.join(ROOT, "data/explore/images.json"), encoding="utf-8"))
    cp = os.path.join(ROOT, "data/explore/credits.json")
    cred = json.load(open(cp, encoding="utf-8")) if os.path.exists(cp) else {}
    todo = [e for e in man if not (os.path.exists(os.path.join(ROOT, e["out"])) and e["id"] in cred)]
    found = {}
    titled = [e for e in todo if e.get("title")]
    for i in range(0, len(titled), 40):
        chunk = titled[i:i + 40]
        d = api(action="query", titles="|".join(e["title"] for e in chunk), prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=900)
        norm = {n["from"]: n["to"] for n in d["query"].get("normalized", [])}
        pages = {p["title"]: p for p in d["query"]["pages"] if "imageinfo" in p}
        for e in chunk:
            p = pages.get(norm.get(e["title"], e["title"]))
            if p: found[e["id"]] = meta(p)
            else: print("missing:", e["title"])
        time.sleep(6)
    for e in todo:
        if e.get("title"): continue
        d = api(action="query", generator="search", gsrsearch=e["query"] + " filetype:bitmap", gsrnamespace=6, gsrlimit=10,
                prop="imageinfo", iiprop="url|extmetadata|size", iiurlwidth=900)
        ps = sorted(d.get("query", {}).get("pages", []), key=lambda p: p.get("index", 0))
        for p in ps:
            if p["imageinfo"][0].get("width", 0) < 400: continue
            m = meta(p)
            if ok(m): found[e["id"]] = m; break
        else: print("no match:", e["query"])
        time.sleep(6)
    for e in todo:
        m = found.get(e["id"])
        if not m: continue
        if not ok(m): print("rejected:", m["title"], m["lic"]); continue
        thumb = m["thumb"]
        if e.get("width", 900) != 900: thumb = re.sub(r"/\d+px-", f"/{e['width']}px-", thumb)
        try: data = get(thumb, tries=4)
        except Exception as ex: print("skip", e["id"], ex); continue
        out = os.path.join(ROOT, e["out"]); os.makedirs(os.path.dirname(out), exist_ok=True); open(out, "wb").write(data)
        cred[e["id"]] = {"src": e["out"], "credit": f'{m["artist"]} · {m["lic"]}', "url": m["page"], "title": m["title"]}
        print("ok", e["id"], "<-", m["title"], "|", m["lic"], "|", m["artist"][:40]); time.sleep(3)
    json.dump(cred, open(cp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("credits:", len(cred), "/", len(man))

if __name__ == "__main__": main()
