# Production Deployment Product Proposal

Status: Proposal Freeze／Audit Recheck PASS

## Goal

將 SPX BN 生成器正式部署給公司同仁使用，作為正式產品，而非 Development Tool。

---

## Target Architecture

### GitHub Pages

- 提供 SPX BN 生成器（Control Center）正式網站。
- 透過 HTTPS 提供正式使用入口。

### SPX Helper

- SPX Helper 是新的正式部署載體。
- 內部沿用既有 Runtime、macOS Adapter、Windows Adapter 與 Runtime Contract。
- 不取代、不重寫既有 Runtime 或 Platform Adapter。
- 第一次安裝一次即可。
- 安裝完成後，於作業系統登入時自動常駐背景執行。
- 僅監聽本機 loopback，不對區域網路或外部網路開放。
- 僅允許正式 GitHub Pages 來源與 SPX Helper 通訊。
- 不需使用者手動開啟 Terminal、Python 或 `.command`。
- 維持單一背景實例。
- 異常終止後應具備恢復機制。

### Adobe Photoshop

- Photoshop 由使用者自行開啟。
- SPX Helper 不自動啟動 Photoshop。
- SPX Helper 負責透過既有 Runtime 與 Photoshop 溝通。

---

## User Workflow

### 第一次使用

1. 安裝 SPX Helper。
2. 完成作業系統要求的安裝與安全性確認。

### 日常使用

1. 開啟 Photoshop。
2. 開啟 SPX BN 生成器（GitHub Pages）。
3. 使用既有功能與既有操作流程。

Photoshop 相關功能需符合以下條件：

- Photoshop 已開啟。
- SPX Helper 正常執行。
- GitHub Pages 與 SPX Helper 版本相容。

---

## Platform Support

正式產品需支援：

- macOS
- Windows

兩個平台均沿用同一套 Runtime Contract，並分別使用既有 macOS Adapter 與 Windows Adapter。

---

## Scope

本 Proposal 僅討論正式部署方式，包括：

- GitHub Pages 正式部署。
- SPX Helper 正式部署載體。
- 既有 Runtime 與 Platform Adapter 的整合。
- macOS／Windows 支援範圍。
- 第一次安裝流程。
- 背景常駐機制。
- 單一背景實例。
- 登入自動啟動。
- 異常終止後的恢復要求。
- GitHub Pages 與 SPX Helper 的本機通訊邊界。
- 正式 GitHub Pages 來源限制。
- 安裝、更新與解除安裝。
- macOS Code Signing 與 Notarization。
- Windows Code Signing 與 Authenticode。
- GitHub Pages 與 SPX Helper 的版本相容規則。

---

## Communication Boundary

- GitHub Pages 透過 HTTPS 提供 Control Center。
- SPX Helper 僅監聽本機 loopback。
- SPX Helper 不對區域網路或外部網路提供服務。
- SPX Helper 僅允許正式 GitHub Pages 來源通訊。
- Frontend 不知道 Platform Adapter 的存在。
- Runtime Contract 維持不變。

---

## Version Compatibility

GitHub Pages 與 SPX Helper 必須具備版本相容判斷。

當版本不相容時：

- 不執行 Photoshop 工作。
- 明確提示使用者更新 SPX Helper 或重新載入正式網站。
- 不以修改 Runtime Contract 解決版本差異。

---

## Installation and Lifecycle

正式部署需包含：

- 第一次安裝。
- 作業系統登入後自動常駐。
- 單一背景實例。
- 異常終止後的恢復。
- 正式更新流程。
- 正式解除安裝流程。
- 移除自動啟動項目與 Helper 本體。

使用者不需：

- 安裝 Python。
- 開啟 Terminal。
- 執行 `.command`。
- 手動啟動 SPX Helper。

---

## Platform Trust Requirements

### macOS

正式版本需完成：

- Code Signing。
- Notarization。
- 符合 macOS 正式安裝與執行要求。

### Windows

正式版本需完成：

- Code Signing。
- Authenticode。
- 符合 Windows 正式安裝與執行要求。

---

## Product-level Acceptance Criteria

macOS 與 Windows 均須驗證以下項目：

1. 首次安裝成功。
2. 使用者不需另行安裝 Python。
3. 使用者不需操作 Terminal、PowerShell 或 `.command`。
4. 重新登入作業系統後，SPX Helper 自動常駐。
5. 同一時間僅有一個 SPX Helper 背景實例。
6. GitHub Pages 可與本機 SPX Helper 正常通訊。
7. SPX Helper 不接受區域網路或外部網路連線。
8. 非正式 GitHub Pages 來源無法呼叫 SPX Helper。
9. 既有 Photoshop Happy Path 可正常完成並產生 Processed PNG。
10. Photoshop 未開啟時，不自動啟動 Photoshop，並回傳既有錯誤狀態。
11. GitHub Pages 與 SPX Helper 版本不相容時，不執行工作並顯示明確提示。
12. SPX Helper 可完成正式更新。
13. SPX Helper 可完成正式解除安裝。
14. 解除安裝後不殘留自動啟動項目。

---

## Out of Scope

本 Proposal 不包含：

- Photoshop Automation 重寫。
- Runtime Contract 修改。
- macOS Adapter 重寫。
- Windows Adapter 重寫。
- AI Workflow 重設計。
- Review Workspace 修改。
- QR Code 修改。
- Render Context 修改。
- 雲端去背。
- Electron。
- 新 UI。
- 其他新功能。

---

## Locked Completed Phases

本 Proposal 不修改任何 Locked Completed Phase。

SPX Helper 僅作為正式部署載體，整合並沿用既有 Runtime、Platform Adapter 與 Runtime Contract。

---

## Next Step

依既有 SOP：

Product Proposal
→ Proposal Freeze
→ Proposal Audit
→ Proposal Revision
→ Proposal Audit Recheck
→ Implementation Proposal
→ Coding
