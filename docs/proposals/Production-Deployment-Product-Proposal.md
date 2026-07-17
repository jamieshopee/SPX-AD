# SPX Helper Runtime Productization — Product Proposal

Status: Proposal Freeze／Proposal Audit PASS

## Goal

將既有 SPX Helper Runtime 正式產品化，讓部門同仁第一次安裝一次後，日常只需：

```text
開啟 Photoshop
↓
開啟正式 GitHub Pages（SPX BN 生成器）
↓
開始使用
```

使用者不需 Terminal、CMD、PowerShell、Python、手動執行 Helper 或自行管理 Python。

## Locked Production Architecture

```text
GitHub Pages（SPX BN 生成器）
  ↓ HTTPS
SPX Helper（背景常駐程式）
  ↓
Adobe Photoshop
  ↓
Processed PNG
```

本 Proposal 不修改正式架構、SPX Helper Core、Runtime Contract、Browser API、Frontend、AI Workflow、Review Workspace、Processed Pipeline、GitHub Pages 或 Photoshop Automation。

## Product Positioning

SPX Helper 是部門內部工具，不是對外販售的商業軟體，也不是企業 IT 平台。

- 優先採用簡單、穩定、容易維護的方案。
- 一台電腦安裝一份 SPX Helper，不設計每位使用者一個 Helper。
- 不因少見的多使用者同時登入情境增加 lifecycle 協調。
- 不加入多租戶、帳號、授權、遠端管理、集中部署或其他目前無需求的企業功能。
- Helper 必須在目前登入且實際操作 Photoshop 的桌面工作階段執行，不採 Windows Service 或 macOS 系統層背景服務。

## Product Components

正式產品由以下概念組成：

- Installer：負責安裝、版本資訊、立即啟動及建立平台原生 lifecycle 入口。
- SPX Helper：沿用既有 Core、RuntimeCore、Platform Adapter 與 Runtime Contract。
- Tray／Menu Bar：只提供最小狀態與 lifecycle 操作，不是日常必要步驟。
- Uninstaller：完整移除 Helper 與其安裝項目，但保留使用者工作成果。

## Installation

- 第一次安裝一次即可。
- 安裝完成後不需重新開機或重新登入。
- Installer 完成後自動啟動 SPX Helper，並明確顯示安裝完成且 Helper 正在執行。
- 安裝後建立版本與解除安裝資訊，以及登入自動啟動入口。
- 不要求使用者另行安裝或管理 Python。

## Background Resident

- 安裝完成後立即啟動。
- 登入 Windows 或 macOS 後自動啟動。
- 平時 Idle，不顯示主視窗，也不主動啟動 Photoshop。
- 同一台電腦目前登入的工作階段只允許一個 Helper 實例。
- 日常使用不需要操作 Tray／Menu Bar。

## Tray / Menu Bar

Windows 使用 System Tray Icon，macOS 使用 Menu Bar Icon。

第一版僅提供：

- 狀態：Running／Working／Attention。
- Open SPX BN Generator。
- About。
- Version。
- Restart SPX Helper。
- Quit SPX Helper。

限制：

- 不建立設定中心、Log Viewer 或複雜診斷介面。
- Working 狀態執行 Restart 或 Quit 前，顯示可能中斷工作的警告。

## Quit and Restart

Quit SPX Helper 只停止本次登入期間的 Helper：

- 不解除安裝。
- 不移除登入自動啟動。
- 不永久停用 Helper。
- 下一次登入時仍會自動啟動。
- 停止期間 SPX BN 生成器無法呼叫 Photoshop。
- 使用者可從 Start Menu 或 Applications 手動重新啟動，不需要 Terminal。

第一版不另外提供「永久停用自動啟動」。若使用者自行在 OS 設定停用 Startup／Login Item，只提供簡單恢復指引。

Restart SPX Helper 會停止目前 Helper，再立即建立新的單一 Helper 實例。Working 時先警告。

## Version Update

第一版完全採人工通知：

```text
管理者通知有新版
↓
提供新版 Installer
↓
使用者直接執行 Installer
↓
完成 in-place update
↓
自動重新啟動 Helper
```

- 不要求先解除安裝舊版。
- 保留必要本機設定與版本資訊。
- Helper 正在工作時不強制中斷；提示工作完成後再更新。
- 更新失敗不得留下無法啟動的半套安裝狀態。
- About 可查看 Helper 版本。

第一版不提供 Browser Version Check、GitHub Pages 更新提示、Version Compatibility UI、自動下載、自動更新、Background Update、複雜更新通道、Rollback UI 或企業集中更新平台。

## Uninstall

解除安裝必須：

- 先停止 SPX Helper；Working 時先警告。
- 移除登入自動啟動項目。
- 移除 Helper、Tray／Menu Bar 程式、版本與解除安裝資訊。
- 清除 Helper 自己建立的暫存 Workspace。
- 解除安裝後重新登入，不得再次啟動 Helper。
- 重新安裝後可正常使用。

解除安裝不得刪除：

- 使用者原始素材。
- Processed PNG。
- Project State。
- SPX BN 生成器產出的檔案。
- 其他使用者工作成果。

## Packaging

### Windows

- 第一版採簽署的 MSI。
- 安裝後產品本體為可獨立執行的 SPX Helper。
- 顯示於 Windows Apps & Features。
- 支援標準安裝、in-place update 與解除安裝。
- 目前不使用 EXE Bootstrapper；只有未來出現 MSI 無法處理的 prerequisite 時才重新評估。

### macOS

- 第一版正式交付格式採簽署並完成 Notarization 的 PKG。
- PKG 安裝 SPX Helper.app／Helper bundle；PKG 與 APP 不是二選一。
- SPX Helper.app 是安裝後的產品載體。
- 提供正式 Uninstall SPX Helper 入口，不要求使用者自行尋找或刪除背景元件。

## Cross-platform Product Rules

Windows 與 macOS 維持相同產品概念：

- 相同產品名稱、Icon、版本規則。
- 相同 Install → Background Resident → Update → Uninstall lifecycle。
- 相同 Tray／Menu Bar 功能語意。
- 相同「日常不需操作 Helper」原則。
- 相同「開 Photoshop → 開 GitHub Pages → 使用」流程。

允許平台原生差異：

- Windows：MSI、Apps & Features、System Tray、Startup Apps、Start Menu。
- macOS：PKG、Applications、Menu Bar、Login Items、Uninstaller。

不要求兩平台底層技術完全相同，只要求產品行為與使用者體驗一致。

## Scope

本 Product Proposal 僅涵蓋：

- Installer 與正式產品載體。
- Background Resident 與單一實例。
- Tray／Menu Bar 最小 lifecycle。
- Quit 與 Restart。
- 人工通知加新版 Installer 的 in-place update。
- Uninstall 與 Reinstall。
- Windows MSI 與 macOS PKG／SPX Helper.app。
- 平台簽署、Notarization／Authenticode 與產品級驗收。

## Out of Scope

- SPX Helper Core、Runtime Contract、Browser API、Frontend 或 HTTP API 修改。
- Photoshop Automation、AI Workflow、Review Workspace、Processed Pipeline 或正式架構修改。
- Auto Update、Browser Version Check、Version Compatibility UI。
- Runtime Recovery、AI Workflow Recovery 或執行中 Photoshop 工作恢復。
- 設定中心、Log Viewer、Preferences、Cloud、License 或 Enterprise Features。
- Windows Photoshop API 去背問題。

## Product-level Acceptance Criteria

### Fresh Install

- Windows MSI／macOS PKG 可完成首次安裝並建立正確產品入口、版本與解除安裝資訊。
- 使用者不需另行安裝或管理 Python。

### Install-time Launch

- 安裝後不需重新開機或重新登入，Helper 立即啟動且只存在一個實例。

### Login Launch

- 重新登入後 Helper 自動啟動且只存在一個實例。

### Daily Use

- 使用者只需開啟 Photoshop、開啟正式 GitHub Pages，即可完成既有 Happy Path。
- Helper 平時 Idle，不顯示主視窗、不主動啟動 Photoshop。

### Quit and Manual Relaunch

- Quit 顯示正確說明並停止本次登入期間 Helper，不移除登入自動啟動。
- 可從 Start Menu／Applications 手動重新啟動；下一次登入仍會自動啟動。

### Restart

- Restart 先停止舊 Helper，再建立一個新 Helper；Working 時先警告。
- Restart 後產品可正常使用，且仍只有一個 Helper 實例。

### In-place Update

- 可直接執行新版 Installer，不要求先解除安裝。
- 成功完成 in-place update，保留必要本機設定，並重新啟動 Helper。

### Uninstall

- 正確停止並移除 Helper、登入自動啟動、產品與解除安裝資訊及 Helper 暫存 Workspace。
- 不刪除原始素材、Processed PNG、Project State 或其他工作成果。
- 解除安裝後重新登入不再啟動 Helper。

### Reinstall

- 解除安裝後可重新安裝，並恢復正常日常流程。

## Locked Status

本 Product Proposal 已完成 Freeze 並通過 Proposal Audit。後續 Implementation 不得修改上述產品需求或擴大產品規模。
