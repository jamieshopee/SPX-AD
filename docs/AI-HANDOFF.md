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
v0.4.5
```

目前分支：

```text
feature/photoshop-automation
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
- Review Workspace UI Upgrade：Navigator 只顯示檔名、Review Status、Dirty Status；Review Summary 與 Filter（全部素材／待重新去背）移至 Navigator 上方；Workspace 預設 Navigator + Workspace，Inspector 預設收合，點選裁切或橡皮擦才展開 Dynamic Inspector，儲存或取消後收合；Header 僅保留素材審閱／關閉；底部 Decision Area 三顆按鈕同列（核准 / 重新去背 / 撤回上一個決策）；新增 Completion Screen 與 Completion Recovery；Review Workspace 正式 UI 中文化。詳見 CHANGELOG v0.4.5。

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
- Review Workspace UI Upgrade

目前 Active Phase：

```text
Photoshop Automation（Proposal）
```

Photoshop Automation 是 AI Workflow 的必要前置依賴（Roadmap 已正式拆分，詳見下方 Roadmap 與 Next Planned Phase Order）。AI Workflow 目前狀態為 Draft / Paused pending Photoshop Automation，暫停 Proposal Revision / Audit，待 Photoshop Automation 完成後再恢復。Photoshop Automation 與 AI Workflow 皆尚未進入 Coding，皆不得標記為 Completed。


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

```text
v0.4.5
```

Review Workspace UI Upgrade。Navigator Information Architecture 簡化為檔名、Review Status、Dirty Status，移除 Role / Job ID / Slot / Asset Key / Processed Filename / Mode 等技術 Metadata；Review Summary 與 Filter（全部素材／待重新去背）移至 Navigator 上方；Workspace Layout 預設 Navigator + Workspace，Inspector 預設收合，選取裁切或橡皮擦時展開 Dynamic Inspector，儲存或取消後收合；Header 僅保留素材審閱／關閉；底部 Decision Area 三顆按鈕同列（核准 Primary、重新去背 Warning/Danger、撤回上一個決策灰階 Outline）；新增 Completion Screen（依全域 Reviewable Assets 判斷，區分 Needs Rerun = 0 / > 0）；新增 Completion Recovery（Completion Screen 可撤回上一個決策，使用者可重新進入任一已完成素材繼續編輯）；Review Workspace 正式 UI 中文化，internal values（`approved` / `needs_rerun` / `pending` / `processed` / `all` / `crop` / `eraser`）不變；「重新去背素材（N）」目前僅呼叫既有 `exportPhotoshopRerunManifest` callback，未包含 Background Runner、Photoshop 自動啟動、自動 Import 或自動第二輪 Review。未修改 Crop / Eraser Core Logic、Undo Stack、Save Runtime Processed Asset Flow、Keyboard Shortcut 底層邏輯、Photoshop Pipeline 或 Rerun Architecture。


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
- Review Workspace UI Upgrade

Current：

- Photoshop Automation（Proposal）

Photoshop Rerun Automation（Completed）：

- Needs Rerun Collection 由 `status === needs_rerun` 派生，不建立 queue array。
- `Run Photoshop Rerun (N)` 匯出 `photoshop-rerun-manifest.json`，沿用現有 Photoshop Runner。
- Import Processed Folder 後回到 Review Workspace，不 Auto Approve、不 Auto Update Main Canvas / Thumbnail / Batch。
- 只有 `approved` 才進入 Approved Asset Resolver 與 Render Pipeline。
- Latest Processed 覆蓋 Previous Processed；不保存 v1 / v2 / v3。

Future：

- AI Workflow（Draft / Paused pending Photoshop Automation）
- Render Context & Export Workflow
- QR Code

Extension System 已從 Roadmap 移除（不在 Completed / Current / Future / Next Planned Phase Order 中）。目前沒有新增素材審閱工具的產品需求，Review Workspace 現有的核准、重新去背、裁切、橡皮擦已足夠目前使用。未來若出現明確產品需求，再由 Jamie 另外提出新的 Proposal，不預留 Phase 位置。

## Next Planned Phase Order（Locked）

The following roadmap order has been decided by the product owner.

1. Photoshop Automation
2. AI Workflow
3. Render Context & Export Workflow
4. QR Code

Rules：

- Follow this order by default.
- Do not propose other roadmap phases unless explicitly requested by the product owner.
- Review Workspace UI Upgrade is Completed and locked; do not reopen, redesign, or re-Proposal it.
- Photoshop Automation is the next planned phase and is a required prerequisite for AI Workflow. It must start with Product Proposal / Proposal Audit before any implementation.
- AI Workflow is paused (Draft / Paused pending Photoshop Automation) and must not enter Proposal Freeze / Implementation Proposal until Photoshop Automation is completed. See "Future AI Workflow Target" below for the target end state that the Proposal must align with once resumed.
- Project Persistence and Review Workspace UI Upgrade are feature complete.
- Locked Completed Phases must not be redesigned.
- Photoshop Automation must not redesign Review Workspace UI, Navigator, Dynamic Inspector, Decision Area, Completion Screen, Crop, Eraser, Canvas, Thumbnail, Batch, `layoutStates`, Approved Asset Resolver, Project State schema, or Review Decision Model.
- AI Workflow must not redesign Review Workspace UI, Navigator, Dynamic Inspector, Decision Area, or Completion Screen; it may only automate the background asset-processing flow and wire it into the existing UI, once Photoshop Automation is complete.
- Extension System is not part of the roadmap unless and until the product owner opens a new Proposal for it.

目前 Active Phase：Photoshop Automation（Proposal）。Project Persistence、Control Center UI Upgrade 與 Review Workspace UI Upgrade 已完成並列入 Locked Completed Phases。AI Workflow 為 Draft / Paused pending Photoshop Automation。

注意命名：「Photoshop Automation」（目前 Active Phase，Proposal 階段，尚未實作）與「Photoshop Rerun Automation」（已完成，見上方 Completed 與 Locked Completed Phases）是兩個不同 Phase，不得混用。Photoshop Rerun Automation 是已完成的 Needs Rerun Collection / Rerun Manifest 匯出能力；Photoshop Automation 是尚未實作的 Photoshop 端自動處理 Proposal。

以上 Roadmap 順序已由 Product Owner 決定並鎖定；各 Phase 的實作內容仍須另做 Product Proposal、Proposal Audit、Proposal Freeze 與 Phase Boundary 確認。

## Future Photoshop Automation Target（尚未實作，Proposal 階段）

Photoshop Automation 是 AI Workflow 的必要前置 Phase，目前狀態為 Proposal（尚未 Freeze、尚未 Coding）。前提：使用者已安裝 Adobe Photoshop，並在開始使用 SPX AD 生成器前自行開啟 Photoshop；本 Phase 不負責自動安裝、自動啟動或自動關閉 Photoshop。目標是定義 Photoshop Ready Contract，讓已由使用者開啟的 Photoshop 通過 Ready Check 後，能接收既有格式的 Manifest / Rerun Manifest、沿用既有去背核心批次處理、輸出 processed assets，並回報 Progress / Completion / Partial Failure / Failure 狀態（Run Report / Status Contract）。Ready Check 通過後，使用者不需要再操作 Photoshop。

Photoshop Automation **不負責** Control Center 的 Processing Mode UI、自動 Import Processed Result、自動開啟 Review Workspace，或 AI Workflow 整體使用者流程——這些屬於 AI Workflow Phase（見下方 Future AI Workflow Target 的責任切分）。

詳細架構討論與現況見 `docs/Architecture.md`（Future Photoshop Automation Architecture）與 `docs/Photoshop Asset Pipeline.md`（Future Automation Target A）。Watcher、Heartbeat、固定 Runtime Folder 等機制尚未 Freeze，不得視為已確定實作。

## Future AI Workflow Target（尚未實作，Draft / Paused pending Photoshop Automation）

以下內容描述 AI Workflow Phase 的目標方向，不是目前已完成行為，不得視為 Completed 功能。AI Workflow 依賴 Photoshop Automation 先完成；在 Photoshop Automation 完成前，AI Workflow 維持 Draft，不進入 Proposal Freeze 或 Implementation Proposal。以下內容屬於 Current Product Decisions（已由 Jamie 決定的產品方向），但不代表 Proposal 已 Freeze 或已進入 Implementation Proposal。

### 核心產品原則

使用者只需在開始前自行開啟 Photoshop；通過 Photoshop Ready Check 後，不需要再操作 Photoshop，也不需要理解 Manifest、Runner、Processed Folder 或其他技術流程。Photoshop 是系統背景素材處理引擎，不是使用者日常操作介面。

使用者只需要：

1. 在開始使用 SPX AD 生成器前，自行開啟 Photoshop（一次性前置動作）。
2. 提供素材（匯入 CSV、選擇素材資料夾）。
3. 審閱素材。

Ready Check 通過後，使用者不需要：

- 操作 Photoshop
- 匯出 Manifest
- 執行 Runner
- 選擇 Processed Folder
- 手動匯入處理結果
- 理解 Photoshop Pipeline 技術細節

若 Ready Check 未通過，一般使用者 UI 例外允許直接顯示「Photoshop」名稱作為前置提示，例如：「請先開啟 Photoshop。素材處理需要使用 Photoshop。開啟後按「重新檢查」即可繼續。」這是唯一允許在一般使用者 UI 中直接出現 Photoshop 技術詞彙的情況；正常素材處理流程中不暴露 Photoshop 技術詞彙。

### 最終使用者流程（Future，Current Product Decision）

```text
1. 使用者先自行開啟 Photoshop。
2. 使用者開啟 SPX AD 生成器。
3. 匯入 CSV。
4. 選擇素材資料夾。
5. 系統執行 Photoshop Ready Check。
6. 若未準備完成，顯示「請先開啟 Photoshop」與「重新檢查」，使用者開啟 Photoshop 後按重新檢查即可繼續，不需要重新選擇 CSV / 素材資料夾。
7. Ready Check 通過後，系統進入 Processing Mode。
8. 畫面顯示：素材處理中 18 / 63，完成後將自動開啟素材審閱。
9. 背景處理期間 Control Center 不可操作（不可修改文字、不可切換工單、不可下載、不可開始新的工作）。
10. 完成後顯示：素材處理完成（停留約 0.5～1 秒，此時間只屬於 UI 轉場，不是處理完成的判定依據）。
11. 系統自動開啟素材審閱，使用者不需要再按「開啟素材審核」。
12. 第一輪沿用既有 Review Workspace（核准、重新去背、裁切、橡皮擦，UI 完全不變）。
13. Needs Rerun = 0 → 返回控制台；Needs Rerun > 0 → 顯示「重新去背素材（N）」。
14. 使用者點擊「重新去背素材（N）」後，系統再次執行相同的 Processing Mode（不重新啟動 Photoshop，Photoshop 全程可保持開啟），完成後自動回到素材審閱，Filter 自動切到「待重新去背」，只顯示本輪重新處理的素材集合。
15. 重複至 Needs Rerun = 0，使用者按「返回控制台」，Workflow 結束。
```

使用者可見 UI 只使用工作語言：素材處理中、素材處理完成、素材審閱、核准、重新去背、待重新去背、重新去背素材（N），以及 Ready Check 未通過時的「請先開啟 Photoshop」前置提示。不得暴露 Manifest、Runner、Processed Folder、Import Processed Folder、Watcher、Heartbeat 等技術詞彙；「素材處理完成」後直接自動進入素材審閱，不存在獨立的「等待審閱」中繼狀態。

### Photoshop Automation 與 AI Workflow 責任切分（Current Product Decision）

Photoshop Automation 與 AI Workflow 責任不重疊：

- **Photoshop Automation** 負責 Photoshop 端能力：定義 Ready Contract、接收 Manifest / Rerun Manifest、呼叫既有去背核心批次處理、輸出 processed assets、回報 Progress / Completion / Partial Failure / Failure 與 Run Report / Status Contract。
- **AI Workflow** 負責 Control Center 端 Orchestration：使用既有 `buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest` 建立 Manifest、透過 Photoshop Automation 的 Contract 送出工作、執行 Ready Check 的 Control Center 端流程、顯示 Processing Mode 並鎖定操作、讀取 Photoshop Automation 回報的狀態、沿用既有 `importProcessedAssets()` 自動掃描與 Import、自動開啟既有 Review Workspace、串接第一輪與 Rerun 第二輪審閱。

Review Workspace UI Upgrade 已依最終 AI Workflow 目標預先設計完成（Navigator、Dynamic Inspector、Decision Area、Completion Screen 皆已考慮未來自動化銜接）。AI Workflow Phase：

- 只負責將 Control Center 端 Orchestration 自動化，接到目前已完成的 UI；不實作 Photoshop 去背核心，不修改 Manifest schema 或 Photoshop Adapter Boundary（這些屬於 Photoshop Automation）。
- 不得重新設計 Review Workspace、Navigator、Dynamic Inspector、Decision Area 或 Completion Screen。
- 不得重新暴露 Photoshop 技術流程給一般使用者（Ready Check 未通過的前置提示除外）。
- 所有自動化能力都必須維持既有 State Boundary（Asset Pipeline / Review Decision / Photoshop Adapter / Project State 邊界不變）。

此章節為 Future Target，不代表目前已實作行為；目前 Rerun 入口仍只呼叫既有 `exportPhotoshopRerunManifest` callback。Photoshop 不會被系統自動安裝、啟動或關閉——這不是「尚未實作」，而是產品設計本身就不採用自動啟動 Photoshop 的方式，改採 Ready Check。Background Runner、自動 Import Processed Result、自動第二輪 Review 皆尚未實作。

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
