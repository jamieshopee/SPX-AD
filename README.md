# SPX AD 電子版位管理器

## 如何啟動

- 控制台：雙擊 `launch/啟動 AD 管理器（Chrome）.command`
- 編輯器：雙擊 `launch/啟動編輯器_*.command`

SPX Helper Runtime Productization Phase 1 Foundation、Phase 2 Windows Packaging 與 Phase 3 macOS Packaging 均已完成。macOS 正式產品以 PyInstaller 建立 `SPX Helper.app`，由 PKG 安裝至 `/Applications/SPX Helper.app`，並透過 `/Library/LaunchAgents/com.spxad.helper.plist` 在登入時啟動；Fresh Install、安裝後立即啟動、Menu Bar、Restart、Quit、Login Startup，以及 GitHub Pages → SPX Helper → Photoshop → Processed PNG 均已通過 Jamie Manual Validation。Phase 3 後續以 Commit `781df79c232a9644cc0bd69653e390ef70d12964`（`fix: launch macOS helper through LaunchAgent`）修正 PKG `postinstall` 直接使用 `/usr/bin/open` 所造成的 `PKInstallSandbox` environment 繼承問題；安裝完成改由 LaunchAgent bootstrap + 非強制 kickstart 啟動，Clean Install 與正式 Happy Path 已重新驗證 PASS。Product Host version 現為 `0.6.1`，Local PKG 為 `SPX Helper-0.6.1.pkg`。原先設定的 `0.5.5` 與既有 GitHub `v0.5.5` Release 編號衝突，且目前最新既有 Release 已為 `v0.6.0`；因此使用新增修正 Commit 將正式交付版本改為 `0.6.1`，不改寫已 Push Git 歷史。本次只重新執行 Local Packaging、不安裝新版 PKG；既有安裝、Helper 啟動與 Existing Transparency／JPG／不透明 PNG／Logo／Runtime Contract Manual Validation 均維持 PASS。Bundle ID、Package ID 與 LaunchAgent 不變；本次尚未 Push、建立 `v0.6.1` Tag 或 GitHub Release。下一步是尚未開始的 Phase 4 — Update + Uninstall；Phase 5 Final Validation 亦尚未開始。開發驗證入口仍為 `tools/photoshop-automation/spx_helper_product.py`，不是正式 Windows 或 macOS 使用者啟動方式。

## Windows SPX Helper 0.6.1 completion (2026-07-29)

Windows Phase 2 local packaging, MSI install, Helper launch, and Photoshop Remove Background Jamie Manual Validation are PASS. The formal onedir bundle and `SPX Helper-0.6.1-x64.msi` use Product Name `SPX Helper`, Product Version `0.6.1`, and unchanged UpgradeCode `{0E9BD5FB-A6F1-472B-8B6B-A395BDEDC941}`. The bundle and MSI payload contain `tools/photoshop/remove-background.jsx`; their content and the repository match after CRLF-to-LF normalization at SHA-256 `467bb19a80850c6a63fe1a40d469727ea396b1d629019b934cffc7e905b3f8fc`. Existing Transparency Skip is included. Runtime Contract, Adapter architecture, WiX UpgradeCode, and Installer Flow were not redesigned. WiX `obj/` is an ignored intermediate, not a deliverable. Existing `v0.6.1` Tag and GitHub Release remain in place; the local commits are not yet pushed, and adding the Windows MSI as a Release asset remains a later decision.

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
