#!/bin/bash
# commons search: prints file titles
q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$1")
curl -s -A "ArtoviaMagazine/1.0 (educational)" "https://commons.wikimedia.org/w/index.php?search=$q&title=Special:Search&profile=advanced&fulltext=1&ns6=1&limit=${2:-12}" | grep -o 'title="File:[^"]*"' | sed 's/title="//;s/"$//' | sort -u
