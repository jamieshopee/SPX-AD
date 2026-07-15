@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
rem ============================================================
rem Development Tool -- NOT a production / product flow.
rem ============================================================
rem
rem 本檔案僅供：
rem   - Windows 實機測試 SPX AD Runtime / Photoshop Automation
rem   - 開發 / Debug / Runtime Validation
rem
rem 對應 macOS 版本：tools/photoshop-automation/start-spx-ad-runtime.command
rem 定位完全相同：僅供開發／Debug／Runtime Validation／單元測試使用，不是
rem 正式產品流程。Production 中 Runtime 的生命週期由 SPX AD Application 本身
rem 建立與結束（Decision 32，Locked），不是由本檔案、任何 Launcher script，
rem 也不綁定 Photoshop 是否開啟。
rem
rem 本檔案只負責啟動既有、未修改的 spx_ad_runtime.py（沿用既有
rem Windows Adapter 與 127.0.0.1:8901 HTTP Contract），並在啟動前檢查
rem Python 與 pywin32 是否存在；缺少時僅提示，不自動安裝任何套件。
rem
rem 雙擊即可啟動。關閉此視窗或按 Ctrl+C 即停止 Runtime。
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

rem --- 檢查 Python 是否存在（不自動安裝） ---
where python >nul 2>nul
if errorlevel 1 goto :no_python

rem --- 檢查 pywin32 是否存在（不自動安裝） ---
python -c "import win32com.client" >nul 2>nul
if errorlevel 1 goto :no_pywin32

echo [檢查通過] 已偵測到 Python 與 pywin32，啟動 SPX AD Runtime...
echo.
python spx_ad_runtime.py
goto :end

:no_python
echo.
echo ================================================
echo   [錯誤] 找不到 Python
echo ================================================
echo 本機尚未安裝 Python，或 Python 未加入系統 PATH。
echo.
echo 請先安裝 Python 3（安裝時請勾選「Add python.exe to PATH」），
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
echo SPX AD Runtime 的 Windows Photoshop Adapter（windows_adapter.py）
echo 需要 pywin32 才能與 Photoshop 溝通，但目前環境中找不到這個套件。
echo.
echo 本腳本不會自動安裝套件，請手動執行以下指令安裝後，
echo 再重新雙擊本檔案：
echo.
echo     python -m pip install pywin32==306
echo.
echo （版本需求請參考 requirements-windows.txt）
echo.
pause
goto :end

:end
popd
