# DOCUMENTATION.md

本文件是 SPX AD 的文件維護規範。ChatGPT、Codex、Claude 或任何接手者在完成修改前，必須依本文件檢查需要同步更新哪些文件。

## 1. 文件角色（Source of Truth）

| 文件 | 角色 |
|---|---|
| `README.md` | 專案入口、啟動方式、Launcher 使用說明與高層導覽。 |
| `docs/AI-HANDOFF.md` | AI 接手前必讀交接文件，保存目前穩定版本、分支、Phase 狀態、Guardrails 與下一步 Roadmap。 |
| `docs/Architecture.md` | 系統架構、Render Flow、State Boundary、模組責任與跨模組讀寫邊界。 |
| `docs/CHANGELOG.md` | 版本紀錄、已完成 Phase、重要修正、穩定性與設計決策。 |
| `docs/控制台開發指引.md` | 控制台、Canvas、Project State、Thumbnail、Batch Render 的開發規則與禁止事項。 |
| `docs/Photoshop Asset Pipeline.md` | Asset Pipeline、Photoshop Adapter、processed assets、Review Workspace 與後續 approve flow 規格。 |
| `docs/SPX-AD-版型規格與操作說明.md` | 版型規格、素材命名、操作流程與使用者面規則。 |
| `docs/UI Design Guideline.md` | UI 視覺、互動、版面與元件設計規範。 |

## 2. 什麼情況需要更新哪些文件

### 新功能完成

- 必更新：`docs/CHANGELOG.md`
- 若改變架構或資料流：`docs/Architecture.md`
- 若改變 AI 接手狀態、穩定版本、下一步 Roadmap 或 Guardrails：`docs/AI-HANDOFF.md`
- 若改變使用方式：`README.md` 或 `docs/SPX-AD-版型規格與操作說明.md`

### 架構改變

- 必更新：`docs/Architecture.md`
- 若涉及 State Boundary / Render Boundary：`docs/控制台開發指引.md`
- 若影響 AI 接手判斷：`docs/AI-HANDOFF.md`
- 完成後記錄：`docs/CHANGELOG.md`

### Guardrails 改變

- 必更新：`docs/AI-HANDOFF.md`
- 若是控制台或 render 規則：`docs/控制台開發指引.md`
- 若是模組邊界：`docs/Architecture.md`
- 完成後記錄：`docs/CHANGELOG.md`

### UI 改變

- 若影響視覺/互動規範：`docs/UI Design Guideline.md`
- 若影響使用者流程：`docs/SPX-AD-版型規格與操作說明.md` 或 `README.md`
- 若是已完成功能：`docs/CHANGELOG.md`

### Photoshop Pipeline 改變

- 必更新：`docs/Photoshop Asset Pipeline.md`
- 若影響 State Boundary：`docs/Architecture.md` 與 `docs/AI-HANDOFF.md`
- 若是完成節點：`docs/CHANGELOG.md`

### 使用流程或 Launcher 改變

- 必更新：`README.md`
- 若是使用者操作流程：`docs/SPX-AD-版型規格與操作說明.md`
- 若是穩定性修正：`docs/CHANGELOG.md`

### Project State / layoutStates / Render Context 改變

- 必更新：`docs/Architecture.md`
- 必檢查：`docs/控制台開發指引.md`
- 若影響接手者判斷：`docs/AI-HANDOFF.md`
- 完成後記錄：`docs/CHANGELOG.md`


## Completed Phase Rule

凡標記為 Completed 的 Phase：

- 不重新 Proposal。
- 不重新設計。
- 不重新命名。
- 不因新對話重新討論。
- 不因 AI 建議而重新開啟。

只有以下情況可以重新開啟：

- Bug Fix
- 使用者要求
- Architecture 明確改版

所有 AI（包含 ChatGPT、Codex、Claude）開始任何新 Phase 前，必須：

1. 先確認目前 Active Phase。
2. 確認是否會影響 Locked Completed Phases。
3. 若會影響，先提出 Proposal，由使用者批准後才能修改。

## 3. Phase Completion Checklist

完成一個 Phase 或穩定節點前，請依序檢查：

- [ ] Browser 驗收完成，或明確記錄無法驗收的原因。
- [ ] Git Commit（Code）已完成，或明確標示尚未 commit。
- [ ] 依本文件檢查需要更新哪些文件。
- [ ] 更新文件。
- [ ] Review 文件內容是否與實作一致。
- [ ] Git Commit（Docs）已完成，或明確標示尚未 commit。
- [ ] 更新 `docs/AI-HANDOFF.md` 的穩定版本、分支、Phase 狀態或下一步 Roadmap（如適用）。
- [ ] Git Tag（穩定版本）已建立，或明確標示尚未 tag。

## 4. AI 接手規則

- AI 修改前必須先閱讀 `docs/AI-HANDOFF.md`。
- AI 不可自行猜測要更新哪些文件，必須依 `docs/DOCUMENTATION.md` 檢查。
- 若使用者要求「只更新文件」，不可修改 JS / HTML / CSS / Template / Pipeline / Render Flow。
- 若使用者要求「不要修改程式」，只能分析、規劃或更新文件。
- 若文件規範與當前需求衝突，先提出問題或 Proposal，不可自行擴大範圍。

## 5. 最小文件更新原則

- 文件更新應與本輪修改直接相關。
- 不為了整理而重寫大段文件。
- 不把 CHANGELOG 當成完整設計文件；設計與邊界應放在 Architecture、AI-HANDOFF 或專屬規格文件。
- 不把 AI-HANDOFF 當 README；AI-HANDOFF 只保留接手需要的目前狀態、邊界與 Roadmap。
