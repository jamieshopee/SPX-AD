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


### Locked Completed Phase List

以下屬於 Locked Completed Phase（與 `docs/AI-HANDOFF.md` 的 Completed 清單完全一致）：

- CSV
- Photoshop Pipeline
- Review Workspace
- Approved Asset Resolver
- Main Canvas & Thumbnail use processed asset
- Batch Approved Assets
- Render Context
- Master + Style
- Project State
- Smart Layout Propagation
- Review Workspace（Crop / Eraser）
- Photoshop Rerun Automation
- Review Workspace UX Polish
- Project Persistence
- UI Upgrade（Control Center UI Upgrade + Review Workspace UI Upgrade）
- Photoshop Automation（macOS 與 Windows Development Validated）
- AI Workflow（macOS 與 Windows Development Validated）
- Render Context & Export Workflow（Batch Render 輸出 placement／template Bug Fix；Tag `v0.5.1`）
- QR Code（CSV `QRcode` 欄位網址自動產生、控制台右側欄手動修改、四尺寸 Locked Visual Baseline；功能 Commit `79de045`、Tag `v0.5.2`）
- SPX Helper Core（正式 localhost 邊界、Origin / CORS、單一實例邊界、既有 RuntimeCore Integration；功能 Commit `9a71794`；installer／auto-start／update／signing／packaging 不在此完成範圍）
- SPX Helper Runtime Productization — Phase 1 Foundation（Product Host、Running / Working / Attention、單一 Helper Instance、Tray / Menu Bar、Quit、Restart；功能 Commit `51c4828`）
- SPX Helper Runtime Productization — Phase 2 Windows Packaging（PyInstaller executable bundle、WiX Toolset SDK 5.0.2 per-machine MSI、Fresh Install、登入自動啟動、Start Menu、Apps & Features、Windows Validation；功能 Commit `9240504`）
- SPX Helper Runtime Productization — Phase 3 macOS Packaging（PyInstaller `SPX Helper.app`、macOS PKG、Applications、LaunchAgent、Login Startup、Menu Bar、macOS Validation；功能 Commit `ee55dd527a00361f1155ba45713ff2ce3957b06c`；Developer ID／Notarization 為 Credential-dependent validation）

Known Issue：同一 Windows 環境中，Version／About Information Dialog 與部分 Installer Dialog 的關閉事件異常；不影響 Packaging、Runtime、Browser API、Photoshop Automation 或正式去背流程，另案處理。

注意命名：「Photoshop Rerun Automation」（已完成的人工匯出流程）與「Photoshop Automation」（已完成的 Photoshop 端 Runtime／Adapter 能力）是兩個不同、皆已完成的 Phase，不得混用或誤植。「Render Context」（Phase 2D-2B-2，Thumbnail 共用 Render Context 概念，已完成）與「Render Context & Export Workflow」（本清單新增的 Phase，Batch Render 輸出 placement／template Bug Fix，已完成）也是兩個不同、皆已完成的 Phase，不得混用。Windows Validation 與 Jamie Manual Validation 已在 Photoshop 2025 實機 PASS；不得將此結果延伸為支援所有 Photoshop 版本。

不得：

- 重新 Proposal
- 重新設計
- 重新命名

除非：

- Bug Fix
- User Request
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
- [ ] Documentation Validation：確認 Git Tag / Branch / Active Phase / Current Status / Roadmap 是否同步。
- [ ] 更新 `docs/AI-HANDOFF.md` 的穩定版本、分支、Phase 狀態或下一步 Roadmap（如適用）。
- [ ] Git Commit（Docs）已完成，或明確標示尚未 commit。
- [ ] Git Tag（穩定版本）已建立，或明確標示尚未 tag。

## Release Flow

固定流程：

```text
Product Proposal（ChatGPT）
↓
Proposal Freeze
↓
Proposal Audit（Codex / Claude）
↓
Proposal Revision（ChatGPT）
↓
Implementation Proposal
↓
Coding（Codex）
↓
Browser Validation（Codex）
↓
Jamie Manual Validation
↓
Code Commit
↓
Documentation Update
↓
Documentation Validation（確認 Git Tag / Branch / Active Phase / Current Status / Roadmap 已同步）
↓
Docs Commit
↓
確認 git status clean
↓
Git Tag（建立在最新 commit）
↓
確認 Tag 指向 HEAD
↓
Next Phase / Next Branch / New ChatGPT Conversation
```

Proposal Audit 規則：

- Proposal Audit 不是 Coding，不得在 Audit 階段修改功能程式或開始實作。
- Proposal Audit 的目的：技術可行性檢查、Architecture / State Boundary 檢查、Locked Completed Phases 影響檢查、Scope creep 檢查，以及 edge cases / Browser Validation risk 檢查。
- 在 Proposal Freeze 前，不得進入 Implementation Proposal。
- 在 Proposal Audit PASS 或 Proposal Revision 完成前，不得 Coding。
- 若 Proposal Audit 發現會影響 Locked Completed Phases，必須停止並回報，不得自行修改。
- 此 SOP 適用所有後續 Phase，不只單一特定 Phase。

角色分工：

- ChatGPT：負責 Product Proposal、UX、Workflow、Information Architecture 與 Proposal Revision。
- Codex / Claude：負責 Proposal Audit、Implementation Proposal、Coding 與 Browser Validation。
- Jamie：負責產品決策、Manual Validation，以及是否進入 commit / tag。

Browser Validation 規則：

- Browser Validation（Codex / Claude）不得只回覆 `PASS`。
- Codex / Claude 不得要求 Jamie 協助完成 Browser Validation。
- Browser Validation 完成並提交 Report 後，才能交由 Jamie Manual Validation。
- Browser Validation Report 至少必須包含：
  - Test Environment：Branch、Browser、Commit（若適用）。
  - Test Scope：本次驗證功能範圍。
  - Test Cases：每個測試案例需列出測試項目、操作步驟、預期結果、實際結果、PASS / FAIL。
  - Regression Validation：明確列出驗證了哪些既有功能、哪些未驗證；不得只寫「沒有影響」。
  - Known Issues：若沒有問題，需明確寫 `No Known Issues`。
  - Final Result：明確說明是否可交 Jamie Manual Validation，以及是否仍有 Blocking Issue。

Jamie Manual Validation 規則：

- Jamie Manual Validation 是產品驗收，不是 Browser Validation。
- Jamie 驗收時需明確回覆驗收項目、PASS / FAIL。
- 若 FAIL，需描述 Issue 與重現方式。
- Jamie Manual Validation PASS 後，才能進入 Code Commit。

Release 規則：

- Git Tag 必須建立在最新 commit。
- AI-HANDOFF 的穩定版本號必須在 Git Tag 前完成更新並 commit。
- 不得在 Git Tag 後才補版本號文件。
- Codex 修改後必須先自行完成 Browser 驗收，全部 PASS 後才交給 Jamie 人工驗收。
- Jamie 人工驗收通過後，才可以進入 Code Commit。
- 每次文件更新必須一次列出所有需要更新的 md，不得分批猜測。
- Docs Update 後、Docs Commit 前，必須完成 Documentation Validation：確認 Git Tag / Branch / Active Phase / Current Status / Roadmap 是否同步。


### Review Workspace Phase SOP

Review Workspace（Crop / Eraser）Phase 已採用並驗證以下開發流程：

```text
Proposal
↓
Audit（Codex）
↓
Implementation Proposal
↓
Implementation Audit（Codex）
↓
Coding
↓
Browser Validation（Codex）
↓
Jamie Manual Validation
↓
Code Commit
↓
Phase Retrospective
↓
Documentation Update
↓
Docs Commit
↓
Git Tag
↓
Next Branch
```

Browser Validation 用途：驗證功能是否正確。

Jamie Manual Validation 用途：驗證操作是否符合產品預期。

兩者缺一不可。

### Review Workspace UX Polish Rules

Review Workspace UX Polish 已完成並列入 Locked Completed Phase。後續不得重新設計既有 Review workflow，除非屬於 Bug Fix、User Request 或 Architecture 明確改版。

UX 規範：

- Auto Next：`Approve` 或 `Needs Rerun` 儲存 decision 後自動前往下一張；最後一張停留並顯示 completed header。
- Multi-pass Review：支援 `All Assets` 與 `Needs Rerun Only`。Needs Rerun rerun 後可用 runtime-only subset 回到第二輪 review。
- Remove Drag Tool：不保留 persistent Drag Tool。Pan 是 momentary action，不是 persistent tool。
- Keyboard Shortcuts：Review Workspace 開啟時才啟用；焦點在文字輸入、slider 或可編輯元件時不得攔截。
- Review Progress Header：依目前 filter 顯示 `current / total`、Approved count 與 Needs Rerun count。
- Smart Entry：重新開啟時優先定位未 review asset；已 approved 不得被當成未 review。
- Decision Guard：`Undo Last Decision` 只撤回上一個 `Approve` / `Needs Rerun` decision，runtime-only，不新增 Project State history schema。

### Review Workspace UX Decisions

Crop：

- Wheel Zoom：Disabled
- Space Pan：Disabled
- Double Click Fit：Disabled

Eraser：

- Wheel Zoom：Enabled
- Zoom to Cursor
- Space Pan
- Double Click Fit

### Review Workspace Runtime Boundary

Save 只更新 Runtime Processed Asset。

不得修改：

- Canvas
- Thumbnail
- Batch
- Resolver API
- Project State schema
- Photoshop Pipeline

## Project Persistence Rules

Project Persistence 已完成並列入 Locked Completed Phase。後續不得重新設計 Workspace Save / Restore contract，除非屬於 Bug Fix、User Request 或 Architecture 明確改版。

### Project Save = Workspace Save

- 專案保存必須代表目前工作區狀態。
- Restore 後應回到存檔當下可繼續工作的狀態。
- Restore 包含 jobs、文字、Template、Style、`layoutStates`、Review decision 與 latest processed image。

### single-state Restore

- `single-state.json` 使用 Project State v5。
- 可內嵌單張工單需要的 processed image `dataUrl`。
- 匯入後不需要重新 Import Processed Folder。
- 匯入後 Review Workspace、Main Canvas、Thumbnail、Batch resolver 都應使用 restored latest processed image。

### project.zip Restore

- 完整專案 ZIP 內含 `project-state.json` 與 `processed/`。
- `project-state.json` 的 `processedAssets` 只保存 `filename`，不保存 `dataUrl`。
- `processed/` 保存 latest processed image。
- 匯入後由 Persistence Layer 重建 runtime `processedAssetIndex`。

### Download Complete Project

- 使用者主要下載流程為「下載完整專案」。
- ZIP 內包含所有輸出 PNG、`project-state.json` 與 `processed/`。
- 不再要求使用者理解「批次產圖」與「專案 ZIP」的差異。

### Latest Processed Image Persistence

- 永遠只有 latest processed image。
- 不建立 version history。
- 不新增 `edited.png`、`cleaned.png`、`processed_v2.png` 或 version folders。
- 新 Photoshop output 或 Review Workspace Save 會覆蓋目前 processed image。

### Review Workspace Save Contract

- Review Workspace 仍是唯一可以修改 processed image 的地方。
- Crop / Eraser Save 只更新 runtime processed asset。
- Persistence Export 從 runtime processed asset 收集 latest processed image。
- Save 不自動 Approve、不改 Review decision、不直接改 Canvas / Thumbnail / Batch 架構。

## Control Center UI Upgrade Rules

Control Center UI Upgrade 已完成並列入 Locked Completed Phase。後續不得重新設計控制台主流程，除非屬於 Bug Fix、User Request 或 Architecture 明確改版。

- Header 固定一般使用者主入口：匯入CSV、匯入暫存、選擇素材資料夾、素材審核。
- 一般使用者 UI 不顯示 Photoshop / Manifest / Processed Folder 等技術術語。
- Manifest export、Processed Folder import、Rerun manifest 等底層能力可保留，但不得重新暴露為一般使用者主入口，除非使用者明確要求。
- 素材審核入口只負責狀態呈現與開啟既有 Review Workspace，不重新設計 Review Workspace、Decision Model 或 Rerun Architecture。
- 中央版位排序只能改 display order，不得修改 placementId、templateId、layoutState key 或 Project State schema。

## Future Phase Order

After Review Workspace UI Upgrade v0.4.5, Photoshop Automation and AI Workflow were completed and reached Final Sign-off (Tag v0.5.0). macOS and Windows Development Validation have now passed on Photoshop 2025, including Jamie Manual Validation on Windows. Render Context & Export Workflow subsequently completed its Batch Render placement/template Bug Fix and reached Final Sign-off (Tag v0.5.1). QR Code subsequently completed Coding, Browser Validation and Jamie Manual Validation (functional Commit `79de045`, Tag `v0.5.2`). The planned phase order is now fully completed:

1. Photoshop Automation（Completed）
2. AI Workflow（Completed）
3. Render Context & Export Workflow（Completed — Batch Render placement/template Bug Fix, Tag `v0.5.1`）
4. QR Code（Completed — CSV `QRcode` field-driven QR generation, functional Commit `79de045`, Tag `v0.5.2`）

SPX Helper Core subsequently completed Coding and macOS／Windows Jamie Manual Validation (functional Commit `9a71794`). SPX Helper Runtime Productization Phase 1 Foundation completed Product Host lifecycle (functional Commit `51c4828`), Phase 2 Windows Packaging completed the PyInstaller executable bundle, WiX Toolset SDK 5.0.2 MSI, and Windows validation (functional Commit `9240504`), and Phase 3 macOS Packaging completed the PyInstaller app bundle, macOS PKG, Applications install, LaunchAgent login startup, and macOS validation (functional Commit `ee55dd527a00361f1155ba45713ff2ce3957b06c`). Developer ID signing and Apple Notarization remain credential-dependent and unverified. Branch is `main`; the next phase is **Phase 4 — Update + Uninstall (Not Started)**. Phase 5 Final Validation has not started.

Rules：

- This order is locked unless changed by the product owner.
- Future AI sessions must follow this order by default.
- Do not propose a different next phase unless the product owner explicitly asks.
- Completed phases must remain locked.
- SPX Helper Runtime Productization Phase 1 Foundation, Phase 2 Windows Packaging, and Phase 3 macOS Packaging are Completed and locked; Phase 4–5 must not be described as completed.
- Completed Review Workspace phases remain locked, including Review Workspace UI Upgrade.
- Photoshop Automation and AI Workflow are Completed for macOS and Windows Development on Photoshop 2025. Neither must be redesigned, re-Proposaled, or renamed except for Bug Fix, User Request, or an explicit Architecture change — the same Completed Phase rule as any other Locked Completed Phase.
- Render Context & Export Workflow is Completed and locked (Tag `v0.5.1`). Must not be redesigned, re-Proposaled, or renamed except for Bug Fix, User Request, or an explicit Architecture change.
- QR Code is Completed and locked (functional Commit `79de045`, Tag `v0.5.2`). Must not be redesigned, re-Proposaled, or renamed except for Bug Fix, User Request, or an explicit Architecture change. The CSV column-matching rule (exact match on `QRcode` after cleaning, not a loose substring match) is Locked — real submission sheets contain other SPX-internal columns that also contain the substring "QRcode".
- Windows Development Validation and Jamie Manual Validation are PASS on Photoshop 2025. macOS Phase 3 local build／install and Jamie Manual Validation are PASS, but Developer ID signing and Apple Notarization are not. Do not generalize either result to unvalidated Photoshop versions or credential-dependent release validation.
- SPX Helper Core is Completed and locked. Windows and macOS installer／auto-start packaging are complete; update、uninstall、final validation、credential-dependent macOS signing／notarization、compatibility and recovery remain explicitly pending where applicable.
- Extension System has been removed from the roadmap (not Completed, not Current, not Next, not in Next Planned Phase Order). There is currently no product need for new Review Workspace tooling beyond 核准 / 重新去背 / 裁切 / 橡皮擦. If a concrete need appears later, the product owner will open a new Proposal for it rather than reserving a phase slot now.

## Photoshop Automation Rules（Completed）

Photoshop Automation 已完成（macOS 與 Windows Development Validated），是 AI Workflow 的前置依賴。Photoshop Automation 是「Photoshop 端」的自動處理能力，不是 Control Center orchestration；Control Center 端的自動化屬於 AI Workflow（見下方責任切分）。

- 前提：所有使用者已安裝 Adobe Photoshop，並會在使用控制台前自行開啟 Photoshop。本 Phase 不負責自動安裝、自動啟動或自動關閉 Photoshop。
- 已完成：定義並實作 Photoshop Ready / Execution / Status / Result Contract（見 `docs/Architecture.md` Photoshop Automation Architecture）；接收既有格式的 Photoshop Job Manifest / Rerun Manifest；呼叫並沿用既有 `remove-background.jsx` 去背核心；背景執行批次素材處理；輸出既有格式的 processed assets；產生 Progress / Completion / Partial Failure / Failure 狀態與 Run Report / Status Contract；SPX AD Runtime（`tools/photoshop-automation/spx_ad_runtime.py`）、macOS Adapter、Windows Adapter 皆已實作。
- **不負責**：Control Center Processing Mode UI、Control Center 自動 Import Processed Result、自動開啟 Review Workspace、AI Workflow 的整體使用者流程。這些是 AI Workflow 的責任，Photoshop Automation 只提供 Photoshop 端能力與狀態契約供 AI Workflow 呼叫。
- 現況：既有一次性 AppleScript + JSX Runner（`tools/photoshop/`）仍保留、未被移除，與新的 Runtime 並存；Runtime 隱藏、自動管理 Workspace，具備 Pending Execution Timeout 與 stale Workspace 清理，不建立使用者可見的 Run 資料夾。
- 不修改：Review Workspace UI、Navigator、Dynamic Inspector、Decision Area、Completion Screen、Crop / Eraser、Canvas、Thumbnail、Batch、`layoutStates`、Approved Asset Resolver、Project State schema、Review Decision Model。

### Photoshop Automation 與 AI Workflow 責任切分（Locked，兩者不得重疊）

AI Workflow 是 Control Center 與既有模組之間的 Workflow Orchestration，依賴已完成的 Photoshop Automation：

- 負責：使用既有 `buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest` 建立 Manifest；透過 Photoshop Automation 已確立的 Contract 送出工作；執行 Photoshop Ready Check 的 Control Center 端流程（顯示「Photoshop 已關閉」與「重新檢查」）；顯示並鎖定 Processing Mode；讀取 Photoshop Automation 回報的狀態；沿用既有 Matching 函式自動掃描與 Import；自動開啟既有 Review Workspace；串接第一輪全部素材審閱與 Rerun 後的待重新去背第二輪審閱、返回控制台；提供 Error / Recovery。
- 不負責：實作 Photoshop 去背核心；修改 Manifest schema；修改 Photoshop Adapter Boundary；修改 Review Workspace UI / Navigator / Dynamic Inspector / Decision Area / Completion Screen；修改 Canvas / Thumbnail / Batch；修改 `layoutStates`；修改 Project State schema；修改 Approved Asset Resolver；修改 Review Decision Model。

## Review Workspace UI Upgrade Rules

Review Workspace UI Upgrade 已完成並列入 Locked Completed Phase。後續不得重新設計 Navigator、Dynamic Inspector、Decision Area 或 Completion Screen，除非屬於 Bug Fix、User Request 或 Architecture 明確改版。

- Navigator 只顯示檔名、Review Status、Dirty Status；不顯示 Role / Job ID / Slot / Asset Key / Processed Filename / Mode。
- Review Summary 與 Filter（全部素材／待重新去背／去背失敗）固定在 Navigator 上方。
- Workspace 預設畫面為 Navigator + Workspace；Inspector 預設收合，選取裁切或橡皮擦時展開 Dynamic Inspector，儲存或取消後收合。
- Dynamic Inspector 依目前工具顯示 View / 裁切 / 橡皮擦，不顯示素材 Metadata。
- Header 僅保留素材審閱／關閉；上一張／下一張／撤回上一個決策只移除可見 UI，底層 Navigator 點擊、Keyboard ← / →、Auto Next、非循環導航皆保留。
- 底部 Decision Area 三顆按鈕同列：核准（Primary）、重新去背（Warning / Danger）、撤回上一個決策（灰色 Outline、低視覺權重）。
- Completion Screen 判斷依目前 Filter 是否還有素材（「全部素材」Filter 下等同全域 Reviewable Assets，「待重新去背」Filter 下限定 needs_rerun 子集）；Needs Rerun 數量沿用 `BNAssetPipelineState.getNeedsRerunAssets()`；Needs Rerun = 0 顯示「返回控制台」，Needs Rerun > 0 額外顯示「重新去背素材（X）」；去背失敗素材（`background_removal_failed`）完全不計入完成判斷或 Needs Rerun 數量，只另外顯示「X 個素材去背失敗，請回控制台手動更換圖片」。
- Completion Screen 支援 Completion Recovery：可於 Completion Screen 撤回上一個決策；使用者可透過 Navigator 重新進入任一已完成素材繼續查看、裁切、橡皮擦、儲存、核准或重新去背。Completion Screen 不得永久覆蓋 Editor。
- 「重新去背素材（N）」（Review Workspace Completion Screen 內）現已呼叫 AI Workflow Orchestrator，與 First Run 共用同一套 Ready Check／Execute／Status Polling／Auto Import 資料流；原本呼叫 `exportPhotoshopRerunManifest` 的人工匯出流程仍保留為 Control Center 選單的獨立備援入口，未被移除。系統不會自動啟動 Photoshop App；使用者需自行先開啟 Photoshop，系統只負責 Ready Check。
- Review Workspace UI 正式中文化；internal values（`approved` / `needs_rerun` / `pending` / `processed` / `all` / `crop` / `eraser`）維持不變。
- 未修改 Crop Core Logic、Eraser Core Logic、Undo Stack、Save Runtime Processed Asset Flow、Keyboard Shortcut 底層邏輯、Photoshop Pipeline、Rerun Architecture。

## QR Code Rules（Completed）

QR Code 已完成並列入 Locked Completed Phase（功能 Commit `79de045`、Tag `v0.5.2`）。後續不得重新設計 QR Code 資料流、CSV 欄位比對規則或 Locked Visual Baseline 座標，除非屬於 Bug Fix、User Request 或 Architecture 明確改版。

- 每個 Job 的 QR Code 由 CSV 的 `QRcode` 欄位網址自動產生，使用者可於控制台右側欄修改；不使用使用者自行準備的 QR Code 圖片。
- CSV 欄位比對規則為 Locked：找出清理後（移除欄名內換行後的第一行）**剛好等於** `QRcode`（不分大小寫）的欄位，不得改回「只要包含 QRcode 字樣」的寬鬆比對——真實入稿表同一列裡還有其他同樣含 QRcode 字樣、但屬於 SPX 內部後續流程且通常是空的欄位（例如「QRcode統一導shop...」「QRcode雲端(SPX填寫)」），寬鬆比對會被這些欄位覆蓋掉。
- 網址驗證規則為 Locked：自動 trim、未含 Protocol 自動補上 `https://`、含空白字元視為非法；輸入框、Project State、QR Code 產生、檢查網址連結四處必須使用同一個補完後的值，不得只在部分位置正規化。
- 四個尺寸的 Locked Visual Baseline 座標（`qrZone`）與 `layerOrder.qrCode = 48` 不得調整；QR Code 不提供拖曳、縮放、旋轉或使用者自訂樣式。
- 控制台右側欄 QRCode 區塊固定順序（主標／副標／小字之後、Logo 之前），獨立於「套用文字到模板」按鈕之外，不得合併或綁定既有按鈕行為。
- 未修改 Asset Pipeline、Review Workspace、Approved Asset Resolver、Photoshop Pipeline、`layoutStates` schema 或 Project State schema 版號；`job.qrCodeUrl` 為向下相容的新增字串欄位。

## AI Workflow Documentation Sync（已執行）

AI Workflow 與 Photoshop Automation 完成 macOS Development Manual Validation（Photoshop 2025，18/18 PASS）後，以及後續的 Naming Contract Consistency Fix（processed 圖片命名統一為「原始 basename + `.png`」）完成後，已同步更新以下文件：

- `docs/AI-HANDOFF.md`
- `docs/Architecture.md`
- `docs/DOCUMENTATION.md`
- `docs/CHANGELOG.md`
- `docs/UI Design Guideline.md`
- `docs/SPX-AD-版型規格與操作說明.md`
- `docs/README.md`
- `docs/Photoshop Asset Pipeline.md`
- `tools/photoshop/README.md`
- `tools/photoshop-automation/README.md`

Windows Development Validation 與 Jamie Manual Validation 已在 Photoshop 2025 實機 PASS，並成功產生 `photoshop-run-report.json` 與 Processed PNG。Windows 由 Runtime 讀取單一共用 `remove-background.jsx`，以 `json.dumps()` 注入三個路徑參數，並以 `app.DoJavaScript(full_script)` 執行；實機失敗的 `DoJavaScriptFile()` 不再採用。macOS 流程不變。SPX Helper Core 已完成；完整 Production Deployment lifecycle 尚未完成，文件必須分開描述兩者。

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
