# Photoshop Asset Pipeline

Version: 2026.07.05-2A  
Last Updated: 2026-07-05  
Scope: Phase 2A MVP：Asset Pipeline State、Photoshop job manifest export、Processed Folder Import。此階段不自動呼叫 Photoshop、不接 Canvas、不修改 Render / Thumbnail / Batch flow。

## Phase 2A 目標

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

本階段不做：

- Photoshop ExtendScript
- AppleScript / local command
- Review Workspace
- Crop Tool
- Approved Asset Resolver 接 Canvas
- Project State 大改版
- Render / Thumbnail / Batch 修改
- Approve / Review Workspace

## State Boundary

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

不得保存：

- `layoutState`
- `layoutStates`
- Canvas coordinates
- transform
- thumbnail
- template DOM state
- Photoshop execution detail

## Asset Pipeline State

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

## assetKey 規則

Phase 2A assetKey 格式：

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

## Photoshop Job Manifest

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

## Phase 2B 接續點

Photoshop Adapter 未來只需讀取 `photoshop-job-manifest.json`，處理 `items[]`，並依 `output.filename` 產生 processed assets。

Photoshop Adapter 不應讀取 Project State，也不應知道 Canvas / Template / layoutStates。

## Phase 2A-3 Processed Folder Import

Processed Folder Import 只把 Photoshop 輸出的 processed assets 對回 Asset Pipeline State。

流程：

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

Phase 2A-3 不做：

- 不 approve
- 不接 Canvas
- 不接 Asset Payload
- 不修改 `layoutState` / `layoutStates`
- 不修改 thumbnail / batch / render flow

## Phase 2C Review Workspace MVP

Review Workspace 用於人工檢查 processed assets，並把每個 asset 標記為：

- `approved`
- `needs_rerun`
- `rejected`

Phase 2C MVP 仍維持 State Boundary：

- 不接 Canvas
- 不接 Asset Payload
- 不做 Crop
- 不做 Approved Asset Resolver
- 不修改 `layoutState` / `layoutStates`
- 不修改 thumbnail / batch / render flow
- 不接 Project State export/import

入口：

```text
匯入 Processed Folder
  ↓
檢視 Processed Assets
  ↓
Review Workspace modal
```

Review Workspace 顯示：

- original image
- processed image
- `assetKey`
- `role`
- `jobIds`
- `slot`
- `mode`
- `status`

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

`processedAssetIndex` 是控制台 runtime index，只保存 processed folder 的 `FileSystemFileHandle`，用於 Review Workspace 顯示 processed image。

`processedAssetIndex` 不寫入 Project State，避免把本機 runtime handle 混入可攜式工作區狀態。
