# Photoshop Asset Pipeline

Version: 2026.07.07-doc-cleanup-1  
Last Updated: 2026-07-07  
Scope: Photoshop Asset Pipeline 的操作流程、內部資料契約、State Boundary 與 Troubleshooting。此文件只描述行為與規則，不改變 Pipeline、Canvas、Thumbnail、Batch 或 Project State 行為。

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

開啟 Review Workspace 檢查 processed assets。

可標記：

- `approved`
- `needs_rerun`
- `rejected`

Review Workspace 顯示：

- original image
- processed image
- `assetKey`
- `role`
- `jobIds`
- `slot`
- `mode`
- `status`

### 5. Approved Assets in Canvas / Thumbnail / Batch

Approved processed assets 會由 Approved Asset Resolver 提供給 render projection。

目前行為：

- Main Canvas 可使用 approved processed assets。
- Thumbnail 可使用 approved processed assets。
- Batch ZIP 可使用 approved processed assets。
- `needs_rerun` / `rejected` / `pending` 會 fallback original。

Main Canvas 若只是素材來源改變，會優先更新既有 Canvas DOM 的 `img.src`，不重建 Product DOM，也不重設 transform。

### 6. Save / Restore Project State

Project State v4 會保存 Asset Pipeline metadata 與 Review decision。

會保存：

- `assetPipelineState` metadata
- Review decision：`approved` / `needs_rerun` / `rejected`
- `processedAsset` metadata

不會保存：

- processed image `dataUrl`
- `FileSystemHandle`
- object URL
- `processedAssetIndex`
- runtime cache

匯入 v4 後，如果尚未重新 Import Processed Folder，approved processed asset 會 fallback original。

重新 Import Processed Folder 後，Main Canvas 會 refresh 並重新套用 approved processed assets。

## Designer Notes

- 如果 Review decision 已恢復，但畫面仍是原圖，通常是因為尚未重新 Import Processed Folder。
- Project State v4 會保存 decision，但不保存 processed 圖片本體。
- processed assets 必須使用 `{assetKey}__processed.png` 命名。
- Logo 目前可在 Pipeline 中被記錄，但去背重點是 product / person / singleProduct。
- `approved` 表示可以使用 processed asset。
- `needs_rerun` 表示 processed 結果需要重新處理。
- `rejected` 表示目前 processed 結果不可用，render 應使用 original。

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
- `rejected`：使用 original。
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

重新 Import Processed Folder 後，Main Canvas 會 refresh 並重新套用 approved processed assets。

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
- `rejected`

### Phase 2D

Approved Asset Resolver 讓 Main Canvas、Thumbnail 與 Batch 可使用 approved processed assets。

### PS-2A

Project State v4 保存 Asset Pipeline metadata 與 Review decision，但不保存 processed image dataUrl、FileSystemHandle、object URL、`processedAssetIndex` 或 runtime cache。
