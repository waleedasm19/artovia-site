cd ~/mag/img
while IFS='|' read -r t o; do
  [ -s "$o" ] && continue
  timeout 400 python3 -I ../tools/get.py "$t" "$o" || echo "FAIL $o"
  sleep 8
done < ../queue.txt
echo QDONE
