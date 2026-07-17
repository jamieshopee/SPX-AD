# SPX AD 電子版位管理器

## 如何啟動

- 控制台：雙擊 `launch/啟動 AD 管理器（Chrome）.command`
- 編輯器：雙擊 `launch/啟動編輯器_*.command`

SPX Helper Core、Runtime Productization Phase 1 Foundation 與 Phase 2 Windows Packaging 已完成。Windows 正式產品使用 PyInstaller executable bundle 與 WiX Toolset SDK 5.0.2 MSI，安裝後可背景常駐並完成 GitHub Pages → SPX Helper → Photoshop → Processed PNG；Windows Packaging configuration、Product Foundation 與 Jamie Manual Validation 均 PASS。macOS PKG、跨平台 Update／Uninstall 與 Final Validation 仍屬後續 Phase。開發驗證入口仍為 `tools/photoshop-automation/spx_helper_product.py`，不是正式 Windows 使用者啟動方式。

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
