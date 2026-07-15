@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
rem ============================================================
rem AD 電子版位管理器 -- 用 Chrome 開啟（Windows 版）
rem 雙擊即可啟動，關閉此視窗即停止 server
rem
rem 對應 macOS 版本：launch/啟動 AD 管理器（Chrome）.command
rem 使用相同的 Port 起始值（5174，被佔用則遞增）、相同的 Threaded HTTP
rem Server 邏輯與相同的首頁（專案根目錄的 index.html），未修改任何前端程式。
rem ============================================================

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "PROJECT_DIR=%CD%"

set "PROFILE_DIR=%PROJECT_DIR%\chrome-profiles\ad-manager"
if not exist "%PROFILE_DIR%" mkdir "%PROFILE_DIR%"

rem --- 找一個可用的 port（起始 5174，與 macOS 版本一致） ---
set /a PORT=5174
:pick_port
netstat -ano | findstr /C:":%PORT% " >nul
if not errorlevel 1 (
  set /a PORT+=1
  goto :pick_port
)

echo ================================================
echo   AD 電子版位管理器（Chrome 模式）
echo   http://localhost:%PORT%
echo   關閉此視窗即停止 server
echo ================================================

rem --- 找 Google Chrome ---
set "CHROME_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

rem --- 找到 Chrome 才產生延遲開啟瀏覽器用的暫存腳本（等 1 秒讓 server 先啟動，與 macOS 版 sleep 1 相同用意） ---
if defined CHROME_EXE (
  set "LAUNCH_BROWSER_BAT=%TEMP%\spx-ad-launch-browser.bat"
  > "!LAUNCH_BROWSER_BAT!" echo @echo off
  >> "!LAUNCH_BROWSER_BAT!" echo timeout /t 1 /nobreak ^>nul
  >> "!LAUNCH_BROWSER_BAT!" echo start "" "!CHROME_EXE!" --user-data-dir="!PROFILE_DIR!" --no-first-run --no-default-browser-check --disk-cache-size=1 "http://localhost:%PORT%"
  start "" /b "!LAUNCH_BROWSER_BAT!"
) else (
  echo.
  echo [提示] 找不到 Google Chrome，未自動開啟瀏覽器。
  echo 請自行開啟瀏覽器，手動前往：http://localhost:%PORT%
  echo.
)

rem --- 產生與 macOS 版本相同邏輯的 Threaded HTTP Server（Python stdlib only） ---
set "SERVER_PY=%TEMP%\spx-ad-server.py"
> "%SERVER_PY%" echo import sys, os
>> "%SERVER_PY%" echo import http.server
>> "%SERVER_PY%" echo import socketserver
>> "%SERVER_PY%" echo(
>> "%SERVER_PY%" echo PORT = int(sys.argv[1])
>> "%SERVER_PY%" echo(
>> "%SERVER_PY%" echo class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
>> "%SERVER_PY%" echo     allow_reuse_address = True
>> "%SERVER_PY%" echo     daemon_threads = True
>> "%SERVER_PY%" echo(
>> "%SERVER_PY%" echo class Handler(http.server.SimpleHTTPRequestHandler):
>> "%SERVER_PY%" echo     extensions_map = {
>> "%SERVER_PY%" echo         '': 'application/octet-stream',
>> "%SERVER_PY%" echo         '.html': 'text/html',
>> "%SERVER_PY%" echo         '.png':  'image/png',
>> "%SERVER_PY%" echo         '.jpg':  'image/jpeg',
>> "%SERVER_PY%" echo         '.svg':  'image/svg+xml',
>> "%SERVER_PY%" echo         '.css':  'text/css',
>> "%SERVER_PY%" echo         '.js':   'application/javascript',
>> "%SERVER_PY%" echo         '.json': 'application/json',
>> "%SERVER_PY%" echo         '.woff': 'font/woff',
>> "%SERVER_PY%" echo         '.woff2':'font/woff2',
>> "%SERVER_PY%" echo         '.ttf':  'font/ttf',
>> "%SERVER_PY%" echo         '.gz':   'application/gzip',
>> "%SERVER_PY%" echo     }
>> "%SERVER_PY%" echo     def log_message(self, format, *args):
>> "%SERVER_PY%" echo         pass
>> "%SERVER_PY%" echo(
>> "%SERVER_PY%" echo with ThreadedHTTPServer(('', PORT), Handler) as httpd:
>> "%SERVER_PY%" echo     print('[AD Server] http://localhost:{0}  (按 Ctrl+C 停止)'.format(PORT))
>> "%SERVER_PY%" echo     httpd.serve_forever()

rem --- 啟動 Python 多執行緒 server（在專案根目錄下執行，首頁與 macOS 版本相同） ---
python "%SERVER_PY%" %PORT%

popd
