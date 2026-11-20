#!/usr/bin/env python3
"""يجمع أخبار العلوم والتقنية من خلاصات RSS/Atom في data/feeds.json ويكتب data/news.json.

- مكتبة بايثون القياسية فقط (لا تثبيت).
- إن وُجد متغير البيئة DEEPL_API_KEY تُترجم العناوين والملخصات الإنجليزية إلى العربية،
  ويُحفظ العنوان الأصلي في الحقل orig. بدونه تُعرض بلغتها الأصلية مع وسم المصدر.
- يدمج الجديد مع القديم، ويحذف المكرر بالرابط، ويحتفظ بأحدث `keep` خبر.
التشغيل:  python3 tools/fetch_news.py
"""
import json, os, re, sys, html, urllib.request, urllib.parse
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "data", "feeds.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "data", "news.json")
UA = {"User-Agent": "ArtoviaNewsBot/1.0 (+charitable science site)"}

AUTO_FIELDS = [  # كلمات مفتاحية عربية لتصنيف الخلاصات العربية العامة
    ("space", "فضاء|ناسا|كوكب|قمر|مجرة|تلسكوب|صاروخ|مريخ|نجم|كويكب"),
    ("health", "طب|صحة|مرض|سرطان|دواء|لقاح|علاج|مستشفى|فيروس|دماغ"),
    ("earth", "مناخ|احترار|زلزال|بركان|جليد|محيط|بيئة|تلوث|طقس"),
    ("tech", "ذكاء اصطناعي|تقنية|هاتف|إنترنت|روبوت|شريحة|حاسوب|تطبيق|برمجيات"),
    ("biology", "حيوان|نبات|جين|خلية|أحفور|تطور|كائن|بكتيريا"),
    ("physics", "فيزياء|كم|ذرة|جسيم|طاقة نووية|ضوء|ليزر"),
    ("chemistry", "كيمياء|مركّب|جزيء|تفاعل|بطارية"),
    ("engineering", "هندسة|صناعة|مصنع|طاقة|سيارة|طائرة|جسر"),
    ("math", "رياضيات|خوارزمية|معادلة"),
]

def strip(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()

def short(s, n=260):
    return s if len(s) <= n else s[: s.rfind(" ", 0, n)] + "…"

def parse_date(s):
    if not s: return None
    try: return parsedate_to_datetime(s).astimezone(timezone.utc)
    except Exception: pass
    try: return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception: return None

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()

def items_of(xml):
    root = ET.fromstring(xml)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    out = []
    for it in root.iter("item"):
        out.append({"title": strip(it.findtext("title")), "url": (it.findtext("link") or "").strip(),
                    "summary": strip(it.findtext("description")), "date": parse_date(it.findtext("pubDate"))})
    for e in root.findall("a:entry", ns):
        link = e.find("a:link", ns)
        out.append({"title": strip(e.findtext("a:title", namespaces=ns)), "url": link.get("href") if link is not None else "",
                    "summary": strip(e.findtext("a:summary", namespaces=ns) or e.findtext("a:content", namespaces=ns)),
                    "date": parse_date(e.findtext("a:updated", namespaces=ns) or e.findtext("a:published", namespaces=ns))})
    return out

def classify(text):
    for fid, pat in AUTO_FIELDS:
        if re.search(pat, text): return fid
    return "tech"

def deepl(texts):
    key = os.environ.get("DEEPL_API_KEY")
    if not key or not texts: return None
    host = "api-free.deepl.com" if key.endswith(":fx") else "api.deepl.com"
    data = urllib.parse.urlencode([("target_lang", "AR"), ("source_lang", "EN")] + [("text", t) for t in texts]).encode()
    req = urllib.request.Request(f"https://{host}/v2/translate", data=data,
                                 headers={"Authorization": f"DeepL-Auth-Key {key}", **UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return [t["text"] for t in json.load(r)["translations"]]

def main():
    old = {"items": []}
    if os.path.exists(OUT):
        old = json.load(open(OUT, encoding="utf-8"))
    seen = {i["url"] for i in old["items"]}
    blocked = re.compile("|".join(CFG.get("blocked_words", [])) or "$^", re.I)
    fresh, errors = [], []
    for f in CFG["feeds"]:
        try:
            got = items_of(fetch(f["url"]))[: CFG.get("per_feed", 6)]
        except Exception as e:
            errors.append(f"{f['url']}: {e}"); continue
        for it in got:
            if not it["title"] or not it["url"] or it["url"] in seen: continue
            if blocked.search(it["title"] + " " + it["summary"]): continue
            seen.add(it["url"])
            field = classify(it["title"] + it["summary"]) if f["field"] == "auto" else f["field"]
            fresh.append({"field": field, "title": it["title"], "summary": short(it["summary"]),
                          "url": it["url"], "source": f["source"], "lang": f["lang"],
                          "date": (it["date"] or datetime.now(timezone.utc)).strftime("%Y-%m-%d")})
    en = [i for i in fresh if i["lang"] == "en"]
    if en:
        try:
            tr = deepl([i["title"] for i in en] + [i["summary"] or "-" for i in en])
            if tr:
                n = len(en)
                for k, i in enumerate(en):
                    i["orig"] = i["title"]; i["title"] = tr[k]
                    i["summary"] = tr[n + k] if i["summary"] else ""
                    i["lang"] = "ar"
        except Exception as e:
            errors.append(f"DeepL: {e}")
    items = sorted(fresh + old["items"], key=lambda i: i.get("date", ""), reverse=True)[: CFG.get("keep", 240)]
    json.dump({"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "items": items},
              open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"new: {len(fresh)}  total: {len(items)}")
    for e in errors: print("warn:", e, file=sys.stderr)

if __name__ == "__main__":
    main()
