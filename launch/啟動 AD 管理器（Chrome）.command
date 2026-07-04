#!/bin/bash
# AD 電子版位管理器 — 用 Chrome 開啟
# 雙擊即可啟動，關閉終端機視窗即停止 server

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

PROFILE_DIR="$PROJECT_DIR/chrome-profiles/ad-manager"
mkdir -p "$PROFILE_DIR"

# 找一個可用的 port
PORT=5174
while lsof -i :$PORT &>/dev/null 2>&1; do
  PORT=$((PORT+1))
done

echo "================================================"
echo "  AD 電子版位管理器（Chrome 模式）"
echo "  http://localhost:$PORT"
echo "  關閉此視窗即停止 server"
echo "================================================"

# 1 秒後用 Chrome 開啟
(sleep 1 && /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir="$PROFILE_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disk-cache-size=1 \
  "http://localhost:$PORT" \
  2>/dev/null) &

# 啟動 Python 多線程 server
python3 - $PORT <<'PYEOF'
import sys, os
import http.server
import socketserver

PORT = int(sys.argv[1])

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '': 'application/octet-stream',
        '.html': 'text/html',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.svg':  'image/svg+xml',
        '.css':  'text/css',
        '.js':   'application/javascript',
        '.json': 'application/json',
        '.woff': 'font/woff',
        '.woff2':'font/woff2',
        '.ttf':  'font/ttf',
        '.gz':   'application/gzip',
    }
    def log_message(self, format, *args):
        pass  # 靜音 log，避免終端機洗版

with ThreadedHTTPServer(('', PORT), Handler) as httpd:
    print(f'[AD Server] http://localhost:{PORT}  (按 Ctrl+C 停止)')
    httpd.serve_forever()
PYEOF
