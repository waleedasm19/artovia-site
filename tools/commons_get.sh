#!/bin/bash
# تنزيل صورة مرخّصة من ويكيميديا كومنز مع ملف .credit (الرخصة والمؤلف والرابط).
# الاستعمال: bash tools/commons_get.sh "<اسم الملف على كومنز>" <العرض> <ملف الإخراج>
# كومنز يحدّ الطلبات (429): انتظر ثواني بين الملفات.
# $1 title  $2 width  $3 outfile
for i in 1 2 3 4 5; do curl -s -A "ArtoviaSiteBuilder/1.0 (static site image fetch)" -G https://commons.wikimedia.org/w/api.php --data-urlencode action=query --data-urlencode "titles=File:$1" --data-urlencode prop=imageinfo --data-urlencode "iiprop=url|extmetadata" --data-urlencode "iiurlwidth=$2" --data-urlencode format=json > gi.json; python3 -c "import json;json.load(open('gi.json'))" 2>/dev/null && break; sleep 8; done
u=$(python3 -c "
import json,re;p=list(json.load(open('gi.json'))['query']['pages'].values())[0];ii=p['imageinfo'][0];m=ii['extmetadata']
print(ii.get('thumburl') or ii['url'])
open('$3.credit','w').write('$1 | '+m.get('LicenseShortName',{}).get('value','')+' | '+re.sub('<[^>]+>','',m.get('Artist',{}).get('value',''))[:120]+' | '+ii['descriptionurl'])")
for i in 1 2 3 4 5; do c=$(curl -s -A "ArtoviaSiteBuilder/1.0 (static site image fetch)" -o "$3" -w '%{http_code}' -m 60 "$u"); [ "$c" = 200 ] && break; sleep 10; done; echo "$3 $c $(stat -c%s $3)"
