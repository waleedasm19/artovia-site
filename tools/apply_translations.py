#!/usr/bin/env python3
"""ينقل أخبار الطابور المترجمة إلى data/news.json.
الاستعمال: python3 tools/apply_translations.py translations.json
حيث translations.json = {"<url>": {"title": "...", "summary": "..."}, "<url>": null (= استبعاد)}"""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q, N = os.path.join(ROOT, "data", "news-queue.json"), os.path.join(ROOT, "data", "news.json")
tr = json.load(open(sys.argv[1], encoding="utf-8"))
queue, news = json.load(open(Q, encoding="utf-8")), json.load(open(N, encoding="utf-8"))
AR = re.compile(r"[\u0600-\u06FF]")
keep, moved = [], 0
for q in queue:
    if q["url"] not in tr: keep.append(q); continue
    t = tr[q["url"]]
    if not t or not AR.search(t.get("title", "")): continue
    news["items"].append({**{k: q[k] for k in ("field", "url", "source", "date")}, "title": t["title"].strip(),
                          "summary": t.get("summary", "").strip(), "orig": q["title"], "lang": "ar"}); moved += 1
news["items"] = sorted(news["items"], key=lambda i: i.get("date", ""), reverse=True)[:240]
json.dump(news, open(N, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(keep, open(Q, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("moved", moved, "left", len(keep))
