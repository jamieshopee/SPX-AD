#!/bin/bash
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

SIZE="984x309"
TEMPLATE_PATH="templates/984x309/template.json"
PROFILE_DIR="$PROJECT_DIR/chrome-profiles/$SIZE"
HOST="127.0.0.1"
PORT="8080"
BASE_URL="http://$HOST:$PORT"
SERVER_PID=""

# 1. 關閉使用此 profile 的舊 Chrome
pkill -f "chrome-profiles/$SIZE" 2>/dev/null || true
sleep 0.6

# 2. 啟動或沿用本專案 server
if curl -fsI "$BASE_URL/$TEMPLATE_PATH" >/dev/null 2>&1; then
  echo "ℹ️  沿用既有 127.0.0.1:8080 server。"
else
  EXISTING_PIDS=$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$EXISTING_PIDS" ]; then
    echo "⚠️  8080 port 已被其他服務占用，嘗試停止舊服務..."
    kill -9 $EXISTING_PIDS 2>/dev/null || true
    sleep 0.5
  fi

  python3 - << 'PYSERVER' &
import http.server, socketserver
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma','no-cache')
        self.send_header('Expires','0')
        super().end_headers()
    def log_message(self, fmt, *args): pass
class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
with ReusableTCPServer(('127.0.0.1', 8080), H) as s:
    s.serve_forever()
PYSERVER
  SERVER_PID=$!
  sleep 1

  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "❌ 本機 server 啟動失敗，請確認 8080 port 是否被其他程式占用。"
    exit 1
  fi

  if ! curl -fsI "$BASE_URL/$TEMPLATE_PATH" >/dev/null 2>&1; then
    echo "❌ 本機 server 已啟動，但讀不到模板：$TEMPLATE_PATH"
    kill "$SERVER_PID" 2>/dev/null || true
    exit 1
  fi
fi

# 3. 完全刪除並重建 profile（保證無任何舊快取）
rm -rf "$PROFILE_DIR"
mkdir -p "$PROFILE_DIR"

TS=$(date +%s)
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disk-cache-size=1 \
  "$BASE_URL/editor/index.html?_v=$TS&template=$TEMPLATE_PATH&style=01" \
  2>/dev/null &

echo "✅ 984x309 預設版型（樣式 01）編輯器已開啟（全新 profile，無快取）"
if [ -n "$SERVER_PID" ]; then
  echo "   關閉這個終端機視窗即停止伺服器。"
  wait "$SERVER_PID"
else
  echo "   目前沿用既有伺服器；關閉原啟動伺服器的終端機視窗才會停止伺服器。"
  while lsof -tiTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do sleep 2; done
fi
