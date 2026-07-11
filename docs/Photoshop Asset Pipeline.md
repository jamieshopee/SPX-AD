# Photoshop Asset Pipeline

Version: 2026.07.11-photoshop-automation-split
Last Updated: 2026-07-11  
Scope: Photoshop Asset Pipeline 的操作流程、內部資料契約、State Boundary 與 Troubleshooting。此文件只描述行為與規則，不改變 Pipeline、Canvas、Thumbnail、Batch 或 Project State 行為。目前文件描述的是人工操作 Pipeline 的真實行為；文末 Future Automation Target 拆分為 A. Photoshop Automation（目前 Active Phase，Proposal 階段）與 B. AI Workflow（Draft / Paused pending Photoshop Automation），皆標註尚未實作。

## Quick Workflow

本節給 Designer / 日常使用者。照順序操作即可，不需要理解 schema。

### 1. Export Photoshop Manifest

在控制台完成 CSV / jobs 與素材資料夾匯入後，匯出：

```text
photoshop-job-manifest.json
```

這份 manifest 會描述 Photoshop 需要處理哪些素材。

Manifest 不包含：

- `layoutState`
- `layoutStates`
- Canvas coordinates
- transform
- thumbnail
- Project State full payload

### 2. Run Photoshop Remove Background

使用 Photoshop Runner 讀取 `photoshop-job-manifest.json`，選擇 original asset folder 與 processed output folder。

輸出檔名必須維持：

```text
{assetKey}__processed.png
```

例如：

```text
JOB001__product__slot0__A001_主品__processed.png
```

### 3. Import Processed Folder

在控制台執行 Import Processed Folder。

控制台會：

```text
選擇 processed folder
  ↓
掃描圖片檔
  ↓
從 filename 解析 assetKey
  ↓
對回 assetPipelineState.assets[assetKey]
  ↓
matched：status = processed
unmatched：記錄 unmatchedProcessedAssets
```

若 matched 數量正確，代表 processed assets 已對回目前 Asset Pipeline State。

### 4. Review Processed Assets

開啟 Review Workspace（素材審閱）檢查 processed assets。

可標記：

- `approved`
- `needs_rerun`

Review Workspace 使用者 UI 顯示（Review Workspace UI Upgrade，v0.4.5，Completed）：

- original image / processed image（Editor 畫面）
- 檔名
- Review Status（待審閱 / 已處理 / 核准 / 重新去背）
- Dirty Status（尚未儲存的修改）
- Review Summary（進度、核准數、重新去背數）
- Filter：全部素材 / 待重新去背

`assetKey`、`role`、`jobIds`、`slot`、`mode`、processed filename 等技術 Metadata 仍保留於內部資料結構（`assetPipelineState.assets[assetKey]`），供 Matching、Manifest、Resolver 等內部流程使用，但**不顯示**於使用者 UI（Navigator 與 Dynamic Inspector 皆已移除這些欄位，詳見 `docs/UI Design Guideline.md` 與 `docs/SPX-AD-版型規格與操作說明.md`）。

### 4.1 Photoshop Rerun Automation

當 Review Workspace 標記 `needs_rerun` 後，不會立即執行 Photoshop。控制台會以 runtime derived collection 計算：

```text
assetPipelineState.assets
  ↓
filter(status === "needs_rerun")
```

`Run Photoshop Rerun (N)` 會依 collection 數量顯示。`N=0` 時按鈕 disabled。

按下後會匯出：

```text
photoshop-rerun-manifest.json
```

這份 manifest 只包含 `needs_rerun` assets，並沿用現有 Photoshop Runner。控制台不新增 native bridge、local helper 或 protocol handler。

Rerun 完成後：

```text
Import Processed Folder
  ↓
Latest Processed 覆蓋 Previous Processed
  ↓
Return to Review Workspace
  ↓
Approve / Needs Rerun
```

Import Processed Folder 不會 Auto Approve，也不會 Auto Update Main Canvas / Thumbnail / Batch。

### 5. Approved Assets in Canvas / Thumbnail / Batch

Approved processed assets 會由 Approved Asset Resolver 提供給 render projection。

目前行為：

- Main Canvas 可使用 approved processed assets。
- Thumbnail 可使用 approved processed assets。
- Batch ZIP 可使用 approved processed assets。
- `needs_rerun` / `pending` 會 fallback original。

Main Canvas 若只是素材來源改變，會優先更新既有 Canvas DOM 的 `img.src`，不重建 Product DOM，也不重設 transform。

### 6. Save / Restore Project State

Project State v4 會保存 Asset Pipeline metadata 與 Review decision。

會保存：

- `assetPipelineState` metadata
- Review decision：`approved` / `needs_rerun`
- `processedAsset` metadata

不會保存：

- processed image `dataUrl`
- `FileSystemHandle`
- object URL
- `processedAssetIndex`
- runtime cache

匯入 v4 後，如果尚未重新 Import Processed Folder，approved processed asset 會 fallback original。

重新 Import Processed Folder 後會回到 Review Workspace；不得 Auto Approve，也不得 Auto Update Main Canvas / Thumbnail / Batch。只有使用者再次 Approve 後，approved processed assets 才會進入 Render Pipeline。

## Designer Notes

- 如果 Review decision 已恢復，但畫面仍是原圖，通常是因為尚未重新 Import Processed Folder。
- Project State v4 會保存 decision，但不保存 processed 圖片本體。Legacy `rejected` 會在匯入時轉為 `needs_rerun`。
- processed assets 必須使用 `{assetKey}__processed.png` 命名。
- Logo 目前可在 Pipeline 中被記錄，但去背重點是 product / person / singleProduct。
- `approved` 表示可以使用 processed asset。
- `needs_rerun` 表示 processed 結果需要重新處理。

## Internal Pipeline

本節給工程師 / AI 接手使用。此處保留 schema、matching、runtime 與 metadata 規則。

### Pipeline Flow

```text
jobs + asset folder
  ↓
Asset Pipeline State
  ↓
photoshop-job-manifest.json
  ↓
Photoshop Adapter
  ↓
processed folder import
  ↓
Review Workspace
  ↓
approved processed assets
  ↓
Approved Asset Resolver
  ↓
Main Canvas / Thumbnail / Batch projection
```

### Asset Pipeline State

Schema:

```json
{
  "schema": "spx-ad-asset-pipeline-state",
  "version": 1,
  "sourceFolderName": "素材資料夾",
  "createdAt": "2026-07-05T00:00:00.000Z",
  "assets": {
    "JOB001__product__slot0__A001_主品": {
      "assetKey": "JOB001__product__slot0__A001_主品",
      "originalFilename": "A001_主品.png",
      "role": "product",
      "mode": "three_products",
      "slot": 0,
      "jobIds": ["JOB001"],
      "status": "pending",
      "originalAsset": {
        "filename": "A001_主品.png",
        "lookupKey": "a001_主品.png",
        "sourceFolderName": "素材資料夾",
        "exists": true
      }
    }
  }
}
```

### assetKey Rules

assetKey 格式：

```text
{jobKey}__{role}__{slotOrKind}__{filenameBase}
```

範例：

```text
JOB001__logo__slot0__LOGO_01
JOB001__product__slot0__A001_主品
JOB001__product__slot1__A001_左配品
JOB001__product__slot2__A001_右配品
JOB001__person__person__A001_人
JOB001__singleProduct__singleProduct__A001_品
```

role：

- `logo`
- `product`
- `person`
- `singleProduct`

mode：

- `logo`
- `three_products`
- `person_product`

slot：

- 三商品：`0 / 1 / 2`
- Logo：排序後 index
- Person / SingleProduct：`null`

### Photoshop Job Manifest

Manifest 檔名：

```text
photoshop-job-manifest.json
```

Schema:

```json
{
  "schema": "spx-ad-photoshop-job-manifest",
  "version": 1,
  "runId": "psrun_20260705000000",
  "createdAt": "2026-07-05T00:00:00.000Z",
  "sourceFolderName": "素材資料夾",
  "outputFolder": "asset-pipeline/processed/psrun_20260705000000",
  "itemCount": 1,
  "items": [
    {
      "assetKey": "JOB001__product__slot0__A001_主品",
      "originalFilename": "A001_主品.png",
      "role": "product",
      "mode": "three_products",
      "slot": 0,
      "jobIds": ["JOB001"],
      "status": "pending",
      "source": {
        "filename": "A001_主品.png",
        "lookupKey": "a001_主品.png",
        "sourceFolderName": "素材資料夾",
        "exists": true
      },
      "output": {
        "folder": "asset-pipeline/processed/psrun_20260705000000",
        "filename": "JOB001__product__slot0__A001_主品__processed.png"
      },
      "operations": {
        "removeBackground": true,
        "trim": false,
        "normalize": false
      }
    }
  ]
}
```

Manifest 不包含：

- `layoutState`
- `layoutStates`
- Canvas coordinates
- transform
- thumbnail
- Project State full payload

### Processed Folder Matching

Processed filename 對應規則：

```text
{assetKey}__processed.png
```

解析方式：

```text
JOB001__product__slot0__A001_主品__processed.png
  ↓
JOB001__product__slot0__A001_主品
```

matched asset 會更新：

```json
{
  "status": "processed",
  "processedAsset": {
    "filename": "JOB001__product__slot0__A001_主品__processed.png",
    "lookupKey": "job001__product__slot0__a001_主品__processed.png",
    "sourceFolderName": "processed-folder",
    "exists": true,
    "importedAt": "2026-07-05T00:00:00.000Z"
  }
}
```

unmatched asset 會記錄：

```json
{
  "unmatchedProcessedAssets": [
    {
      "filename": "unknown__processed.png",
      "assetKey": "unknown",
      "reason": "assetKey not found"
    }
  ]
}
```

### Review Decision

Decision 寫入 `assetPipelineState.assets[assetKey]`：

```json
{
  "status": "approved",
  "review": {
    "decision": "approved",
    "decidedAt": "2026-07-05T00:00:00.000Z",
    "note": ""
  }
}
```

`status` 與 `review.decision` 目前會同步更新，但責任不同：

- `status` 是 pipeline record 的目前生命週期狀態。
- `review.decision` 是人工審核決策紀錄。

### Runtime Source

`processedAssetIndex` 是控制台 runtime index，只保存 processed folder 的 `FileSystemFileHandle`，用於 Review Workspace 顯示 processed image 與 Resolver 讀取 processed runtime source。

`processedAssetIndex` 不寫入 Project State，避免把本機 runtime handle 混入可攜式工作區狀態。

### Approved Asset Resolver

Approved Asset Resolver 讀取 Asset Pipeline State 與目前 job，判斷每個 asset 應使用 processed 或 original。

Fallback 規則：

- `approved` + `processedAsset` + runtime handle 存在：使用 processed image。
- `approved` 但 processed runtime source missing：使用 original。
- `pending`：使用 original。
- `needs_rerun`：使用 original。
- missing：維持既有 missing 行為。

### Project State v4 Metadata

Project State v4 會保存 Asset Pipeline metadata，讓 Review decision 與 processed metadata 可隨工作區恢復。

保存：

- `assetKey`
- original filename
- role
- mode
- slot
- jobIds
- status
- original asset lookup metadata
- processedAsset metadata
- review decision

不保存：

- processed image `dataUrl`
- `FileSystemHandle`
- object URL
- `processedAssetIndex`
- runtime cache
- Photoshop execution detail

## Guardrails

### Asset Pipeline Boundary

Asset Pipeline 只描述素材，不描述 Canvas。

允許保存：

- assetKey
- original filename
- role
- mode
- slot
- jobIds
- status
- original asset lookup metadata
- processedAsset metadata
- review decision

不得保存：

- `layoutState`
- `layoutStates`
- Canvas coordinates
- transform
- thumbnail
- template DOM state
- Photoshop execution detail

### Photoshop Adapter Boundary

Photoshop Adapter 只需讀取 `photoshop-job-manifest.json`，處理 `items[]`，並依 `output.filename` 產生 processed assets。

Photoshop Adapter 不應讀取 Project State，也不應知道 Canvas / Template / layoutStates。

### Render Boundary

Pipeline / Resolver / Review 不可修改 `layoutState` / `layoutStates`。

Main Canvas 若只是素材來源改變，必須 Preserve Existing State：

- 只更新既有 Canvas DOM 的 `img.src`
- 不重建 Product DOM
- 不重新 `applyProductsToCanvas()`
- 不重新依 template 排版
- 不重跑 template fit
- 不重設 transform

Thumbnail / Batch 是 projection，不是 state owner。

### Phase 2A-3 Boundaries

Phase 2A-3 Processed Folder Import 不做：

- 不 approve
- 不接 Canvas
- 不接 Asset Payload
- 不修改 `layoutState` / `layoutStates`
- 不修改 thumbnail / batch / render flow

### Phase 2C MVP Boundaries

Phase 2C MVP 維持 State Boundary：

- 不接 Canvas
- 不接 Asset Payload
- 不做 Crop
- 不做 Approved Asset Resolver
- 不修改 `layoutState` / `layoutStates`
- 不修改 thumbnail / batch / render flow
- 不接 Project State export/import

## FAQ / Troubleshooting

### Q: Import Processed Folder matched 0，怎麼辦？

檢查 processed filename 是否符合：

```text
{assetKey}__processed.png
```

如果 Photoshop 輸出檔名少了 assetKey 或改名，控制台無法對回 `assetPipelineState.assets[assetKey]`。

### Q: Review decision 已恢復，但 Canvas 還是原圖？

這是正常 fallback。Project State v4 只保存 metadata 與 decision，不保存 processed 圖片本體或 FileSystemHandle。

重新 Import Processed Folder 後會回到 Review Workspace；不得 Auto Approve，也不得 Auto Update Main Canvas / Thumbnail / Batch。只有使用者再次 Approve 後，approved processed assets 才會進入 Render Pipeline。

### Q: approved 後仍然 fallback original？

常見原因：

- `processedAsset` metadata 不存在。
- `processedAssetIndex` runtime handle 不存在。
- 尚未重新 Import Processed Folder。
- processed filename 無法對回 assetKey。

### Q: Review Workspace 沒有 processed image？

檢查：

- processed folder 是否已匯入。
- matched 數量是否正確。
- `processedAssetIndex` 是否存在於目前 runtime session。

### Q: Batch / Thumbnail 何時會使用 processed asset？

Batch / Thumbnail 在 render projection 時會透過 Approved Asset Resolver 判斷是否使用 processed asset。

它們不可寫入 `layoutStates`，也不可成為 state owner。

### Q: Photoshop Pipeline 是否會修改 Canvas？

不會。Photoshop Pipeline 只處理素材並輸出 processed assets，不讀寫 Canvas、不寫 `layoutStates`、不修改 Render Engine。

## Phase History

### Phase 2A

Phase 2A 只建立素材處理流程的資料邊界：

```text
jobs + asset folder
  ↓
Asset Pipeline State
  ↓
photoshop-job-manifest.json
  ↓
processed folder import
```

Phase 2A 不做：

- Photoshop ExtendScript
- AppleScript / local command
- Review Workspace
- Crop Tool
- Approved Asset Resolver 接 Canvas
- Project State 大改版
- Render / Thumbnail / Batch 修改
- Approve / Review Workspace

### Phase 2A-3

Processed Folder Import 只把 Photoshop 輸出的 processed assets 對回 Asset Pipeline State。

### Phase 2B

Photoshop Adapter 讀取 `photoshop-job-manifest.json`，開啟素材並依 `output.filename` 輸出 processed assets。

### Phase 2C

Review Workspace 用於人工檢查 processed assets，並標記：

- `approved`
- `needs_rerun`

### Phase 2D

Approved Asset Resolver 讓 Main Canvas、Thumbnail 與 Batch 可使用 approved processed assets。

### Photoshop Rerun Automation

Needs Rerun Collection 由 `status === needs_rerun` 派生，不建立 queue array。`Run Photoshop Rerun (N)` 匯出 `photoshop-rerun-manifest.json`，Import Processed Folder 後回到 Review Workspace。

### PS-2A

Project State v4 保存 Asset Pipeline metadata 與 Review decision，但不保存 processed image dataUrl、FileSystemHandle、object URL、`processedAssetIndex` 或 runtime cache。

### Review Workspace UI Upgrade（v0.4.5）

Review Workspace UI Upgrade 只調整 Review Workspace 的 UI（Navigator / Dynamic Inspector / Decision Area / Completion Screen），不修改本文件描述的 Pipeline Flow、Asset Pipeline State schema、Manifest schema、Processed Folder Matching、Review Decision 資料格式或 Approved Asset Resolver。控制台「重新去背素材（N）」目前只呼叫既有 callback（`exportPhotoshopRerunManifest`），本文件描述的 Photoshop Rerun Automation 流程（匯出 rerun manifest → 人工執行 Photoshop Runner → 人工 Import Processed Folder → 回到 Review Workspace）維持不變、仍需人工操作。

## Future Automation Target（Future / Not Implemented）

本節描述 Roadmap 上兩個相關但獨立的 Future Phase 的目標方向，尚未實作，不得視為目前已完成行為。目前 Quick Workflow 與 Internal Pipeline 章節描述的人工流程仍是唯一真實行為。Photoshop Automation 必須先完成，AI Workflow 才能開始串接。

### A. Photoshop Automation（目前 Active Phase，Proposal 階段）

前提：所有使用者已安裝 Adobe Photoshop，並會在使用控制台前自行開啟 Photoshop。本 Phase 不負責自動安裝、自動啟動或自動關閉 Photoshop；目標是讓 Photoshop 開啟後，使用者不需要再操作 Photoshop。

目前真實現況（已透過 Current Photoshop Pipeline Architecture Audit 確認）：

- Manifest 建立已是純記憶體運算（`buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest`），下載 JSON 只是最後一步輸出動作。
- 現有 Runner 是**一次性**流程：使用者雙擊 `tools/photoshop/run-photoshop-manifest.command` → 手動選 manifest / 原始素材資料夾 / 輸出資料夾（3 個原生對話框）→ AppleScript 呼叫 Photoshop 執行 `remove-background.jsx` → 跑完 manifest 內全部 items 即結束。
- 目前**不存在**：Watcher、Daemon、Node helper、Native Messaging Host、自動觸發、Ready Check、Heartbeat、自動 Progress、自動 Import、固定 Runtime Job Folder。

目標方向（Proposal 討論中，尚未 Freeze）——只涵蓋 Photoshop 端能力，不包含 Control Center orchestration（Manifest 建立、送出、自動 Import、自動開啟 Review Workspace 屬於 B. AI Workflow）：

- 定義 Photoshop Ready Contract：讓已由使用者開啟的 Photoshop 可準備接收工作（機制尚未 Freeze）。
- 接收由 AI Workflow 透過既有 `buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest` 建立並送出的 Manifest / Rerun Manifest（既有格式，不變）。
- Photoshop 端接收工作並批次處理，沿用 `remove-background.jsx` 既有去背核心邏輯（Quick Action / Select Subject fallback）。
- 輸出既有格式的 processed assets。
- 回報 Progress、Completion、Partial Failure / Failure Result（Run Report / Status Contract 機制尚未 Freeze）。

Photoshop Automation **不負責**：Control Center Processing Mode UI、Control Center 自動 Import Processed Result、自動開啟 Review Workspace、AI Workflow 的整體使用者流程——這些屬於 B. AI Workflow。

邊界（Future，Photoshop Automation）：

- 不修改 Review Workspace UI、Navigator、Dynamic Inspector、Decision Area、Completion Screen、Crop / Eraser、Canvas、Thumbnail、Batch、`layoutStates`、Approved Asset Resolver、Project State schema、Review Decision Model。
- 不修改本文件既有 Manifest schema、Photoshop Adapter Boundary、Processed Folder Matching 契約。
- Watcher、Heartbeat、固定 Runtime Job Folder、啟動腳本等仍是 Proposal 選項，尚未 Freeze，不得寫成已確定實作。
- 任何觸及「控制台不新增 native bridge、local helper 或 protocol handler」既有邊界的擴充方案，需在 Proposal 中明確提出並取得 Jamie 核准。

### B. AI Workflow（Draft / Paused pending Photoshop Automation）

依賴 A. Photoshop Automation 先完成。目前狀態為 Draft，暫停 Proposal Revision / Audit，待 Photoshop Automation 完成後才恢復。AI Workflow 是 Control Center 與既有模組之間的 Workflow Orchestration，不是 Photoshop 端能力本身。

目標方向：

- 使用既有 `buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest` 建立 Manifest，取代目前「手動匯出 Manifest」步驟；透過 Photoshop Automation 已確立的 Contract 送出工作，取代目前「手動執行 Photoshop Runner」步驟。
- 執行 Photoshop Ready Check 的 Control Center 端流程：未通過時顯示「請先開啟 Photoshop」與「重新檢查」；通過後進入 Processing Mode。
- 顯示 Processing Mode 並鎖定 Control Center 操作（不可修改文字、不可切換工單、不可下載、不可開始新的工作）；顯示一般使用者能理解的狀態，例如「素材處理中（18/63）」「素材處理完成」，不暴露 Photoshop / Manifest / Processed Folder 等技術詞彙（Ready Check 未通過提示除外）。
- 讀取 Photoshop Automation 回報的狀態，自動掃描處理結果，沿用既有 `importProcessedAssets()` 執行 Matching / Import，取代使用者手動操作「匯入處理結果」。
- 自動開啟既有 Review Workspace，取代使用者手動點擊「開啟素材審核」。
- Rerun 流程比照辦理：使用者點擊「重新去背素材（N）」後，AI Workflow 再次執行相同的 Processing Mode（不重新啟動 Photoshop）、自動偵測完成、自動 Import，並自動帶使用者回到「待重新去背」第二輪 Review Workspace。

AI Workflow **不負責**：實作 Photoshop 去背核心、修改 Manifest schema、修改 Photoshop Adapter Boundary（這些屬於 A. Photoshop Automation）。

邊界（Future，AI Workflow）：

- Photoshop Adapter 本身的職責與 Boundary（只讀 manifest、只輸出 processed assets）不變。
- AI Workflow 的 Control Center Orchestration 不得直接寫 Canvas、`layoutStates` 或 Project State schema，僅能呼叫既有 Asset Pipeline / Photoshop Adapter / Review Workspace 介面。
- Review Workspace UI（Navigator / Dynamic Inspector / Decision Area / Completion Screen）不因自動化而重新設計。
- 在 Photoshop Automation 完成前，AI Workflow 不進入 Proposal Freeze 或 Implementation Proposal。
- 在 AI Workflow Phase 完成 Coding、Browser Validation 與 Jamie Manual Validation 前，本節內容不得寫入 CHANGELOG 的 Completed 功能，也不得視為目前系統行為。
