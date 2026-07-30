# SPX AD 電子版位管理器

## 如何啟動

- 控制台：雙擊 `launch/啟動 AD 管理器（Chrome）.command`
- 編輯器：雙擊 `launch/啟動編輯器_*.command`

SPX Helper Runtime Productization Phase 1 Foundation、Phase 2 Windows Packaging 與 Phase 3 macOS Packaging 均已完成。Windows 與 macOS 正式產品版本現為 `0.6.2`；開發驗證入口仍為 `tools/photoshop-automation/spx_helper_product.py`，不是正式使用者啟動方式。Phase 4 — Update + Uninstall 與 Phase 5 Final Validation 尚未開始。

## macOS SPX Helper 0.6.2 completion (2026-07-30)

macOS Packaging Commit `3a8e925e773338491abb03b3c6cc7fdd60a0994f`（`chore: package macOS Helper 0.6.2`）已將 Product Host、App bundle、PKG metadata、輸出檔名與 validators 同步為 `0.6.2`，並產生 `SPX Helper.app` 與 `SPX Helper-0.6.2.pkg`。Bundle Identifier `com.spxad.helper`、Package Identifier `com.spxad.helper.pkg`、LaunchAgent `com.spxad.helper`、`/Applications/SPX Helper.app`、`RunAtLoad = true`、無 `KeepAlive`、component `upgrade` 與不可 relocation 均維持既有正式值。

Static packaging、PyInstaller App build、structural codesign、component plist、`pkgbuild`、`productbuild`、PKG metadata／payload 與 Product Host lifecycle 29 項 regression 均 PASS；Jamie 已完成安裝與 Manual Validation，包含 Menu Bar、Version `0.6.2`、無 Dock icon／Terminal window、`/ready`、LaunchAgent、package receipt、Photoshop 2026 去背，以及 WebP content + `.png` filename 隔離為 `background_removal_failed` 後續素材繼續完成。Repository、App bundle 與 PKG payload 的 `remove-background.jsx` byte-for-byte 一致，SHA-256 為 `796680519c488f53587d385a06785d3aac6059e4530953c598ec6e56ee8e89a7`；PKG SHA-256 為 `32b55924db02074c35292a03edd564f3b98032e74565e4f1f310c8fbe50dd596`。

本機沒有有效 Developer ID Application／Installer identity，因此 App 為 ad-hoc signature、PKG 未簽章，未執行 notarization／stapling；Gatekeeper rejection 是 local unsigned build 的預期結果，不得記為正式簽章或 notarization PASS。PyInstaller 僅有既有條件式、跨平台或 optional-module warnings，無 Build Error。尚未 Push；尚未建立 Tag／Release；亦未上傳 PKG。

## Windows SPX Helper 0.6.2 completion (2026-07-30)

Windows Phase 2 packaging, MSI install, Helper Ready, and Photoshop 2026 Remove Background Jamie Manual Validation are PASS. The formal onedir bundle and `SPX Helper-0.6.2-x64.msi` use Product Name `SPX Helper`, Product Version `0.6.2`, and unchanged UpgradeCode `{0E9BD5FB-A6F1-472B-8B6B-A395BDEDC941}`. The bundle and MSI payload contain the shared `tools/photoshop/remove-background.jsx`; the repository and bundle match after CRLF-to-LF normalization at SHA-256 `796680519c488f53587d385a06785d3aac6059e4530953c598ec6e56ee8e89a7`. This payload includes the committed WebP-content-with-`.png`-filename guard: the affected asset is isolated as `background_removal_failed`, later assets continue, and the existing Review Workspace failure flow is preserved. Existing Transparency Skip is included. Runtime Contract, Adapter architecture, WiX UpgradeCode, and Installer Flow were not redesigned. WiX `obj/` is an ignored intermediate, not a deliverable. No new Tag or Release was created, and the MSI was not uploaded.

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
