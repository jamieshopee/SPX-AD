# SPX AD 電子版位管理器

## 如何啟動

- 控制台：雙擊 `launch/啟動 AD 管理器（Chrome）.command`
- 編輯器：雙擊 `launch/啟動編輯器_*.command`

SPX Helper Runtime Productization Phase 1 Foundation、Phase 2 Windows Packaging 與 Phase 3 macOS Packaging 均已完成。macOS 正式產品以 PyInstaller 建立 `SPX Helper.app`，由 PKG 安裝至 `/Applications/SPX Helper.app`，並透過 `/Library/LaunchAgents/com.spxad.helper.plist` 在登入時啟動；Fresh Install、安裝後立即啟動、Menu Bar、Restart、Quit、Login Startup，以及 GitHub Pages → SPX Helper → Photoshop → Processed PNG 均已通過 Jamie Manual Validation。Phase 3 後續以 Commit `781df79c232a9644cc0bd69653e390ef70d12964`（`fix: launch macOS helper through LaunchAgent`）修正 PKG `postinstall` 直接使用 `/usr/bin/open` 所造成的 `PKInstallSandbox` environment 繼承問題；安裝完成改由 LaunchAgent bootstrap + 非強制 kickstart 啟動，Clean Install 與正式 Happy Path 已重新驗證 PASS。Product Host version 維持 `0.5.4`；最新正式 Git Tag 為 `v0.5.5`。下一步是尚未開始的 Phase 4 — Update + Uninstall；Phase 5 Final Validation 亦尚未開始。開發驗證入口仍為 `tools/photoshop-automation/spx_helper_product.py`，不是正式 Windows 或 macOS 使用者啟動方式。

Known Issue：同一 Windows 環境中，Version／About 與部分 Installer Dialog 的 OK、Esc、X 關閉事件異常；不影響 Packaging、Runtime、Browser API、Photoshop Automation 或正式去背流程，另案處理。

Editor Launcher 行為：

- 四個 Editor Launcher 共用同一個本機 HTTP Server（`127.0.0.1:8080`）。
- 若已有本專案 Server 正在執行，Launcher 會直接沿用，不重複啟動。
- 若 `8080` 被其他程式占用且不是本專案 Server，Launcher 會停止舊 Server 並重新啟動。
- Launcher 會檢查對應 template 是否可正常存取，避免誤判啟動成功。

## 主要入口

- `index.html`：控制台主入口
- `canvas.html`：Banner Render Engine

## AI Documentation

AI 接手本專案時，請優先閱讀：

- [docs/AI-HANDOFF.md](docs/AI-HANDOFF.md)
- [docs/Architecture.md](docs/Architecture.md)
- [docs/控制台開發指引.md](docs/控制台開發指引.md)
- [docs/CHANGELOG.md](docs/CHANGELOG.md)

## 完整文件

建議閱讀順序：

1. [docs/AI-HANDOFF.md](docs/AI-HANDOFF.md)
2. [docs/Architecture.md](docs/Architecture.md)
3. [docs/README.md](docs/README.md)
4. [docs/控制台開發指引.md](docs/控制台開發指引.md)
5. [docs/SPX-AD-版型規格與操作說明.md](docs/SPX-AD-版型規格與操作說明.md)
6. [docs/Photoshop Asset Pipeline.md](docs/Photoshop%20Asset%20Pipeline.md)
7. [docs/UI Design Guideline.md](docs/UI%20Design%20Guideline.md)
8. [docs/CHANGELOG.md](docs/CHANGELOG.md)
