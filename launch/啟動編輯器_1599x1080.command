#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

PROFILE_DIR="$PROJECT_DIR/chrome-profiles/1599x1080"

# 1. 關閉使用此 profile 的舊 Chrome
pkill -f "chrome-profiles/1599x1080" 2>/dev/null || true
sleep 0.6

# 2. 停掉舊的伺服器
lsof -ti:8080 | xargs kill -9 2>/dev/null
sleep 0.3

# 3. 啟動無快取 Python server
python3 - << 'PYSERVER' &
import http.server, socketserver, os
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma','no-cache')
        self.send_header('Expires','0')
        super().end_headers()
    def log_message(self, fmt, *args): pass
with socketserver.TCPServer(('',8080),H) as s: s.serve_forever()
PYSERVER

sleep 1

# 4. 完全刪除並重建 profile（保證無任何舊快取）
rm -rf "$PROFILE_DIR"
mkdir -p "$PROFILE_DIR"

TS=$(date +%s)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disk-cache-size=1 \
  "http://localhost:8080/editor/index.html?_v=$TS&template=templates/1599x1080/template.json&style=01" \
  2>/dev/null &

echo "✅ 1599x1080 預設版型（樣式 01）編輯器已開啟（全新 profile，無快取）"
echo "   關閉這個終端機視窗即停止伺服器。"
wait
