#!/bin/bash
set -x
export PATH="/Users/ashraf/.local/node20/bin:/tmp/node-v22.14.0-darwin-x64/bin:$PATH"
cd /Users/ashraf/Projects/gazameel
date | tee /tmp/gazameel-fix-launch.out

for port in 3000 3001 3002; do
  lsof -tiTCP:$port -sTCP:LISTEN 2>/dev/null | while read p; do kill -9 "$p"; done
done
pkill -9 -f 'next-server' || true
pkill -9 -f 'next start' || true
pkill -9 -f 'next dev' || true
sleep 2

ulimit -n 10240

npm run build > /tmp/gazameel-fix-build.log 2>&1
echo BUILD_EXIT:$? | tee -a /tmp/gazameel-fix-build.log
tail -40 /tmp/gazameel-fix-build.log | tee -a /tmp/gazameel-fix-launch.out

: > /tmp/gazameel-start.log
nohup npx next start -H 127.0.0.1 -p 3000 > /tmp/gazameel-start.log 2>&1 &
echo START_PID:$! | tee -a /tmp/gazameel-fix-launch.out
for i in $(seq 1 45); do
  if grep -qE 'Ready|Local:' /tmp/gazameel-start.log 2>/dev/null; then echo READY:$i | tee -a /tmp/gazameel-fix-launch.out; break; fi
  sleep 1
done

curl -sS -D /tmp/fix-progress.hdr -o /tmp/fix-progress.html -w "progress:%{http_code}\n" --connect-timeout 15 http://127.0.0.1:3000/progress | tee -a /tmp/gazameel-fix-launch.out
python3 - <<'PY' | tee -a /tmp/gazameel-fix-launch.out
import os
html=open('/tmp/fix-progress.html','rb').read().decode('utf-8','replace') if os.path.exists('/tmp/fix-progress.html') else ''
print('len', len(html))
print('crash', "Your project's URL and Key are required" in html)
for s in ['قاعدة البيانات', '.env.local', 'معاينة محلية', 'تقدمي']:
    print(s, s in html)
PY
echo DONE > /tmp/gazameel-fix.done
