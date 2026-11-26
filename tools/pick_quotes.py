#!/usr/bin/env python3
"""يختار اقتباسات اليوم لشريط «اقتباس اليوم» من data/quotes-pool.json إلى data/quotes.json.
- الاقتباسات الجديدة (المضافة في آخر يومين ولم تُعرض) تتقدّم دائمًا.
- ثم الأقدم عرضًا، فلا يتكرر اقتباس قبل أن يدور المخزن كله.
- يضمن اقتباسًا واحدًا على الأقل من الرواق إن وُجد.
يعمل مرة في اليوم بتوقيت الرياض؛ تشغيله مجددًا في اليوم نفسه لا يغيّر شيئًا إلا إن أُضيف جديد.
التشغيل: python3 tools/pick_quotes.py [--count 12] [--date YYYY-MM-DD]
"""
import json, os, sys, hashlib, datetime as dt
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POOL = os.path.join(ROOT, "data", "quotes-pool.json")
OUT = os.path.join(ROOT, "data", "quotes.json")

def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default

def main():
    count = int(arg("--count", 12))
    today = arg("--date", (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=3)).date().isoformat())
    pool = [q for q in json.load(open(POOL, encoding="utf-8"))["items"] if q.get("q") and q.get("href")]
    cur = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {}
    shown = {k: v for k, v in cur.get("shown", {}).items() if v != today}
    fresh_cut = (dt.date.fromisoformat(today) - dt.timedelta(days=2)).isoformat()
    is_fresh = lambda q: q.get("added", "") >= fresh_cut and q["id"] not in shown
    if cur.get("date") == today:
        ids = {i["id"] for i in cur.get("items", [])}
        if all(q["id"] in ids for q in pool if is_fresh(q)) and len(ids) >= min(count, len(pool)):
            print("quotes: today's set is current"); return
    tie = lambda q: hashlib.md5((q["id"] + today).encode()).hexdigest()
    fresh = sorted((q for q in pool if is_fresh(q)), key=lambda q: (q.get("added", ""), tie(q)), reverse=True)
    rest = sorted((q for q in pool if not is_fresh(q)), key=lambda q: (shown.get(q["id"], ""), tie(q)))
    # كاتب واحد لكل اقتباس في اليوم ما أمكن، ثم يُكمَل العدد إن قلّ الكتّاب
    pick, seen = [], set()
    for q in fresh + rest:
        if len(pick) < count and q["by"] not in seen: pick.append(q); seen.add(q["by"])
    for q in fresh + rest:
        if len(pick) < count and q not in pick: pick.append(q)
    if not any(q.get("kind") == "rawaq" for q in pick):
        r = next((q for q in rest + fresh if q.get("kind") == "rawaq"), None)
        if r and pick: pick[-1] = r
    # لا يتجاور اقتباسان للكاتب نفسه
    for i in range(1, len(pick)):
        if pick[i]["by"] == pick[i - 1]["by"]:
            j = next((j for j in range(i + 1, len(pick)) if pick[j]["by"] != pick[i]["by"]), None)
            if j: pick[i], pick[j] = pick[j], pick[i]
    for q in pick: shown[q["id"]] = today
    live = {q["id"] for q in pool}
    out = {"date": today, "items": [{k: q[k] for k in ("id", "q", "by", "src", "href", "kind") if k in q} for q in pick],
           "shown": {k: v for k, v in sorted(shown.items()) if k in live}}
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"quotes: {len(pick)} for {today}")

if __name__ == "__main__":
    main()
