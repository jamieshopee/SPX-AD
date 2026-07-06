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
v0.3.1
```

已完成：

- Core Editor：控制台、Canvas preview、CSV jobs、素材帶入、下載 PNG / ZIP。
- Template System：Template 與 Style 分離，Template 作為排版結構來源。
- Asset Pipeline Phase 2A：assetPipeline state、assetKey、manifest export、processed folder import。
- Photoshop Adapter Phase 2B：Photoshop manifest runner、remove background prototype、run report。
- Review Workspace Phase 2C：processed assets 檢視與 approved / needs_rerun / rejected decision。
- Batch ZIP：批次產圖與 ZIP 內 project-state.json。
- Project State：single-state.json / project-state.json 匯出與匯入。
- Thumbnail System：quickThumbnail 與 hidden iframe 正式縮圖流程。
- LayoutState Restore：依 `placementId|templateId` 保存與恢復 transform。
- Product identity restore by filename：三商品 restore 使用 `id → filename → position`。

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

Review Workspace 只管理 review decision：

- `approved`
- `needs_rerun`
- `rejected`

Review Workspace 不接 Canvas、不改 Asset Payload、不寫 layoutStates、不觸發 Batch Render。

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

Batch Render 必須使用 render job 自己的 assets、style、template 與 layoutStates。

Batch Render 不可覆蓋使用者 layoutState，不可吃 currentJob 狀態，不可因 iframe 重建改變商品身份。

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

Project State 不可保存 FileSystemHandle。FileSystemHandle、object URL、runtime image index、processed folder runtime cache 都只能存在 runtime。

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


## Phase 2E (Planned)

### Smart Layout Propagation

目前不同尺寸 layoutStates 保持獨立。

未來規劃：第一次切到沒有 layoutState 的新尺寸時，可由目前尺寸建立初始 layout（Propagation）。

Propagation 規則：

- 只在 target layoutState 不存在時發生。
- 建立 target layoutState，而不是 fallback 到 source layoutState。
- 一旦 target 有自己的 layoutState，就永遠優先使用 target。
- 不允許跨尺寸互相覆蓋。
- 不修改 Asset Pipeline、Photoshop、Batch、Project State schema。

目前 Phase 2D-2B-2 中 B 尺寸第一次看到 A 的版面，可視為 Transitional Behavior，不列為 Bug，也不依賴此行為作為正式設計。

## 7. 下一步建議（Roadmap）

尚未完成或可規劃的功能：

- Asset Resolver（Approved Asset）：讓 Canvas 只吃 approved assets。
- Crop Workspace：基本裁切、trim、normalize 的人工調整介面。
- Approve Flow：Review decision 與 Approved Asset Resolver 串接。
- Project State 持久化 Review：保存 review decision 與可恢復的 pipeline state。
- Windows Photoshop Runner：補 Windows 啟動 Photoshop / JSX 的 runner。
- UI 優化：Review Workspace、thumbnail 狀態、pipeline summary 與錯誤提示。
- Thumbnail queue 優化：加速 CSV + 素材匯入後的正式縮圖補齊。

以上 Roadmap 只代表建議方向。實作前必須另做 Architecture Proposal 並確認 Phase Boundary。

## 8. AI 接手規則

任何 AI 修改前應先閱讀：

- `README.md`
- `docs/Architecture.md`
- `docs/控制台開發指引.md`
- `docs/CHANGELOG.md`
- `docs/SPX-AD-版型規格與操作說明.md`
- `docs/Photoshop Asset Pipeline.md`
- `docs/AI-HANDOFF.md`

開始修改前必須：

- 先理解目前架構。
- 先提出修改方案。
- 確認後再開始實作。
- 不得一次大規模重構。
- 維持 State Boundary。
- 修改完成後同步更新 CHANGELOG。

若使用者明確要求「先不要修改程式」，AI 只能分析、規劃或更新文件，不得碰 JS / HTML / CSS。
