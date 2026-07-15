@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
rem ============================================================
rem Development Tool -- NOT a production / product flow.
rem ============================================================
rem
rem This file is only for:
rem   - Windows real-machine testing of SPX AD Runtime / Photoshop Automation
rem   - Development / Debug / Runtime Validation
rem
rem Counterpart of tools/photoshop-automation/start-spx-ad-runtime.command
rem (macOS). Same positioning: development / debug / Runtime Validation /
rem unit testing only, not a production flow. In Production, SPX AD
rem Runtime's lifecycle is created and ended by the SPX AD Application
rem itself (Decision 32, Locked), not by this file, not by any Launcher
rem script, and not tied to whether Photoshop stays open.
rem
rem This file only starts the existing, unmodified spx_ad_runtime.py
rem (reusing the existing Windows Adapter and the 127.0.0.1:8901 HTTP
rem Contract), after checking Python and pywin32 are actually usable.
rem If either is missing, it only prints a message; it never installs
rem anything automatically.
rem
rem Double-click to start. Close this window or press Ctrl+C to stop.
rem ============================================================

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

echo ================================================
echo   SPX AD Runtime（Photoshop Automation - Windows）
echo   [Development Tool - 僅供開發/Debug/Runtime Validation/單元測試]
echo   [NOT a production flow - 正式產品流程由 SPX AD Application 建立 Runtime]
echo   http://127.0.0.1:8901
echo   關閉此視窗或按 Ctrl+C 即停止 Runtime
echo ================================================
echo.

rem --- 選擇可實際執行的 Python Interpreter：優先 py，其次 python。 ---
rem --- 不可只靠 where 判斷是否存在，必須實際執行版本指令並檢查輸出。 ---
set "PY_CMD="
set "PY_VER_OUT="

for /f "delims=" %%v in ('py --version 2^>^&1') do set "PY_VER_OUT=%%v"
echo !PY_VER_OUT! | findstr /B /C:"Python " >nul
if not errorlevel 1 (
  set "PY_CMD=py"
  goto :py_found
)

set "PY_VER_OUT="
for /f "delims=" %%v in ('python --version 2^>^&1') do set "PY_VER_OUT=%%v"
echo !PY_VER_OUT! | findstr /B /C:"Python " >nul
if not errorlevel 1 (
  set "PY_CMD=python"
  goto :py_found
)

goto :no_python

:py_found
rem --- 檢查 pywin32 是否存在，使用同一個已確認可用的 Interpreter（不自動安裝） ---
"%PY_CMD%" -c "import win32com.client" >nul 2>nul
if errorlevel 1 goto :no_pywin32

echo [檢查通過] 已偵測到可用的 Python（%PY_CMD%）與 pywin32，啟動 SPX AD Runtime...
echo.
"%PY_CMD%" spx_ad_runtime.py
goto :end

:no_python
echo.
echo ================================================
echo   [錯誤] 找不到可正常執行的 Python
echo ================================================
echo 已嘗試 py 與 python 兩個指令，皆無法正確執行。
echo 可能原因：尚未安裝 Python，或 python 指令目前指向 Microsoft
echo Store 的 App Execution Alias 佔位程式（並非真正的 Python）。
echo.
echo 請先安裝 Python 3(安裝時請勾選 "Add python.exe to PATH")，
echo 下載連結：https://www.python.org/downloads/
echo.
echo 本腳本不會自動安裝 Python。安裝完成後，請重新雙擊本檔案。
echo.
pause
goto :end

:no_pywin32
echo.
echo ================================================
echo   [錯誤] 找不到 pywin32 套件
echo ================================================
echo 已使用可正常執行的 Python（%PY_CMD%），但找不到 pywin32。
echo SPX AD Runtime 的 Windows Photoshop Adapter（windows_adapter.py）
echo 需要 pywin32 才能與 Photoshop 溝通。
echo.
echo 本腳本不會自動安裝套件，請手動執行以下指令安裝後，
echo 再重新雙擊本檔案：
echo.
echo     %PY_CMD% -m pip install pywin32==306
echo.
echo (版本需求請參考 requirements-windows.txt)
echo.
pause
goto :end

:end
popd
