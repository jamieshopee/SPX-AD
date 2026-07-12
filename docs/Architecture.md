# Architecture

Version: v0.4.5 + AI Workflow（Completed — macOS Development Validated；Windows Validation Deferred）  
Last Updated: 2026-07-12  
Scope: 最新系統架構、Render Flow、Template / Style / Project State / Asset Pipeline 邊界、新增 Style 流程，以及 Photoshop Automation / AI Workflow 架構。

## What's New

- Photoshop Automation 與 AI Workflow 已完成 Coding 並通過 macOS Development Manual Validation（Photoshop 2025，Stage 1–4 共 18 項 PASS）。兩者皆列入 Locked Completed Phases。Windows 實機驗證狀態為 Deferred（Waiting for Windows Validation Environment），不是 Completed 也不是 Blocked；Production Launcher／PyInstaller／Cloud Deployment 尚未開始。詳見下方「Photoshop Automation Architecture」與「AI Workflow Architecture」。
- Roadmap 已更新：Extension System 已從 Roadmap 移除（不在 Completed / Current / Future / Next Planned Phase Order 中）。Review Workspace UI Upgrade 已完成並列入 Locked Completed Phases。
- Review Workspace UI Upgrade 完成：Navigator Information Architecture 簡化（檔名 / Review Status / Dirty Status）、Workspace Layout（Inspector 預設收合、依工具展開 Dynamic Inspector）、Decision Area 三顆按鈕同列、Completion Screen 與 Completion Recovery、Review Workspace 正式中文化。此為 UI 層改版，未修改 Asset Pipeline schema、Review Decision Model、Crop / Eraser Core Logic、Approved Asset Resolver 或 Photoshop Pipeline。
- Control Center UI Upgrade 完成：Header 簡化為一般使用者入口，素材審核整合狀態與入口，中央版位下拉只調整 display order。
- Project Persistence 完成：Project State v5、Persistence Layer、single-state restore、project.zip restore 與 Download Complete Project。
- Review Workspace UX Polish 完成：Auto Next、Multi-pass Review、Progress Header、Smart Entry、Keyboard Shortcuts、Decision Guard 與 Remove Drag Tool。
- Smart Layout Propagation 已完成：每個 Job 擁有 runtime-only 3 商品 Master Layout，可建立 target size 自己的 layoutState。
- Project State v4 已完成，保存 Asset Pipeline metadata 與 Review decision，並達成可恢復工作區核心目標。
- Batch ZIP export 可使用 approved processed assets，並維持 read-only projection 邊界。
- 新增 Documentation Structure，說明 AI-HANDOFF、Architecture、CHANGELOG 等文件分工。
- 新增三商品 Product Identity restore 規則：`id → filename → position`。
- 新增 Asset shared modules 與 Asset Payload 邊界。
- 新增 Main Canvas、Thumbnail、Batch Render、Project State、Asset Payload、Photoshop Pipeline 的 State Boundary。
- `layoutStates` 以 `placementId|templateId` 作為 per size/template transform source。
- 明確規定 Thumbnail / Batch Render 為 read-only render projection，不得回寫 layout state。

## Table of Contents

1. [最新架構圖](#最新架構圖)
2. [高階 Roadmap](#高階-roadmap)
3. [Render Flow](#render-flow)
4. [Template](#template)
5. [Style](#style)
6. [Project State](#project-state)
7. [Project Persistence Architecture](#project-persistence-architecture)
8. [Asset Payload](#asset-payload)
9. [Smart Layout Propagation](#smart-layout-propagation)
10. [Master Layout](#master-layout)
11. [State Boundary](#state-boundary)
12. [Photoshop Pipeline 邊界](#photoshop-pipeline-邊界)
13. [Photoshop Automation Architecture](#photoshop-automation-architecturecompleted)
14. [AI Workflow Architecture](#ai-workflow-architecturecompleted)
15. [Documentation Structure](#documentation-structure)
16. [資料夾結構](#資料夾結構)
17. [新增 Style 流程](#新增-style-流程)
18. [維護原則](#維護原則)

## 最新架構圖

```text
index.html
  ↓
src/app.js
  ↓
Project State
  ↓
canvas.html (Render Engine)
  ↓
js/template-loader.js
  ↓
template.json + styles/{styleId}.json
  ↓
js/canvas-entry.js
  ↓
js/layout-runtime.js
  ↓
Preview / Thumbnail / Export
```

模組關係：

```text
控制台 UI
  ├─ CSV import
  ├─素材資料夾
  ├─暫存 JSON
  ├─Style 下拉
  └─下載 / 重設
        ↓
Project State
        ↓
Canvas Render Engine
        ↓
Template + Style + Assets
```

Asset shared modules：

```text
素材資料夾
  ↓
asset-classifier.js
  ↓
asset-processing.js
  ↓
asset-render-payload.js
  ↓
Canvas postMessage payload
```


## 高階 Roadmap

目前 Roadmap：

```text
Completed
  ├─ CSV
  ├─ Photoshop Pipeline
  ├─ Review Workspace
  ├─ Review Workspace（Crop / Eraser）
  ├─ Review Workspace UX Polish
  ├─ Control Center UI Upgrade
  ├─ Review Workspace UI Upgrade
  ├─ Photoshop Rerun Automation
  ├─ Approved Asset Resolver
  ├─ Main Canvas / Thumbnail use processed asset
  ├─ Batch Approved Assets
  ├─ Render Context
  ├─ Master + Style
  ├─ Project State
  ├─ Project Persistence
  ├─ Smart Layout Propagation
  ├─ Photoshop Automation（macOS Development Validated；Windows Validation Deferred）
  └─ AI Workflow（macOS Development Validated；Windows Validation Deferred）

Current
  └─ 無 Active Coding Phase（等待 Windows Validation Environment）

Next Planned Phase Order（Locked）
  ├─ Photoshop Automation（Completed）
  ├─ AI Workflow（Completed）
  ├─ Production Deployment（Not Started — 等待 Windows Validation Environment）
  ├─ Render Context & Export Workflow
  └─ QR Code

Future
  ├─ Production Deployment（Production Launcher、PyInstaller、Cloud Deployment；Not Started）
  ├─ Render Context & Export Workflow
  └─ QR Code
```

Extension System 已從 Roadmap 移除，不列入 Completed / Current / Future / Next Planned Phase Order。目前沒有新增素材審閱工具的產品需求；未來若有明確需求，再由 Jamie 另外提出新的 Proposal。

Review Workspace（Crop / Eraser）、Photoshop Rerun Automation、Review Workspace UX Polish、Project Persistence、Control Center UI Upgrade、Review Workspace UI Upgrade、Photoshop Automation 與 AI Workflow 皆已完成。Photoshop Automation 與 AI Workflow 已通過 macOS Development Manual Validation（Photoshop 2025，18/18 PASS）；Windows Validation 為 Deferred（Waiting for Windows Validation Environment），不宣稱支援 Windows 或所有 Photoshop 版本。Production Deployment（Production Launcher、PyInstaller、Cloud Deployment）尚未開始。

## Pipeline Loop

整體素材與輸出 pipeline：

```text
CSV
  ↓
Asset Pipeline
  ↓
Review Workspace
  ↓
(Approve)
  ↓
Approved Asset Resolver
  ↓
Render Engine
  ↓
Canvas / Thumbnail / Batch
  ↓
ZIP Export
```

Review Workspace 與 Photoshop Rerun Automation 形成 rerun loop：

```text
Review Workspace
  ↓
(Needs Rerun)
  ↓
Photoshop Rerun
  ↓
Review Workspace
```

模組邊界：

- Review Workspace 管理 processed assets 的檢視與 decision，只產生 `approved` / `needs_rerun`。
- Photoshop Rerun Automation 接續 `needs_rerun` decision，依 `status === needs_rerun` 派生 collection，不建立 queue array。
- Approved Asset Resolver 只解析 approved assets 給 Render Engine 使用。
- Render Engine 只負責 Canvas / Thumbnail / Batch projection。
- ZIP Export 只輸出已解析後的 render 結果與可恢復狀態。

Important：

Photoshop Rerun 完成後，不得直接更新 Main Canvas / Thumbnail / Batch，必須回到 Review Workspace由使用者重新決定 `approved` 或 `needs_rerun`。目前主要流程是 AI Workflow 自動 Rerun：Review Workspace Completion Screen 觸發後，串接 Ready Check／Processing Mode／Auto Import，完成後自動回到 Review Workspace；Control Center 選單內的人工「Export Manifest → Photoshop Runner → Import Processed Folder」流程作為獨立備援保留，不是唯一或主要路徑（詳見 `docs/Photoshop Asset Pipeline.md`）。

```text
Photoshop Rerun
  ↓
Auto Import（AI Workflow，主要流程）或 Import Processed Folder（人工備援）
  ↓
Return to Review Workspace
  ↓
Approve / Needs Rerun
```

不得跳過 Review Workspace。

### Review Workspace UX Polish

Review Workspace UX Polish 已完成，屬於 Review Workspace 的 workflow / navigation / keyboard UX 層，不改變 Project State schema、Asset Pipeline schema、Approved Asset Resolver、Render Engine、Canvas、Thumbnail 或 Batch。

完成行為：

- Auto Next：`Approve` / `Needs Rerun` 後自動前往下一張。
- Multi-pass Review：支援 `All Assets` 與 `Needs Rerun Only`。
- Review Progress Header：依目前 filter 顯示進度與 decision count。
- Smart Entry：重新開啟時優先定位未 review asset。
- Decision Guard：支援 runtime-only `Undo Last Decision`。
- Remove Drag Tool：Pan 改為 Space temporary pan，不再是 persistent tool。

### Review Workspace Responsibilities

Review Workspace 負責：

- Review processed assets
- Crop
- Eraser
- Review decision：`approved` / `needs_rerun`
- Return approved assets
- Send needs_rerun collection to Photoshop Rerun Automation

Review Workspace 不負責：

- Logo editing
- Main Canvas rendering
- Thumbnail rendering
- Batch rendering
- Photoshop execution

Logo 不屬於 Review Workspace。Logo 維持控制台右側素材編輯。

### Review Workspace UI Upgrade（Completed）

Review Workspace UI Upgrade 是 UI 層改版，只調整 Review Workspace 的 Information Architecture、Layout 與呈現方式，不改變本節定義的資料責任、Review Decision Model 或 State Boundary：

- Navigator：只顯示檔名、Review Status、Dirty Status；Review Summary 與 Filter（全部素材／待重新去背）在 Navigator 上方。
- Workspace Layout：預設 Navigator + Workspace；Inspector 預設收合，選取裁切或橡皮擦才展開 Dynamic Inspector，儲存或取消後收合；不建立新的 Editor Session，不重建 Editor DOM。
- Decision Area：核准／重新去背／撤回上一個決策三顆按鈕同列；上一張／下一張／撤回上一個決策僅移除可見 Header UI，Navigator 點擊、Keyboard ← / →、Auto Next、非循環導航底層邏輯不變。
- Completion Screen / Completion Recovery：完成判斷讀取全域 Reviewable Assets（非目前 Filter collection），可從 Completion Screen 撤回決策並透過 Navigator 重新進入已完成素材繼續編輯。
- 中文化僅限 UI Label；`approved` / `needs_rerun` / `pending` / `processed` / `all` / `crop` / `eraser` 等 internal values 不變。

完整 UI 規格見 `docs/UI Design Guideline.md`；操作流程見 `docs/SPX-AD-版型規格與操作說明.md`。

### Photoshop Rerun Automation Responsibilities（人工備援流程）

本節描述的是 Control Center 選單內的人工備援入口。目前主要流程是 AI Workflow 自動 Rerun（Review Workspace Completion Screen 觸發，串接 Ready Check／Processing Mode／Auto Import，見下方「AI Workflow Architecture」），本節的人工流程與其共存、未被取代，作為獨立備援保留。

Responsibilities（人工備援流程）：

- Read derived needs_rerun collection from `assetPipelineState.assets`
- Export rerun manifest：`photoshop-rerun-manifest.json`
- Use existing Photoshop Runner; no native bridge / protocol handler
- Import Processed Folder and overwrite Latest Processed
- Return assets to Review Workspace

Out of Scope：

- Review decision
- Crop
- Eraser
- Canvas
- Thumbnail
- Batch
- Project State redesign

## Render Flow

```text
CSV
+
素材
  ↓
Project State
  ↓
template.json
+
style.json
  ↓
Canvas (Render Engine)
  ↓
Preview / Export
```

實際流程：

1. 控制台建立或匯入 Project State。
2. 每個 job 保存 size、template、style、文字、素材、layoutState、thumbnail。
3. Canvas iframe 載入 `canvas.html?template=...&style=...`。
4. `template-loader.js` 讀取並合併 Template 與 Style。
5. `canvas-entry.js` 建立 DOM 並套用背景、資訊圖、文字色。
6. `layout-runtime.js` 依 Template 排版 Logo、商品、Person、SingleProduct。
7. `box-transform-utils.js` 控制可手動 transform 的物件。
8. Capture 輸出 preview、thumbnail 或 PNG。

## Template

Template 負責排版結構。

檔案：

```text
templates/{size}/template.json
```

Template 保存：

- 位置
- 尺寸
- 圖層
- 文字區域
- Logo 區域
- 三商品區域
- Person 區域
- SingleProduct 區域
- Transform 初始排版
- `sizeRatios`
- `layoutMode`
- `autoShadow`
- baseline 相關設定

Template 不保存：

- 背景圖
- 資訊圖
- 文字顏色
- 使用者拖曳後的 transform
- thumbnail

## Style

Style 負責視覺樣式。

檔案：

```text
templates/{size}/styles/{styleId}.json
```

Style 保存：

- 背景
- 資訊圖
- 主標顏色
- 副標顏色
- 小字顏色

Style 範例：

```json
{
  "id": "01",
  "name": "樣式 01",
  "background": "assets/source/1599x1080/backgrounds/bg_01.png",
  "infoGraphic": "assets/source/1599x1080/info/info_01.png",
  "headlineColor": "#ffffff",
  "subHeadlineColor": "#ffffff",
  "smallTextColor": "#ffffff"
}
```

## Project State

Project State 是控制台目前工作區的資料來源。

保存：

- CSV jobs
- 文字
- size
- template
- style
- Logo assets
- Product assets
- Person assets
- SingleProduct state
- Transform
- layoutStates
- thumbnail / quickThumbnail
- Asset Pipeline metadata（v4）
- processedAssets persistence（v5）

Project State v5（Completed）：

- Project State v5 建立 Project Persistence contract。
- `single-state.json` 可保存單張工單需要的 latest processed image `dataUrl`。
- `project.zip` 會保存 `project-state.json` 與 `processed/` folder。
- `project-state.json` 的 `processedAssets` 只保存 `filename`，不保存 processed image `dataUrl`。
- 匯入 single-state / project.zip 後會重建 runtime `processedAssetIndex`。
- 匯入後不需要重新 Import Processed Folder，即可恢復 approved processed assets。
- Main Canvas、Thumbnail、Batch 透過既有 `BNAssetResolver` 與 Render Context 自然使用 restored latest processed image。
- Download Complete Project 會輸出所有 PNG、`project-state.json` 與 `processed/`。

Project State v4（Completed / legacy metadata layer）：

- `project-state.json` / `single-state.json` 會保存 `assetPipelineState` metadata。
- Project State v4 已達成 Asset Pipeline metadata 與 Review decision 的可恢復目標。
- 保存 Review decision：`approved` / `needs_rerun`。Legacy `rejected` import 會 migration 為 `needs_rerun`。
- 保存 `processedAsset` metadata，但不保存 processed image `dataUrl`。
- 不保存 `FileSystemHandle` / object URL / `processedAssetIndex` / runtime cache。
- 匯入 v4 後可恢復 Asset Pipeline metadata 與 Review decision。
- 匯入 v4 後若尚未重新 Import Processed Folder，approved processed asset 會 fallback original。
- v5 起由 Project Persistence 保存 latest processed image，不需要重新 Import Processed Folder。
- v2 / v3 Project State 保持相容。
- Thumbnail refresh UX 屬於未來優化，不屬於 Project State 缺口。

規則：

- CSV 匯入會建立全新 Project State。
- 暫存 JSON 匯入會恢復 Project State。
- 匯入暫存後不需要原素材資料夾。
- 匯出暫存 JSON 需包含恢復畫面所需的素材 dataUrl。
- `layoutStates` key 固定為 `placementId|templateId`。
- 有 `layoutStates` map 時只能讀目前 key；目前 key 不存在時使用該 template 預設 layout。
- `layoutState` 僅保留 legacy 相容，不作為跨尺寸同步機制。
- Project State v5 不修改 `layoutStates` schema。
- Project State v5 不修改 Main Canvas / Thumbnail / Batch 架構。
- Project State v5 不修改 Photoshop Pipeline。

## Project Persistence Architecture

Project Persistence 是正式的 Workspace Save / Restore layer。

核心原則：

- Project Save = Workspace Save。
- Restore 後回到存檔當下可繼續工作的狀態。
- Review Workspace Save 的 latest processed image 需要被保存與恢復。
- 不保存 `FileSystemHandle`、object URL、runtime cache 或 Photoshop runtime。
- 不建立 processed image version history。

Persistence Layer：

- `js/project-persistence.js` 負責 processed assets persistence helper。
- Export 時從 runtime `processedAssetIndex` 收集 latest processed image。
- Import 時從 `single-state.json` 或 `project.zip` 重建 runtime `processedAssetIndex`。
- Persistence Layer 不 Render、不操作 Canvas、不改 Resolver decision、不執行 Photoshop。

Project State v5：

```json
{
  "schema": "spx-ad-project-state",
  "version": 5,
  "type": "project",
  "processedAssets": {
    "JOB001__product__slot0__商品A": {
      "filename": "商品A.png"
    }
  }
}
```

Naming Contract（Locked by Jamie，全域唯一規則）：processed 圖片實體檔名一律是「原始素材 basename ＋ `.png`」（例如 `商品A.jpg` / `商品A.webp` 都對應 `商品A.png`）。`processedAssets` 的物件 key（上例的 `JOB001__product__slot0__商品A`）是 assetKey，只作為內部 State Identity／metadata mapping 使用；assetKey 不會、也不得出現在 `filename` 欄位或任何實體檔名裡。AI Workflow、人工備援流程（匯出處理檔／匯入處理結果）、Project Persistence（`single-state.json`／`project.zip`）與 Review Workspace Save 共用同一套規則，Project Persistence 不會另外重新命名 processed 圖片，也沒有獨立的第二套命名邏輯——`project.zip` 內 `processed/` 資料夾的檔名就是直接沿用 `processedAssets[assetKey].filename` 的值。

`single-state.json`：

- `type = single`。
- 可在 `processedAssets[assetKey]` 內保存 `filename` 與 `dataUrl`。
- 一個 JSON 可恢復單張工單與 latest processed image。

`project.zip`：

```text
project_YYYY-MM-DD.zip
├── JOB-1.png
├── JOB-2.png
├── project-state.json
└── processed/
    ├── 商品A.png
    └── ...
```

- `project-state.json` 不保存 processed image `dataUrl`。
- `processed/` 保存 latest processed image，檔名為「原始素材 basename ＋ `.png`」，與 AI Workflow／人工備援流程輸出的檔名規則完全一致（見上方 Naming Contract 說明），不是 Project Persistence 自己另外決定的命名。
- ZIP import 讀取 `project-state.json` 與 `processed/` 後重建 runtime source。

Restore Flow：

```text
Import single-state.json / project.zip
  ↓
Restore jobs / assets / layoutStates / assetPipelineState
  ↓
Restore processedAssets into runtime processedAssetIndex
  ↓
Existing BNAssetResolver
  ↓
Asset Payload
  ↓
Main Canvas / Thumbnail / Batch
```

Boundary：

- 不修改 Approved Asset Resolver API。
- 不讓 Canvas 讀 Project State `processedAssets`。
- 不修改 Main Canvas / Thumbnail / Batch render flow。
- 不修改 Photoshop Pipeline。
- `layoutStates` schema 不變。

## Asset Payload

Asset Payload 是素材到 Canvas message 的轉換層，不是 Project State owner。

模組：

- `js/asset-classifier.js`：Logo 排序、三商品分類、1人＋1品分類。
- `js/asset-processing.js`：trim / autoTrim。
- `js/asset-render-payload.js`：建立 Canvas postMessage payload。

輸出 payload：

- `bn-logos`
- `bn-product-add`
- `bn-person-add`
- `bn-single-product-add`

規則：

- Asset Payload 可讀取 filenames、asset handles、template default layout。
- Asset Payload 不讀寫 `job.layoutStates`。
- Asset Payload 不讀寫 thumbnail。
- Asset Payload 不處理使用者 transform restore。
- 使用者 transform restore 必須在 payload 套入 Canvas 並等待圖片載入後執行。


Approved assets：

- Main Canvas、Thumbnail 與 Batch Render 共用 `BNAssetResolver` 解析 approved processed assets。
- `asset-render-payload.js` 接收 resolved assets；有 processed dataUrl 時使用 processed source，否則 fallback original。
- Batch Render 可透過 `BNAssetResolver` 讀取 approved processed assets，但仍不得寫入 `layoutStates` 或 Project State schema。


## Smart Layout Propagation

Smart Layout Propagation 用於三商品跨尺寸初始排列。

```text
Master Layout
  ↓
Smart Layout Propagation
  ↓
Target LayoutState
```

原則：

- 每個 Job 擁有自己的 3 商品 Master Layout。
- Master Layout 為 runtime-only。
- Master Layout 不屬於 Project State。
- Master Layout 不屬於 `layoutStates`。
- Master Layout 僅保存三商品。
- Master Layout 僅作為 Smart Layout Propagation 的來源。
- 更新 Master Layout 不會影響任何已存在的 layoutState。

Job 架構：

```text
Job
├── Master Layout（runtime-only）
├── layoutState（984）
├── layoutState（1080）
├── layoutState（1599）
└── layoutState（3189）
```

Propagation 規則：

- 僅處理三商品。
- 視三商品為一個 Group。
- 保留：
  - 相對位置
  - 大小比例
  - 個別縮放
  - 旋轉
  - zIndex
- 自動 Fit 至 target Products Zone。
- 採最大可放比例：
  - 寬先碰邊界以寬為準。
  - 高先碰邊界以高為準。
- Products Zone 水平置中。
- Products Zone 垂直置中。
- 建立 target size 自己的 layoutState。

## Master Layout

Master Layout 是 Smart Layout Propagation 的 runtime-only source。

- 每個 Job 擁有自己的 Master Layout。
- Master Layout 為 runtime-only。
- 不寫入 Project State。
- 不寫入 `layoutStates`。
- 不 Export。
- 不 Import。

Smart Layout Propagation 完成後：

- 建立 target size 自己的 layoutState。
- 各尺寸永久獨立。
- Master Layout 不會持續同步任何 layoutState。

## State Boundary

State Boundary 定義哪些流程可以讀或寫 state。

| 流程 | 讀取 | 寫入 | 邊界 |
|---|---|---|---|
| Main Canvas | active job、Template、Style、Asset Payload、目前 key 的 `layoutStates` | `job.layoutStates[current placement|template]` | 唯一互動編輯來源 |
| Thumbnail | 指定 job 的文字、素材、Style、Template、`layoutStates` | `job.thumbnail`、`thumbnailStatus` | hidden iframe 只產縮圖，不寫 transform |
| Batch Render | render job 自己的文字、素材、Style、Template、approved processed assets、`layoutStates` | PNG ZIP、可更新 UI thumbnail | deterministic renderer，不寫 layout state |
| Project State Export | jobs、assets、style、`layoutStates`、thumbnail、Asset Pipeline metadata、latest processed image metadata | `single-state.json` / `project-state.json` / `project.zip` | v5 可保存 latest processed image；不保存 FileSystemHandle、object URL 或 runtime cache |
| Project State Import | 暫存 JSON / project.zip | jobs、assets、style、`layoutStates`、thumbnail、Asset Pipeline metadata、runtime `processedAssetIndex` | 合法 replace workspace 邊界；v5 可從 single-state / project.zip 直接恢復 processed source |
| Asset Payload | assets、template default layout | Canvas payload messages | 不碰 Project State |
| Photoshop Pipeline | original / processed / approved assets | asset processing status、approved asset mapping | 不碰 Canvas transform |

Render restore 順序：

```text
load template
  ↓
apply text
  ↓
apply asset payload
  ↓
wait images
  ↓
apply layoutStates[current placement|template]
  ↓
capture / thumbnail / export
```

### Product Identity

三商品身份識別順序：

1. id
2. filename
3. position（最後 fallback）

說明：

- DOM 重建後 id 可能改變。
- 使用者調整前後順序後，position 不再代表商品身份。
- filename 為 Batch Restore 的穩定身份。
- Batch Render、Restore、Project State Restore 不可只依 position 或 array index 對應商品。

重要限制：

- Thumbnail hidden iframe 不得呼叫 `setJobLayoutState()`。
- Batch Render 不得回寫 `layoutStates`。
- Background render 不得使用 currentJob 當作 render job 的 transform source。
- 有 `layoutStates` map 時，不得 fallback 到其他尺寸 key。
- 1人＋1品不跨尺寸同步；每個尺寸使用自己的 layoutState 或 template 預設。
- 三商品未來可以新增 Linked Product Transform，但需另設 state schema，不可偷用目前 per-template `layoutStates` fallback。

## Photoshop Pipeline 邊界

Photoshop Pipeline 是 Asset Pipeline 的 adapter（已完成，Photoshop Automation ／ AI Workflow，見下方章節），不屬於 Render Engine。

實際資料流：

```text
Asset Folder
  ↓
Asset Pipeline
  ↓
Photoshop Adapter
  ↓
Processed Assets
  ↓
Review / Approved Assets
  ↓
Asset Payload
  ↓
Canvas Render
  ↓
Thumbnail / Export
```

Photoshop Pipeline 可寫：

- asset processing status
- processed asset path / dataUrl
- review status
- approved asset mapping

Photoshop Pipeline 不可寫：

- `layoutStates`
- Canvas DOM
- Product / SingleProduct transform
- Template placement
- Batch Render runtime state

## Photoshop Automation Architecture（Completed）

本節描述 Photoshop Automation 的實際已完成架構（macOS Development Validated；Windows Validation Deferred）。Photoshop Automation 只涵蓋「已開啟且 Ready 的 Photoshop」這一側的能力，不包含 Control Center orchestration（Manifest 建立、自動 Import、自動開啟 Review Workspace 屬於 AI Workflow，見下一節）。既有的人工流程（`tools/photoshop/run-photoshop-manifest.command` 手動雙擊）仍保留、未被移除，是與 Runtime 並存的獨立路徑。

### Runtime 架構

```text
Control Center（AI Workflow）
  ↓ HTTP（127.0.0.1:8901，本機 only）
SPX AD Runtime（tools/photoshop-automation/spx_ad_runtime.py，Python stdlib-only）
  ↓
Platform Adapter Interface（platform_adapter.py，依 OS 選擇）
  ↓                              ↓
macOS Adapter                Windows Adapter
（macos_adapter.py，          （windows_adapter.py，
 AppleScript／osascript）      pywin32／win32com.client）
  ↓                              ↓
既有 remove-background.jsx（去背核心、Logo copy、Run Report 未修改，兩平台共用同一個腳本；
                            Naming Contract Consistency Fix 只修正了 output.filename 缺漏時
                            的 fallback，改為 source basename + .png，不再組出 assetKey + "__processed.png"）
  ↓
processed PNG + photoshop-run-report.json（Runtime 隱藏 Workspace 內）
```

### Ready / Execution / Status / Result Contract（已實作）

- `GET /ready` → `{"ready": true}` 或 `{"ready": false, "reason": "photoshop_closed"}`。只連接已開啟的 Photoshop，不自動啟動。macOS Adapter 以 bundle id `com.adobe.Photoshop` 的 `is running` 屬性判斷（`application id "com.adobe.Photoshop" is running`），不依賴容易因版本不同而變動的 process 名稱；Windows Adapter 以 `win32com.client.GetActiveObject("Photoshop.Application")` 判斷，同樣不自動啟動。
- `POST /execute`（僅 Manifest JSON，不含素材內容）→ `{"accepted": true, "executionId": "..."}` 或 `{"accepted": false, "reason": "busy" | "manifest_invalid"}`。
- `POST /executions/{executionId}/assets/{assetId}`：逐一上傳素材原始 binary（不使用 base64），全部到齊後 Runtime 才觸發 Platform Adapter。
- `GET /status/{executionId}` → `{state, progress, lastResult}`；`lastResult.state` 為 `Completed` / `PartialFailure` / `Failure`，`Failure` 附帶 `reason`（例如 `photoshop_closed`）。
- `GET /executions/{executionId}/results/{assetId}` → 該筆 Processed PNG 的原始 `image/png` binary（非 JSON、非 base64）；尚未完成回 409，執行失敗回 404，已被清理回 410。
- Runtime Workspace（暫存輸入／輸出）完全隱藏、自動建立與清理，不是使用者可見的 Run 資料夾；具備 Pending Execution Timeout（避免上傳中斷導致永久 busy）與啟動時的 stale Workspace 清理。

### 邊界（Photoshop Automation，Locked）

- 前提：使用者已安裝並自行開啟 Photoshop；本 Phase 不自動安裝、自動啟動或自動關閉 Photoshop。
- 只負責 Photoshop 端能力：Ready Contract、接收 Manifest、執行去背核心、輸出 processed assets、輸出狀態 Contract。
- **不負責** Control Center Processing Mode UI、Control Center 自動 Import Processed Result、自動開啟 Review Workspace——這些是 AI Workflow 的責任（見下一節）。
- 未修改：Review Workspace UI、Navigator、Dynamic Inspector、Decision Area、Completion Screen、Crop / Eraser、Canvas、Thumbnail、Batch、`layoutStates`、Approved Asset Resolver、Project State schema、Review Decision Model。
- 未修改既有 Manifest schema 的核心概念、Photoshop Adapter Boundary、`remove-background.jsx` 的去背核心／Logo copy／Run Report。輸出命名一律為「原始 basename + `.png`」（見下方 Manifest Contract），不使用 `{assetKey}__processed.png`；`remove-background.jsx` 唯一被修改之處是 `output.filename` 缺漏時的 fallback（Naming Contract Consistency Fix，改為 source basename + `.png`，不再組出 `assetKey + "__processed.png"`），去背核心邏輯不受影響。
- Windows Adapter 使用 pywin32（`win32com.client`），未使用 VBScript 或 `cscript.exe` 等淘汰技術；已完成實作與自動化測試，尚未通過真實 Windows + Photoshop 環境驗證。

## AI Workflow Architecture（Completed）

本節描述 AI Workflow 的實際已完成架構（macOS Development Validated；Windows Validation Deferred）。目的：使用者只需在開始前自行開啟 Photoshop；之後不需操作 Photoshop，也不需理解 Manifest / Runtime / Processed Folder 等技術 Pipeline。

### 使用者可見流程（Completed）

```text
使用者先自行開啟 Photoshop
  ↓
匯入 CSV + 選擇素材資料夾（一次；選擇時一併取得 readwrite 權限）
  ↓
Photoshop Ready Check（未通過 → 顯示「Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。」）
  ↓
Control Center 顯示 Processing Mode（素材處理中／請勿操作 Photoshop／系統將自動完成背景處理／完成後將自動帶入素材審閱；含 N/M 進度）
  ↓
素材處理完成（約 0.8 秒轉場，非完成判定依據）
  ↓
系統自動帶入 processed assets 並自動開啟素材審閱，自動選取第一筆素材
  ↓
素材審閱（Review Workspace，UI 不變）
  ↓
Needs Rerun = 0 → 返回控制台
Needs Rerun > 0 → 重新去背素材（N）→ 再次進入 Processing Mode（Photoshop 全程保持開啟，不重新啟動）→ 自動回到待重新去背審閱
```

### Manifest Contract（Locked）

- 同一 `originalAsset.lookupKey` 被多個 assetKey 引用時，Manifest 只建立一個 item（去重），並以 `assetKeys[]` 陣列保留所有內部 assetKey；`assetKey` 本身作為 State Identity 不變。
- 輸出檔名固定為「原始 basename + `.png`」（例如 `商品A.jpg` → `Processed/商品A.png`），不使用 `{assetKey}__processed.png` 或任何 jobId／role／slot 後綴。
- 同一 lookupKey 群組內若各筆的 `operations`（`removeBackground` / `trim` / `normalize`）不一致，Manifest 建立會回傳結構化的 `operations_conflict` 錯誤，拒絕整個 Manifest，不猜測、不輸出多份檔案。

### 背景處理資料流（Completed）

```text
Control Center 建立 Manifest（既有 buildPhotoshopJobManifest / buildPhotoshopRerunManifest）
  ↓
POST /execute 建立 executionId → 逐一上傳素材 binary
  ↓
Processing Mode 鎖定 Control Center（Global Interaction Lock）
  ↓
GET /status/{executionId} 輪詢 Progress，直到 Completed / PartialFailure / Failure
  ↓
GET /executions/{executionId}/results/{assetId} 逐一取回 Processed PNG binary
  ↓
Browser 用既有的 FileSystemDirectoryHandle 寫入真正的 素材資料夾/Processed/（同名可安全覆蓋）
  ↓
沿用既有 Matching 函式自動 Import（依 assetKeys[] 回填多筆 state record，需要重新去背的素材維持 needs_rerun，不 Auto Approve）
  ↓
自動開啟 Review Workspace（既有 UI，自動選取第一筆素材）
```

### Error / Recovery（Completed）

| 情境 | 使用者可見文案 | Retry 行為 |
|---|---|---|
| Ready Check 失敗／Photoshop 處理中關閉 | Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。 | 重新檢查＝整批重新開始（含重新執行 Ready Check），不會重複觸發已完成的 Execution。 |
| Execute 被拒絕／Manifest 衝突／部分失敗 | 素材處理失敗。／部分素材處理失敗。 | 重試＝整批重新開始。 |
| 素材上傳失敗 | 素材處理失敗。 | 重試＝沿用同一個 executionId，只補傳尚未成功的素材。 |
| Status Polling 暫時失敗／executionId 遺失 | 素材處理失敗。 | 前者可恢復輪詢；後者（Runtime 端執行已不存在）僅能整批重新開始。 |
| 寫入 Processed 失敗（含 readwrite 權限被拒絕） | 無法寫入處理結果。（權限被拒絕時顯示「重新授權」） | 沿用同一個 executionId，只重新取回／寫入尚未成功的項目；已被 Runtime 清理則誠實顯示需整批重新開始。 |
| Auto Import／Matching 失敗（Processed 已寫入） | 素材處理失敗。 | 只重新呼叫 Matching，不重新取回、不重跑 Photoshop。 |
| Review Workspace 開啟失敗 | 無法開啟素材審閱。 | 重新開啟素材審閱＝只重新呼叫既有開啟入口，不重跑 Photoshop、不重新 Auto Import。 |

Global Interaction Lock 在所有復原情境期間持續維持，只開放對應的復原按鈕；復原成功並進入 Review 後才解除。Retry 一律不會重複觸發 Photoshop，也不會遺漏已成功寫入的部分。

### 責任分工（Completed，Locked）

- Control Center：顯示一般使用者能理解的背景處理狀態（Processing Mode）；鎖定背景處理期間的操作；不暴露 Photoshop / Manifest / Processed Folder 技術細節（復原提示除外）。
- AI Workflow（Control Center 端 Orchestration，`js/ai-workflow-*.js`）：使用既有 Manifest builder 建立並送出工作、執行 Ready Check 的 Control Center 端流程、顯示 Processing Mode、輪詢並讀取 Photoshop Automation 回報的狀態、沿用既有 Matching 函式自動 Import、自動開啟 Review Workspace、提供 Error / Recovery。不直接寫 Canvas、`layoutStates` 或 Project State schema。
- Photoshop Automation（見上一節）：負責 Ready Contract、接收 Manifest、執行既有去背核心、輸出 processed assets 與狀態 Contract。AI Workflow 呼叫其 Contract，不重新實作其能力。
- Photoshop Adapter：責任不變，只讀 manifest 與原始素材，輸出 processed assets 與 run report；不知道 Control Center 自動化細節。
- Review Workspace：責任與 UI 不變（Navigator / Dynamic Inspector / Decision Area / Completion Screen 維持 Review Workspace UI Upgrade 既有設計），只接收 AI Workflow 帶入的 processed assets 並照既有 flow 顯示；唯一的修正是「開啟時／決策後的完成畫面判斷」改為依目前 Filter 是否還有素材，而不是全域審閱進度（Bug Fix，未改變 Navigator、Dynamic Inspector、Decision Area、Completion Screen 的架構或 Review Decision Model）。

### 邊界（Completed）

- AI Workflow 的 Control Center Orchestration 是協調層，不是 Render Engine，也不是 Asset Pipeline 的替代品，不重複實作 Photoshop Automation 已提供的能力。
- 所有既有 State Boundary（Asset Pipeline / Review Decision Model / Approved Asset Resolver / Project State / Photoshop Pipeline）維持不變。
- 未重新設計 Review Workspace UI、Navigator、Dynamic Inspector、Decision Area 或 Completion Screen。
- 未重新暴露 Photoshop / Manifest / Processed Folder 給一般使用者（復原提示除外）。
- Production Launcher、PyInstaller 打包、Cloud Deployment 尚未開始，不在本節範圍內。

## Documentation Structure

專案文件分工：

- `README.md`：專案入口、啟動方式與主要文件導覽。
- `docs/AI-HANDOFF.md`：AI 接手前必讀的專案交接文件，整理目前狀態、邊界、開發規則與 Roadmap。
- `docs/Architecture.md`：系統架構、Render Flow、State Boundary 與模組關係。
- `docs/CHANGELOG.md`：版本紀錄、穩定節點與重要設計決策。
- `docs/控制台開發指引.md`：控制台、Canvas、Project State、Thumbnail、Batch Render 的開發規則。
- `docs/Photoshop Asset Pipeline.md`：Asset Pipeline、Photoshop Adapter、processed import 與 Review Workspace 規格。
- `tools/photoshop-automation/README.md`／`BUILD.md`：SPX AD Runtime、Platform Adapter 與 Production Launcher 打包的實作參考文件（非本節列出的專案級文件，範圍僅限該資料夾）。

## 資料夾結構

```text
templates/
  {size}/
    template.json
    styles/
      01.json
      ...
      16.json

assets/source/
  {size}/
    backgrounds/
      bg_01.png
      ...
      bg_16.png
    info/
      info_01.png
      ...
      info_16.png
    guide_品.png
    guide_1人1品.png

js/
  template-loader.js
  canvas-entry.js
  layout-runtime.js
  product-slot-utils.js
  asset-classifier.js
  asset-processing.js
  asset-render-payload.js
  box-transform-utils.js
  bn-image-utils.js

src/
  app.js
  app.css

config/
  templates.js
  templates.json
```

## 新增 Style 流程

新增第 17 個 Style：

1. 新增背景圖：

```text
assets/source/{size}/backgrounds/bg_17.png
```

2. 新增資訊圖：

```text
assets/source/{size}/info/info_17.png
```

3. 新增 Style JSON：

```text
templates/{size}/styles/17.json
```

4. Style JSON 填入：

```json
{
  "id": "17",
  "name": "樣式 17",
  "background": "assets/source/{size}/backgrounds/bg_17.png",
  "infoGraphic": "assets/source/{size}/info/info_17.png",
  "headlineColor": "#ffffff",
  "subHeadlineColor": "#ffffff",
  "smallTextColor": "#ffffff"
}
```

5. 若控制台 Style 清單由 config 控制，需同步更新 config 或執行產生流程。

不需要修改 Canvas 排版 JS，也不需要修改 Template。

可選工具：

```text
node scripts/generate-style-json.js
node scripts/generate-style-json.js --count 17
```

此工具只用於開發維護，Runtime 不依賴它。

## 維護原則

- Template 與 Style 不混用。
- 控制台與 Editor 不各自實作相同行為。
- 商品角色判斷集中在 `product-slot-utils.js`。
- Transform 集中在 `box-transform-utils.js`。
- Project State 匯入/匯出走同一套 serializer。
- Thumbnail 不依賴 currentJob，必須能用指定 job 在 hidden iframe 產生。
- Thumbnail / Batch Render 只能讀 `layoutStates`，不得回寫 transform。
- Asset Payload 只負責素材初始套入，不負責使用者 transform restore。
- Photoshop Pipeline 僅接 Asset Pipeline，不直接耦合 Render Engine。
