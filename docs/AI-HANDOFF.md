# AI-HANDOFF.md

此文件是給 ChatGPT、Claude、Codex 或其他 AI 接手本專案前閱讀的交接文件。它不是 README、Architecture 或 CHANGELOG 的替代品，而是協助 AI 在修改程式前快速理解目前穩定邊界與協作規則。

任何 AI 開始修改程式前，請先閱讀本文件，再搭配 README、Architecture、控制台開發指引、CHANGELOG 與 Photoshop Asset Pipeline 文件確認目前狀態。

## 1. 專案目的

本專案是 SPX AD 電子版位管理器，用於從 CSV 與素材資料夾產生多尺寸、多版型的 Banner / AD 視覺稿。

主要工作流程：

```text
CSV / Project State
  ↓
選擇素材資料夾
  ↓
控制台分類與管理素材
  ↓
Canvas Render
  ↓
Preview / Thumbnail / PNG / ZIP
```

控制台角色：

- 管理 CSV jobs、素材、style、template、thumbnail、下載與暫存。
- 保存與恢復 Project State。
- 接收 Canvas 回傳的 layoutStates。
- 呼叫 Asset Pipeline、Review Workspace 與 Photoshop manifest export。

Template 系統：

- Template 保存排版結構、區域、尺寸、初始 layout 與 transform 預設。
- Style 保存背景、資訊圖與文字色。
- 使用者調整後的版面不寫回 Template，而是保存於 job 的 layoutStates。

Photoshop Pipeline 角色：

- Photoshop Pipeline 只負責素材處理。
- Photoshop Adapter 可依 manifest 批次輸出 processed assets。
- Review Workspace 可檢視 processed assets 並標記 decision。
- Photoshop Pipeline 不直接控制 Canvas、不寫 layoutStates、不改 Render Engine。

## 2. 目前完成度（Current Status）

目前最新穩定 Git Tag：

```text
v0.4.4
```

目前分支：

```text
feature/review-workspace-ui-upgrade
```

已完成：

- Core Editor：控制台、Canvas preview、CSV jobs、素材帶入、下載 PNG / ZIP。
- Template System：Template 與 Style 分離，Template 作為排版結構來源。
- Asset Pipeline Phase 2A：assetPipeline state、assetKey、manifest export、processed folder import。
- Photoshop Adapter Phase 2B：Photoshop manifest runner、remove background prototype、run report。
- Review Workspace Phase 2C：processed assets 檢視與 approved / needs_rerun decision。
- Review Workspace UX Polish：Auto Next、Multi-pass Review、Review Progress Header、Smart Entry、Keyboard Shortcuts、Decision Guard、Remove Drag Tool。
- Batch ZIP：批次產圖與 ZIP 內 project-state.json。
- Phase 2D-2C：Batch Approved Assets，Batch ZIP export 已使用 approved processed assets。
- Project State：single-state.json / project-state.json 匯出與匯入。
- Project State Phase：Completed。Project State v4 保存 Asset Pipeline metadata 與 Review decision，已達成可恢復工作區核心目標。
- Project Persistence：Project State v5、single-state restore、project.zip restore 與 Download Complete Project 已完成。Project Save = Workspace Save，會保存 latest processed image，不需要保留素材資料夾或 processed folder。
- Control Center UI Upgrade：Header 已簡化為一般使用者入口，隱藏 Photoshop / Manifest / Processed Folder 等技術術語，版位下拉只調整 display order。
- Thumbnail System：quickThumbnail 與 hidden iframe 正式縮圖流程。
- LayoutState Restore：依 `placementId|templateId` 保存與恢復 transform。
- Product identity restore by filename：三商品 restore 使用 `id → filename → position`。
- Approved Asset Resolver：Main Canvas / Thumbnail / Batch 共用 `BNAssetResolver` 與 Render Context。


## Locked Completed Phases

以下 Phase 已正式完成，除非修正 Bug、使用者要求或 Architecture 明確改版，不得重新 Proposal、重新設計、重新命名或推翻既有架構。

Completed：

- CSV
- Photoshop Pipeline
- Review Workspace
- Review Workspace（Crop / Eraser）
- Review Workspace UX Polish
- Control Center UI Upgrade
- Photoshop Rerun Automation
- Approved Asset Resolver
- Main Canvas / Thumbnail use processed asset
- Batch Approved Assets
- Render Context
- Master + Style
- Project State
- Project Persistence
- Smart Layout Propagation

目前 Active Phase：

```text
None（Waiting for next Proposal）
```


## Formal Development SOP

以下流程適用所有後續 Phase，不只單一特定 Phase：

```text
Product Proposal（ChatGPT）
↓
Proposal Freeze
↓
Proposal Audit（Codex / Claude）
↓
Proposal Revision（ChatGPT）
↓
Implementation Proposal（Codex）
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
Documentation Validation
↓
Docs Commit
↓
Git Tag
↓
Next Phase / Next Branch / New ChatGPT Conversation
```

Proposal Audit 不是 Coding。Audit 階段只做技術可行性、Architecture / State Boundary、Locked Completed Phases 影響、Scope creep，以及 edge cases / Browser Validation risk 檢查。

在 Proposal Freeze 前，不得進入 Implementation Proposal。在 Proposal Audit PASS 或 Proposal Revision 完成前，不得 Coding。

角色分工：

- ChatGPT：Product Proposal、UX、Workflow、Information Architecture、Proposal Revision。
- Codex / Claude：Proposal Audit、Implementation Proposal、Coding、Browser Validation。
- Jamie：產品決策、Manual Validation、是否進入 commit / tag。

Browser Validation（Codex / Claude）不得只回覆 `PASS`。Report 至少必須包含 Test Environment、Test Scope、Test Cases（操作步驟 / 預期結果 / 實際結果 / PASS 或 FAIL）、Regression Validation、Known Issues 與 Final Result。若沒有已知問題，必須明確寫 `No Known Issues`。

Codex / Claude 不得要求 Jamie 協助完成 Browser Validation。Browser Validation 完成並提交 Report 後，才能交由 Jamie Manual Validation。

Jamie Manual Validation 是產品驗收，不是 Browser Validation。Jamie 驗收需回覆驗收項目、PASS / FAIL；若 FAIL，需描述 Issue 與重現方式。Jamie Manual Validation PASS 後，才能進入 Code Commit。

若 Proposal Audit 發現會影響 Locked Completed Phases，必須停止並回報，不得自行修改。


Before proposing any implementation：

AI 必須先確認：

1. 是否屬於目前 Active Phase。
2. 是否會修改 Locked Completed Phases。
3. 是否超出目前 Proposal 範圍。

若會影響 Locked Completed Phases：

- 停止 Proposal。
- 先向使用者說明原因。

## 3. 專案架構

主要入口與模組責任：

- `index.html`：控制台主入口，載入控制台 UI 與 app scripts。
- `src/app.js`：控制台 orchestration，管理 jobs、Project State、素材、thumbnail、download、pipeline UI 事件。
- `templates/`：Template 與 Style JSON，保存排版結構與視覺樣式。
- `js/layout-runtime.js`：Canvas runtime，負責素材 DOM、transform、layoutState collect / apply、capture。
- `js/asset-pipeline-state.js`：Asset Pipeline runtime state、assetKey、processed import、review decision。
- `js/asset-review-workspace.js`：Review Workspace modal，檢視 original / processed 並標記 decision。
- `tools/photoshop/`：Photoshop Adapter、AppleScript runner、ExtendScript、manifest contract test 與去背 prototype。
- `docs/`：專案架構、操作規格、開發規則、Pipeline 文件、CHANGELOG 與 AI handoff。

詳細架構請閱讀 `docs/Architecture.md`。本文件只保留 AI 接手需要的高層脈絡與邊界提醒。

## 4. State Boundary（非常重要）

State Boundary 是本專案最重要的穩定性規則。新增功能前，必須先確認不會跨界污染既有 state。

### Asset Pipeline

Asset Pipeline 只管理素材生命週期：

- original asset
- processed asset metadata
- review decision
- future approved asset mapping

Asset Pipeline 不管理 Canvas transform，不寫 layoutStates。

### Review Workspace

Review Workspace 只管理 processed result review decision：

- `approved`
- `needs_rerun`

Review Workspace 不接 Canvas、不改 Asset Payload、不寫 layoutStates、不觸發 Batch Render。Legacy `rejected` Project State 匯入時會 migration 為 `needs_rerun`。

### Photoshop Adapter

Photoshop Adapter 只讀 manifest 與原始素材，輸出 processed assets 與 run report。

Photoshop Adapter 不能：

- 讀寫 Project State
- 讀寫 layoutStates
- 操作 Canvas
- 決定 thumbnail 或 batch render 行為

### Canvas

Canvas 只負責 render、transform interaction、layoutState collect / apply 與 capture。

Canvas 不應理解 Photoshop 執行細節，也不應直接讀 processed folder 或 FileSystemHandle。

### layoutStates

layoutStates 只保存版面資訊：

- product / singleProduct 的位置
- 大小
- 旋轉
- zIndex / order
- per `placementId|templateId`

layoutStates 不保存 Photoshop job、review decision 或 processed asset runtime cache。

### Thumbnail

Thumbnail 是 render projection。

Thumbnail 可以讀指定 job 的素材、template、style、layoutStates，但不可污染或回寫 layoutStates。

### Batch Render

Batch Render 必須使用 render job 自己的 assets、style、template、approved processed assets 與 layoutStates。

Batch ZIP export 已使用 approved processed assets。Main Canvas / Thumbnail / Batch 共用 `BNAssetResolver` 與 Render Context。

Batch Render 是 read-only projection，不是 state owner。Batch 不可回寫 `layoutStates`、不可修改 Project State schema、不可覆蓋使用者 layoutState、不可吃 currentJob 狀態、不可因 iframe 重建改變商品身份，也不可修改 Main Canvas / Thumbnail 穩定邏輯。

三商品身份 restore 必須依：

```text
id
↓
filename
↓
position（最後 fallback）
```

### Project State

Project State 保存可恢復工作區所需資料。

Project State v4 可保存 Asset Pipeline metadata 與 Review decision，並已達成可恢復工作區核心目標，但不可保存 processed image dataUrl、FileSystemHandle、object URL、processedAssetIndex 或 runtime cache。FileSystemHandle、object URL、runtime image index、processed folder runtime cache 都只能存在 runtime。

匯入 v4 後若尚未重新 Import Processed Folder，approved processed asset 必須 fallback original；重新 Import Processed Folder 後，Main Canvas 可恢復 approved processed assets。Thumbnail refresh UX 為 Backlog，不阻擋下一階段。

### runtime cache

runtime cache 可用於目前 session 顯示或加速，但不可寫入 project-state。

例如：

- processed folder file handles
- object URLs
- hidden iframe runtime state
- thumbnail queue transient state

## Implementation Guardrails

### Preserve Existing State

若需求只是更新素材來源（例如 approved processed image）：

優先更新既有 Canvas DOM 的圖片來源（`img.src`）。

不要：

- 重建 Product DOM
- 重新 `applyProductsToCanvas()`
- 重新依 template 排版
- 重跑 template fit
- 重設 transform

所有圖片來源更新都應 Preserve：

- layoutState
- width / height
- position
- rotation
- zIndex
- filename identity

原則：

```text
Preserve Existing State > Rebuild DOM
```

若需要跨越此 Boundary，必須先提出 Proposal，不可直接修改。

### Minimal Change Principle

若需求可以透過局部更新完成，不得改用重建整個模組、DOM 或 Render Flow 的方式實作。

## 5. 開發原則（Development Rules）

- 小步修改，每次只處理一個明確問題。
- 一次只改一個功能，不把不同 Phase 混在同一輪。
- 不做大規模重構，除非使用者明確同意。
- 不修改已穩定功能，除非該功能就是本輪修正目標。
- 保持低耦合：Pipeline、Canvas、Project State、Thumbnail、Batch Render 分層清楚。
- 完成後更新 CHANGELOG。
- 重大版本或穩定節點才建立 Git Tag。
- 每完成一個功能先驗證，再進下一階段。
- 發現需要跨 Phase 修改時，先停止並回報原因。
- 優先保護 Main Canvas、layoutStates、Batch ZIP、Project State 匯入 / 匯出。

## 6. Git Version History

```text
v0.2-pipeline-contract
```

Initial Photoshop Pipeline Contract。建立 Asset Pipeline / Photoshop manifest 的基本契約，確認 manifest 不包含 layoutStates、transform、thumbnail 或 Canvas coordinates。

```text
v0.3.0
```

Photoshop Remove Background Prototype。Photoshop Adapter 可依 manifest 批次處理 product / person / singleProduct 去背，logo 複製輸出，processed folder 可匯入。

```text
v0.3.1
```

Batch product layout restore by filename。修正 Batch Render iframe 重建後三商品身份對應錯誤，三商品 restore 改為 `id → filename → position`，Batch PNG 與 Project State restore 與主 Canvas 一致。

```text
v0.3.4
```

Phase 2D-2C Batch Approved Assets。Batch ZIP export 使用 approved processed assets；Main Canvas / Thumbnail / Batch 共用 `BNAssetResolver` 與 Render Context；Batch 維持 read-only projection，不修改 `layoutStates` schema、Project State schema 或 Photoshop Pipeline。

```text
v0.4.1
```

Photoshop Rerun Automation。完成 Needs Rerun Collection、`photoshop-rerun-manifest.json`、Latest Processed overwrite 與 Review return loop；Import Processed Folder 後回到 Review Workspace，不直接更新 Main Canvas / Thumbnail / Batch。

```text
v0.4.2
```

Review Workspace UX Polish。完成 Auto Next、Multi-pass Review、Review Progress Header、Smart Entry、Keyboard Shortcuts、Decision Guard 與 Remove Drag Tool；Review Workspace UX Polish 已列入 Locked Completed Phases。

```text
v0.4.3
```

Project Persistence。完成 Project State v5、Persistence Layer、single-state processed image restore、project.zip restore 與 Download Complete Project；Project Save = Workspace Save，latest processed image 可隨專案恢復。

```text
v0.4.4
```

Control Center UI Upgrade。控制台 Header 改為 `SPX BN生成器`，固定一般使用者入口為匯入CSV、匯入暫存、選擇素材資料夾、素材審核；一般 UI 隱藏 Photoshop / Manifest / Processed Folder 等技術術語；素材審核入口整合處理結果匯入、重新處理素材與開啟審核；中央版位下拉僅調整 display order，不修改 placementId、templateId、layoutState key 或 schema。


## Smart Layout Propagation

Status：Completed。

Smart Layout Propagation 已完成並列入 Locked Completed Phases。每個 Job 擁有自己的 runtime-only Master Layout；Propagation 完成後只建立 target size 自己的 `layoutState`，各尺寸永久獨立。Master Layout 不寫入 Project State、不寫入 `layoutStates`、不 Export、不 Import。

## 7. 下一步建議（Roadmap）

Completed：

- CSV
- Photoshop Pipeline
- Review Workspace
- Review Workspace（Crop / Eraser）
- Review Workspace UX Polish
- Control Center UI Upgrade
- Photoshop Rerun Automation
- Approved Asset Resolver
- Main Canvas / Thumbnail use processed asset
- Batch Approved Assets
- Render Context
- Master + Style
- Project State
- Project Persistence
- Smart Layout Propagation

Current：

- None（Waiting for next Proposal）

Photoshop Rerun Automation（Completed）：

- Needs Rerun Collection 由 `status === needs_rerun` 派生，不建立 queue array。
- `Run Photoshop Rerun (N)` 匯出 `photoshop-rerun-manifest.json`，沿用現有 Photoshop Runner。
- Import Processed Folder 後回到 Review Workspace，不 Auto Approve、不 Auto Update Main Canvas / Thumbnail / Batch。
- 只有 `approved` 才進入 Approved Asset Resolver 與 Render Pipeline。
- Latest Processed 覆蓋 Previous Processed；不保存 v1 / v2 / v3。

Future：

- Review Workspace UI Upgrade
- AI Workflow
- Render Context & Export Workflow
- Extension System
- QR Code

## Next Planned Phase Order（Locked）

The following roadmap order has been decided by the product owner.

1. Review Workspace UI Upgrade
2. AI Workflow
3. Render Context & Export Workflow
4. Extension System
5. QR Code

Rules：

- Follow this order by default.
- Do not propose other roadmap phases unless explicitly requested by the product owner.
- Completed Review Workspace phases are locked; Review Workspace UI Upgrade is a future phase and must start with Proposal / Audit before implementation.
- Project Persistence is feature complete.
- Locked Completed Phases must not be redesigned.
- Review Workspace should not receive new editing tools, workflows, or UX redesigns outside the planned Review Workspace UI Upgrade or explicit product-owner request.

目前 Active Phase：None（Waiting for next Proposal）。Project Persistence 與 Control Center UI Upgrade 已完成。

以上 Roadmap 只代表建議方向。實作前必須另做 Architecture Proposal 並確認 Phase Boundary。

## 8. AI 接手規則

文件維護請遵循 `docs/DOCUMENTATION.md`。AI 不可自行猜測需要更新哪些文件。

任何 AI 修改前必須先閱讀：

- `docs/AI-HANDOFF.md`
- `docs/Architecture.md`
- `docs/CHANGELOG.md`
- `docs/控制台開發指引.md`

必要時再補讀：

- `README.md`
- `docs/SPX-AD-版型規格與操作說明.md`
- `docs/Photoshop Asset Pipeline.md`

開始修改前必須：

- 先理解目前架構。
- 先提出修改方案。
- 確認後再開始實作。
- 不得一次大規模重構。
- 維持 State Boundary。
- 修改完成後同步更新 CHANGELOG。

若使用者明確要求「先不要修改程式」，AI 只能分析、規劃或更新文件，不得碰 JS / HTML / CSS。
