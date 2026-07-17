# SPX Helper Runtime Productization — Implementation Proposal

Status: Implementation Proposal Audit PASS

Phase Status: Phase 1 Foundation Completed；Phase 2 Windows Packaging Completed；Phase 3 macOS Packaging Completed；Next: Phase 4 — Update + Uninstall（Not Started）

## Goal

依已 Freeze 且 Proposal Audit PASS 的 Product Proposal，將既有 SPX Helper Core 落地為 Windows／macOS 正式背景產品。

正式架構維持不變：

```text
GitHub Pages（SPX BN 生成器）
  ↓ HTTPS
SPX Helper（背景常駐程式）
  ↓
Adobe Photoshop
  ↓
Processed PNG
```

不得修改 SPX Helper Core、Runtime Contract、Browser API、Frontend、HTTP API、Platform Adapter、Photoshop Automation、AI Workflow、Review Workspace 或 Processed Pipeline。

## Implementation Boundaries

- Productization 是既有 Helper Core 的產品載體與 lifecycle 外層，不重新實作 Runtime。
- Windows 與 macOS 共用相同產品名稱、版本規則、Icon、狀態與 lifecycle 語意。
- 平台可使用各自原生安裝、啟動、Tray／Menu Bar 與解除安裝能力。
- 第一版不包含 Auto Update、Browser Version Check、Version Compatibility UI、Log Viewer、Preferences、Cloud、License 或企業管理功能。

## Product Structure

### Installer

- 安裝正式產品檔案、平台原生啟動入口、版本與解除安裝資訊。
- Fresh Install 完成後立即啟動 Helper，不要求重新登入或重新開機。
- 後續以同一產品身份支援 in-place update。

### SPX Helper Product Host

- 組合既有、未修改的 SPX Helper Core 與 RuntimeCore。
- 管理 Running／Working／Attention、單一實例、Idle、Quit 與 Restart。
- 不改變既有 localhost HTTP 邊界或 Runtime response。

### Tray / Menu Bar

- Windows 使用 System Tray；macOS 使用 Menu Bar。
- 僅提供狀態、Open SPX BN Generator、About、Version、Restart SPX Helper、Quit SPX Helper。
- Working 時執行 Restart／Quit 前警告可能中斷工作。

### Uninstaller

- 停止 Helper，移除登入自動啟動、產品檔案、版本／解除安裝資訊與 Helper 暫存 Workspace。
- 保留原始素材、Processed PNG、Project State 與所有使用者工作成果。

## Background Lifecycle

```text
Install 完成或使用者登入
↓
啟動 Product Host
↓
確認單一 Helper Instance
↓
Running（Idle）
↓ Browser 工作
Working
↓ 工作完成
Running
```

- Helper 不顯示主視窗，也不主動啟動 Photoshop。
- Quit 只停止本次登入期間；不移除登入自動啟動，下一次登入仍啟動。
- Restart 先停止舊 Helper，再立即啟動新 Helper，最後仍只有一個實例。
- Attention 表示 Product Host 無法建立正常 Helper lifecycle，需要使用者注意。

## Update Flow

```text
管理者人工通知新版
↓
提供新版 Installer
↓
使用者執行 Installer
↓
確認 Helper 不在 Working
↓
in-place update
↓
重新啟動 Helper
```

- 不要求先解除安裝舊版。
- 保留必要本機設定與版本資訊。
- Working 時不強制中斷更新。
- 第一版不實作自動下載或自動更新。

## Uninstall Flow

```text
啟動正式 Uninstall 入口
↓
若 Working，警告並確認
↓
停止 Helper
↓
移除登入自動啟動與產品元件
↓
清除 Helper 暫存 Workspace
↓
保留所有使用者工作成果
```

解除安裝後重新登入不得再次啟動 Helper；Reinstall 必須可恢復正常使用。

## Windows Product Structure

- 正式交付格式：簽署 MSI。
- 安裝獨立執行的 SPX Helper Product Host。
- 建立 Startup、Start Menu、Apps & Features 與標準解除安裝資訊。
- Fresh Install 完成後立即啟動。
- 不使用 EXE Bootstrapper，除非未來出現 MSI 無法處理的 prerequisite。

## macOS Product Structure

- 正式交付格式：簽署並完成 Notarization 的 PKG。
- PKG 安裝 SPX Helper.app／Helper bundle 至 Applications。
- 建立 Login Item 與 Menu Bar lifecycle。
- 提供正式 Uninstall SPX Helper 入口。
- Fresh Install 完成後立即啟動。

## Implementation Phases

### Phase 1 — Foundation（Completed）

完成：

- Product Foundation／Product Host。
- Background lifecycle 與 Idle。
- Running／Working／Attention。
- 單一 Helper Instance。
- Tray／Menu Bar 固定功能。
- Quit 與 Restart。
- Browser／Platform Validation。
- Jamie Manual Validation。

實際 Code Commit：`51c4828`（`feat: add SPX Helper product foundation`）。

Phase 1 未包含 Installer、MSI、PKG、登入自動啟動、Update、Uninstall 或 Final Validation。

### Phase 2 — Windows Packaging（Completed）

完成範圍：

- Windows MSI。
- Fresh Install。
- 安裝後立即啟動。
- Startup。
- Start Menu。
- Apps & Features。
- Windows Validation。

實際完成：PyInstaller executable bundle、WiX Toolset SDK 5.0.2 per-machine MSI 與上述 Windows lifecycle。功能 Commit：`9240504`（`feat: add Phase 2 Windows packaging`）。Windows Packaging configuration、MSI Build／Install 與 GitHub Pages → SPX Helper → Photoshop → Processed PNG 均已實機 PASS。

Known Issue：同一 Windows 環境中，Version／About Information Dialog 與部分 Installer Dialog 的關閉事件異常；不影響 Packaging、Runtime、Browser API、Photoshop Automation 或正式去背流程，另案處理。

### Phase 3 — macOS Packaging（Completed）

完成範圍：

- macOS PKG。
- SPX Helper.app。
- Login Items。
- Applications。
- Menu Bar 正式產品載體。
- Signing／Notarization。
- macOS Validation。

實際完成：PyInstaller `SPX Helper.app`、正式 macOS PKG build pipeline、`/Applications/SPX Helper.app`、LaunchAgent Login Startup、Applications 手動啟動入口、Menu Bar 與 macOS validation。功能 Commit：`ee55dd527a00361f1155ba45713ff2ce3957b06c`（`feat: add Phase 3 macOS packaging`）。macOS Packaging Static Validation、local app／PKG Build Validation、Install Validation 與 Jamie Manual Validation 均 PASS；正式 GitHub Pages → SPX Helper → Photoshop → Processed PNG PASS。

PKG relocation 問題以 component plist 的 `RootRelativeBundlePath = Applications/SPX Helper.app` 與 `BundleIsRelocatable = false` 修正，並在 staging App 保留的情況下重驗；最終安裝位置正確且 Fresh Install PASS。

Credential-dependent validation：Release pipeline 已包含 Developer ID Application／Installer signing 與 Apple Notarization 步驟，但目前機器沒有有效 signing identities／notary credentials，因此尚未驗證，不宣稱 PASS。

### Phase 4 — Update + Uninstall（Not Started）

完成範圍：

- 人工通知與新版 Installer。
- In-place Update。
- Uninstall。
- Reinstall。
- 保留使用者工作成果。

### Phase 5 — Final Validation（Not Started）

完成範圍：

- Windows 全流程 Validation。
- macOS 全流程 Validation。
- Product-level Acceptance Criteria。
- Jamie Manual Validation。

## Phase 2 Guardrails

Phase 2 只處理 Windows Packaging，不得：

- 修改已完成的 Phase 1 Foundation lifecycle。
- 修改 SPX Helper Core、Runtime Contract、Browser API、Frontend 或 HTTP API。
- 修改 Platform Adapter、Photoshop Automation、AI Workflow、Review Workspace 或 Processed Pipeline。
- 開始 macOS PKG、Update、Uninstall 或 Final Validation。
- 新增 Auto Update、Browser Version Check、Version Compatibility UI 或其他未核准功能。

## Current Status

Phase 1 Foundation、Phase 2 Windows Packaging 與 Phase 3 macOS Packaging 已正式完成。Phase 3 功能 Commit 為 `ee55dd527a00361f1155ba45713ff2ce3957b06c`，macOS local app／PKG Build、Install Validation 與 Jamie Manual Validation 均 PASS；Developer ID／Notarization 為尚未驗證的 Credential-dependent validation。下一步為 Phase 4 — Update + Uninstall（Not Started）；Phase 5 Final Validation 尚未開始。
