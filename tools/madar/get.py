import sys,re,json,os,urllib.request,urllib.parse,html
UA={"User-Agent":"ArtoviaMagazine/1.0 (educational)"}
def fetch(u):
  import time
  for i in range(5):
    try:
      import subprocess
      p=subprocess.run(["curl","-s","-f","-A",UA["User-Agent"],u],capture_output=True,timeout=90)
      if p.returncode==0: return p.stdout
      raise Exception("curl fail %d"%p.returncode)
    except Exception as e:
      print("retry",e)
      time.sleep(15*(i+1))
  return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read()
def get(title,out,width=2200):
    t=title.replace("File:","").replace(" ","_")
    page=fetch("https://commons.wikimedia.org/wiki/File:"+urllib.parse.quote(t)).decode().replace('&#95;','_')
    lic=re.findall(r'class="licensetpl_short[^"]*"[^>]*>(.*?)</span>',page,re.S)
    lic=html.unescape(re.sub('<[^>]+>','',lic[0])).strip() if lic else ""
    m=re.search(r'id="fileinfotpl_aut"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>',page,re.S)
    aut=html.unescape(re.sub(r'\s+',' ',re.sub('<[^>]+>','',m.group(1)))).strip() if m else ""
    m=re.search(r'id="fileinfotpl_credit"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>',page,re.S)
    import hashlib
    h=hashlib.md5(t.encode()).hexdigest()
    q=urllib.parse.quote(t)
    try:
        data=fetch(f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{width}px-{q}"+(".jpg" if t.lower().endswith((".tif",".tiff",".pdf")) else ""))
    except Exception as e:
        print("thumb fail",e); data=fetch(f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{q}")
    open(out,"wb").write(data)
    cr=json.load(open("credits.json")) if os.path.exists("credits.json") else {}
    at=re.findall(r'class="licensetpl_attr"[^>]*>(.*?)</span>',page,re.S)
    at=html.unescape(re.sub('<[^>]+>','',at[0])).strip() if at else ""
    cr[os.path.basename(out)]={"title":t,"license":lic,"author":(at or aut)[:200]}
    json.dump(cr,open("credits.json","w"),ensure_ascii=False,indent=1)
    print(out,len(data),lic,"|",aut[:100])
get(sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 1280)
