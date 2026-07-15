# Production Deployment Product Proposal

## Goal

將 SPX BN 生成器正式部署給公司同仁使用，作為正式產品，而非 Development Tool。

---

## Target Architecture

**GitHub Pages**
- 提供 SPX BN 生成器（Control Center）正式網站。

**SPX Helper（新）**
- 取代目前 Development Runtime。
- 第一次安裝一次即可。
- 安裝後於背景自動執行。
- 不需使用者手動開啟 Terminal、Python 或 `.command`。

**Adobe Photoshop**
- 使用者維持自行開啟 Photoshop。
- SPX Helper 負責與 Photoshop 溝通。

---

## User Workflow

**第一次使用**
1. 安裝 SPX Helper。

**日常使用**
1. 開啟 Photoshop。
2. 開啟 SPX BN 生成器（GitHub Pages）。
3. 正常使用所有功能。

---

## Scope

本 Proposal 僅討論正式部署方式，包括：
- GitHub Pages 正式部署。
- SPX Helper 架構。
- 第一次安裝流程。
- 背景自動執行機制。
- 前端與 SPX Helper 的通訊方式。
- 更新機制。

---

## Out of Scope

本 Proposal 不包含：
- Photoshop Automation 重寫。
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

本 Proposal 不修改任何 Locked Completed Phase，只新增正式 Deployment Architecture。

---

## Next Step

依既有 SOP：

Product Proposal
→ Proposal Freeze
→ Proposal Audit
→ Proposal Revision（如需要）
→ Implementation Proposal
→ Coding
