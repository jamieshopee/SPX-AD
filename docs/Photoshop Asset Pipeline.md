# Photoshop Asset Pipeline

Version: 2026.07.12-ai-workflow-completed  
Last Updated: 2026-07-13  
Scope: Photoshop Asset Pipeline 的操作流程、內部資料契約、Runtime Contract、State Boundary 與 Troubleshooting。此文件描述目前實際行為：Photoshop Automation 與 AI Workflow 已完成 Coding 並通過 macOS Development Manual Validation（Photoshop 2025，Stage 1–4 共 18 項 PASS）。Windows Development Validation 與 Jamie Manual Validation 亦已在 Photoshop 2025 實機 PASS；此結論不代表支援所有 Photoshop 版本。Production Launcher／PyInstaller／Cloud Deployment 尚未開始（Not Started）。

## Quick Workflow

本節給 Designer / 日常使用者。目前實際流程已自動化；照順序操作即可，不需要理解 Manifest 或 Runtime 技術細節。

### 1. 開啟 Photoshop 並啟動 Control Center

先自行開啟 Photoshop（系統不會自動安裝、啟動或關閉 Photoshop）。開啟 SPX AD 生成器（Control Center）。

### 2. 匯入 CSV、選擇素材資料夾

匯入 CSV，選擇素材資料夾（只需要選一次；選擇時會一併取得後續寫入 `Processed/` 所需的 readwrite 權限）。

### 3. Photoshop Ready Check（自動）

系統自動檢查 Photoshop 是否已開啟。若未通過，顯示：

```text
Photoshop 已關閉。
請重新開啟 Photoshop。
開啟後按「重新檢查」即可繼續。
```

不需要重新選擇 CSV / 素材資料夾。

### 4. Processing Mode（自動，Control Center 鎖定）

Ready Check 通過後，系統自動建立 Manifest、送出工作、鎖定 Control Center：

```text
素材處理中（N / M）
請勿操作 Photoshop，
系統將自動完成背景處理。
完成後將自動帶入素材審閱。
```

處理期間不可修改文字、不可切換工單、不可下載、不可開始新的工作。

### 5. 自動 Import 並自動開啟素材審閱

完成後顯示「素材處理完成」（約 0.8 秒轉場，非完成判定依據），系統自動把 Processed 結果寫入真正的 `素材資料夾/Processed/`、自動 Import 對回 Asset Pipeline State，並自動開啟 Review Workspace（自動選取第一筆素材），使用者不需要手動點擊「開啟素材審核」。

### 6. Review Processed Assets

Review Workspace（素材審閱）內可標記：

- `approved`
- `needs_rerun`

使用者 UI 顯示（Review Workspace UI Upgrade，Completed，未因 AI Workflow 而重新設計）：

- original image / processed image（Editor 畫面）
- 檔名
- Review Status（待審閱 / 已處理 / 核准 / 重新去背 / 去背失敗）
- Dirty Status（尚未儲存的修改）
- Review Summary（進度、核准數、重新去背數、去背失敗數）
- Filter：全部素材 / 待重新去背 / 去背失敗

去背失敗（`background_removal_failed`，去背失敗獨立分類 Bug Fix）僅適用於 Photoshop 從未成功處理過的素材：顯示原圖，不提供核准／重新去背／撤回按鈕，改顯示提示文字「此素材去背失敗，請回控制台手動更換圖片。」，需回到 Control Center 手動更換圖片後重新走一次流程；不計入「重新去背素材（N）」，也不影響「全部素材已完成審閱」的完成判定（詳見下方第 7 節與 Error / Recovery）。已成功過但 Rerun 又失敗的素材維持 `needs_rerun`，沿用上一次成功的處理結果，不算去背失敗。

`assetKey`、`role`、`jobIds`、`slot`、`mode`、processed filename 等技術 Metadata 仍保留於內部資料結構（`assetPipelineState.assets[assetKey]`），供 Matching、Manifest、Resolver 等內部流程使用，但**不顯示**於使用者 UI（詳見 `docs/UI Design Guideline.md` 與 `docs/SPX-AD-版型規格與操作說明.md`）。

### 7. Rerun（自動，`重新去背素材（N）`）

`needs_rerun` 素材數量會顯示在「重新去背素材（N）」，`N=0` 時 disabled。點擊後：

1. 系統重新執行一次 Ready Check（不跳過）。
2. 重新進入相同的 Processing Mode（Photoshop 全程保持開啟，不重新啟動）。
3. 沿用同一個已保留的素材資料夾 Handle，不要求重新選擇。
4. 完成後自動回到素材審閱，Filter 自動切到「待重新去背」，只顯示本輪重新處理的素材子集，核准後自動顯示下一筆，不會誤跳回完成畫面。
5. `Processed/` 內同名 PNG 被正確覆蓋；本輪素材不會被 Auto Approve。

### 8. Approved Assets in Canvas / Thumbnail / Batch

Approved processed assets 會由 Approved Asset Resolver 提供給 render projection。

目前行為：

- Main Canvas 可使用 approved processed assets。
- Thumbnail 可使用 approved processed assets。
- Batch ZIP 可使用 approved processed assets。
- `needs_rerun` / `pending` 會 fallback original。

Main Canvas 若只是素材來源改變，會優先更新既有 Canvas DOM 的 `img.src`，不重建 Product DOM，也不重設 transform。

### 9. Save / Restore Project State

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

匯入 v4 後，如果 `processedAssetIndex` 尚未在目前 session 重新建立（例如尚未跑過一次 AI Workflow 或人工 Import Processed Folder），approved processed asset 會 fallback original。

### 人工備援流程（仍保留，未被移除）

Control Center 選單保留原本的人工流程作為獨立備援入口，可在不觸發 AI Workflow 自動化的情況下使用：

- 「匯出處理檔」：匯出 Manifest JSON 供人工執行既有 `tools/photoshop/run-photoshop-manifest.command`。
- 「匯入處理結果」：選擇 processed folder，手動掃描並對回 Asset Pipeline State。
- 「重新去背素材（N）」選單項目：匯出 rerun manifest 供人工執行。

人工流程與 AI Workflow 自動化流程共用同一份 Asset Pipeline State、Manifest Contract 與 Review Workspace，兩者並存，互不取代。

## Designer Notes

- 如果 Review decision 已恢復，但畫面仍是原圖，通常是因為 `processedAssetIndex` 尚未在目前 session 重新建立（例如剛匯入 Project State，尚未跑過一次處理或人工 Import Processed Folder）。
- Project State v4 會保存 decision，但不保存 processed 圖片本體。Legacy `rejected` 會在匯入時轉為 `needs_rerun`。
- Processed 輸出檔名固定為「原始 basename + `.png`」（見下方 Manifest Contract），不使用內嵌 assetKey 的檔名。
- Logo 目前可在 Pipeline 中被記錄，但去背重點是 product / person / singleProduct。
- `approved` 表示可以使用 processed asset。
- `needs_rerun` 表示 processed 結果需要重新處理，且不會被系統自動核准。

## Runtime Architecture（Photoshop Automation，Completed）

SPX AD Runtime 是本機、Python stdlib-only 的 HTTP 服務，負責與已開啟的 Photoshop 溝通。Control Center（AI Workflow）與 Runtime 之間、Runtime 與 Photoshop 之間的完整資料流：

```text
Control Center（AI Workflow，js/ai-workflow-*.js）
  ↓ HTTP（127.0.0.1:8901，本機 only）
SPX AD Runtime（tools/photoshop-automation/spx_ad_runtime.py）
  ↓
Platform Adapter Interface（platform_adapter.py，依作業系統選擇）
  ↓                                  ↓
macOS Adapter                    Windows Adapter
（macos_adapter.py，              （windows_adapter.py，
 AppleScript／osascript，          pywin32／win32com.client，
 已完成 macOS 實機驗證）            Windows 實機驗證 PASS）
  ↓                                  ↓
既有 remove-background.jsx（去背核心／Logo copy／Run Report 未修改，兩平台共用同一個腳本；
                            output.filename 缺漏時的 fallback 已改為 source basename + .png，
                            見下方 Naming Contract）
  ↓
processed PNG + photoshop-run-report.json（寫入 Runtime 隱藏 Workspace）
```

Runtime Workspace（暫存輸入／輸出）完全隱藏、自動建立與清理，不是使用者可見的 Run 資料夾；具備 Pending Execution Timeout（避免上傳中斷導致永久 busy）與啟動時的 stale Workspace 清理。

### Platform Adapter

- **macOS Adapter**：Ready Check 使用 bundle id `com.adobe.Photoshop` 的 `is running` 屬性判斷（`application id "com.adobe.Photoshop" is running`），只連接已開啟的 Photoshop，不自動啟動；不依賴容易因版本不同而變動的 process 名稱（Root Cause Fix，取代原本用 System Events process 名稱完全比對的做法）。Execute 呼叫既有、未修改的 `run-photoshop-manifest.applescript` → `remove-background.jsx`（去背核心不變）。
- **Windows Adapter**：使用 pywin32（`win32com.client`）。Ready Check 用 `GetActiveObject("Photoshop.Application")`（只連接已開啟的實例，不自動啟動）；Execute 由 Runtime 以 UTF-8 讀取共用 `remove-background.jsx`，以 `json.dumps()` 注入 `manifestPath`、`originalFolder`、`outputFolder`，再呼叫 `app.DoJavaScript(full_script)`。已在真實 Windows + Photoshop 2025 環境完成 Windows Validation 與 Jamie Manual Validation，成功產生 `photoshop-run-report.json` 與 Processed PNG。`DoJavaScriptFile()` 實機驗證失敗，不再採用。macOS 現有 AppleScript 流程不變，兩平台維持共用單一 `remove-background.jsx`。

### Ready / Execution / Status / Result Contract

| 端點 | 用途 |
|---|---|
| `GET /ready` | `{"ready": true}` 或 `{"ready": false, "reason": "photoshop_closed"}`。 |
| `POST /execute` | 僅 Manifest JSON（不含素材內容）→ `{"accepted": true, "executionId": "..."}` 或 `{"accepted": false, "reason": "busy" \| "manifest_invalid"}`。 |
| `POST /executions/{executionId}/assets/{assetId}` | 逐一上傳素材原始 binary（不使用 base64）；全部到齊後 Runtime 才觸發 Platform Adapter。 |
| `GET /status/{executionId}` | `{state, progress, lastResult}`；`lastResult.state` 為 `Completed` / `PartialFailure` / `Failure`，`Failure` 附帶 `reason`（例如 `photoshop_closed`）。`lastResult.itemResults` 為逐筆 assetId 的 `success` / `error`（去背失敗獨立分類 Bug Fix 新增），取自 `photoshop-run-report.json` 的 `items[]`；只在 `Completed` / `PartialFailure` 且該筆為 `success` 時才允許取回結果。 |
| `GET /executions/{executionId}/results/{assetId}` | 該筆 Processed PNG 的原始 `image/png` binary；尚未完成回 409，執行失敗回 404，已被清理回 410。 |

## Manifest Contract（Locked）

Manifest 由 Control Center 端 `buildPhotoshopJobManifest` / `buildPhotoshopRerunManifest` 建立（純記憶體運算，不再以下載 JSON 作為主要流程步驟；人工備援流程仍可下載）。

```json
{
  "itemCount": 1,
  "sourceFolderName": "素材資料夾",
  "items": [
    {
      "assetKey": "JOB001__product__slot0__A001_主品",
      "assetKeys": ["JOB001__product__slot0__A001_主品"],
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
        "folder": "Processed",
        "filename": "A001_主品.png"
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

規則（Locked）：

- 輸出檔名固定為「原始 basename + `.png`」（例如 `A001_主品.png` → `Processed/A001_主品.png`），**不使用** `{assetKey}__processed.png` 或任何 jobId／role／slot 後綴。
- 同一 `originalAsset.lookupKey` 被多個 assetKey 引用時，Manifest 只建立一個 item（去重，只送出一次、只處理一次），並以 `assetKeys[]` 陣列保留所有引用它的內部 assetKey；`assetKey` 本身作為既有 State Identity 完全不變，仍用於 Review Decision、Resolver、Canvas、Thumbnail、Batch、`layoutStates`、Project State。
- 同一 lookupKey 群組內若各筆的 `operations`（`removeBackground` / `trim` / `normalize`）不一致，Manifest 建立會回傳結構化的 `operations_conflict` 錯誤（不猜測、不預設 true/false、不輸出多份檔案），拒絕整個 Manifest。
- Manifest 不包含：`layoutState`、`layoutStates`、Canvas coordinates、transform、thumbnail、Project State full payload。

## Auto Import（Completed）

AI Workflow 的 Auto Import 依序：

```text
GET /executions/{executionId}/results/{assetId} 逐一取回 Processed PNG binary
  ↓
Browser 用既有、使用者第一次選擇時保留的 FileSystemDirectoryHandle
requestPermission({mode:'readwrite'}) → getDirectoryHandle('Processed',{create:true})
→ getFileHandle(output.filename,{create:true}) → createWritable() → write() → close()
（同名 PNG 安全覆蓋）
  ↓
依 Manifest item 的 assetKeys[]，對 assetPipelineState.assets[assetKey] 逐一回填
matched：status 依既有規則更新（needs_rerun 維持 needs_rerun，不 Auto Approve）
unmatched：記錄 unmatchedProcessedAssets
  ↓
把寫入後取得的 FileSystemFileHandle 交回 Control Center，填入既有的
processedAssetIndex runtime 快取（Review Workspace 讀取圖片內容用）
```

若 matched 數量正確，代表 processed assets 已對回目前 Asset Pipeline State，且 Review Workspace 能正確顯示圖片。

## Review Workspace Auto Open（Completed）

Auto Import 成功後，AI Workflow 顯示「素材處理完成」（約 0.8 秒轉場），自動呼叫既有 Review Workspace 開啟入口並自動選取第一筆素材；First Run 固定使用「全部素材」Filter，Rerun 固定使用「待重新去背」Filter 且只限本輪處理的素材子集。開啟失敗時顯示「無法開啟素材審閱」與「重新開啟素材審閱」，不假裝成功。

## Recovery Workflow（Error / Recovery Hardening，Completed）

| 情境 | 使用者可見文案 | Retry 行為 |
|---|---|---|
| Ready Check 失敗／Photoshop 處理中關閉 | Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。 | 重新檢查＝整批重新開始（含重新執行 Ready Check），不會重複觸發已完成的 Execution。 |
| Execute 被拒絕／Manifest 衝突／全部素材皆處理失敗（zero success） | 素材處理失敗。 | 重試＝整批重新開始。 |
| 素材上傳失敗 | 素材處理失敗。 | 重試＝沿用同一個 executionId，只補傳尚未成功的素材。 |
| Status Polling 暫時失敗／executionId 遺失 | 素材處理失敗。 | 前者可恢復輪詢；後者（Runtime 端執行已不存在）僅能整批重新開始。 |
| 寫入 Processed 失敗（含 readwrite 權限被拒絕） | 無法寫入處理結果。（權限被拒絕時顯示「重新授權」） | 沿用同一個 executionId，只重新取回／寫入尚未成功的項目；已被 Runtime 清理則誠實顯示需整批重新開始。 |
| Auto Import／Matching 失敗（Processed 已寫入） | 素材處理失敗。 | 只重新呼叫 Matching，不重新取回、不重跑 Photoshop。 |
| Review Workspace 開啟失敗 | 無法開啟素材審閱。 | 重新開啟素材審閱＝只重新呼叫既有開啟入口，不重跑 Photoshop、不重新 Auto Import。 |
| 部分素材去背失敗（PartialFailure，至少一張成功；去背失敗獨立分類 Bug Fix） | 不顯示整批 Recovery Banner，直接進入素材審閱；完成畫面顯示「X 個素材去背失敗，請回控制台手動更換圖片」。 | 不提供整批 Retry；使用者需回控制台手動更換圖片後自行重新走一次流程。 |

Global Interaction Lock 在所有復原情境期間持續維持，只開放對應的復原按鈕；復原成功並進入 Review 後才解除。Retry 一律不會重複觸發 Photoshop，也不會遺漏已成功寫入的部分。

## Internal Pipeline

本節給工程師 / AI 接手使用。此處保留 schema、matching、runtime 與 metadata 規則。

### Pipeline Flow（Completed，自動化為主，人工流程為備援）

```text
jobs + asset folder
  ↓
Asset Pipeline State
  ↓
Manifest（buildPhotoshopJobManifest / buildPhotoshopRerunManifest，純記憶體）
  ↓
SPX AD Runtime（Ready / Execute / Status / Result Contract）
  ↓
Platform Adapter（macOS / Windows）→ remove-background.jsx
  ↓
Auto Import（binary 取回 → 寫入 Processed/ → Matching → processedAssetIndex）
  ↓
Review Workspace（自動開啟）
  ↓
approved processed assets
  ↓
Approved Asset Resolver
  ↓
Main Canvas / Thumbnail / Batch projection
```

### Asset Pipeline State

Schema（不變）：

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

### assetKey Rules（不變，State Identity）

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

`assetKey` 是 Review Decision、Resolver、Canvas、Thumbnail、Batch、`layoutStates`、Project State 共用的 State Identity，Manifest dedup（`assetKeys[]`）不改變這個身份本身。

### Processed Folder Matching（Locked，basename + .png）

Processed filename 對應規則（取代原本內嵌 assetKey 的命名）：

```text
{原始 basename} + .png
```

例如：

```text
A001_主品.png（原始素材） → Processed/A001_主品.png（processed 結果）
```

Matching 依 Manifest item 的 `output.filename`（等於原始 basename + `.png`）與 `assetKeys[]`（可能對應多個內部 assetKey，因同一 lookupKey 去重），對 `assetPipelineState.assets[assetKey]` 逐一回填：

```json
{
  "status": "processed",
  "processedAsset": {
    "filename": "A001_主品.png",
    "lookupKey": "a001_主品.png",
    "sourceFolderName": "素材資料夾",
    "exists": true,
    "importedAt": "2026-07-05T00:00:00.000Z"
  }
}
```

上述是 **AI Workflow Auto Import** 的比對方式（`importProcessedAssetsByManifestItems()`），依 Manifest item 已知的 `assetKeys[]` 逐一回填。若某個 `assetKeys[]` 內的 assetKey 在目前 `assetPipelineState.assets` 中已不存在（例如工單已被移除），unmatched 會保留 Manifest 提供的**真實 assetKey**（下例的 `JOB001__product__slot1__商品B` 僅為示意值，不是固定字串）：

```json
{
  "unmatchedProcessedAssets": [
    {
      "filename": "商品B.png",
      "assetKey": "JOB001__product__slot1__商品B",
      "reason": "assetKey not found"
    }
  ]
}
```

若原本 `status` 是 `needs_rerun`，回填後仍維持 `needs_rerun`（不會被自動升級為 `approved`），符合「Rerun Auto Import 後不得 Auto Approve」的既有規則。

人工「匯入處理結果」使用另一個平行、獨立的函式 `importProcessedAssets()`，比對依據與回傳規則都與上面的 AI Workflow Auto Import **不同**，共用的只有 basename + `.png` 這套命名規則：

```text
processed 檔名 basename（例如 A001_主品）
  ↓
比對每筆 record 的 originalAsset.filename（找不到時 fallback originalFilename）basename
  ↓
一個 basename.png 回填所有 basename 相符的 assetKey
```

`importProcessedAssets()` 不會、也不能從 processed 檔名反解 assetKey（Naming Contract Consistency Fix，取代舊有 `extractAssetKeyFromProcessedFilename()`，該函式已移除）；找不到對應 original asset 時，unmatched 項目誠實記錄空字串 assetKey，不假造：

```json
{
  "unmatchedProcessedAssets": [
    {
      "filename": "unknown.png",
      "assetKey": "",
      "reason": "original asset basename not found"
    }
  ]
}
```

approved／needs_rerun 狀態優先規則、多 assetKey 回填規則，兩個函式完全一致。

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

`processedAssetIndex` 是控制台 runtime index，保存 processed 檔案的 `FileSystemFileHandle`，用於 Review Workspace 顯示 processed image 與 Resolver 讀取 processed runtime source。可由兩種路徑填入：

- 人工「匯入處理結果」：掃描使用者選擇的 processed folder，逐一填入。
- AI Workflow Auto Import：寫入 `Processed/` 後，把取得的 `FileSystemFileHandle` 交回 Control Center 填入（見上方 Auto Import 章節）。

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
- Photoshop execution detail（含 executionId、Runtime Workspace 路徑）

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

Photoshop Adapter（macOS／Windows）只需讀取 Runtime 傳入的 Manifest 路徑與原始／輸出資料夾路徑，處理 `items[]`，並依 `output.filename` 產生 processed assets。

Photoshop Adapter 不應讀取 Project State，也不應知道 Canvas / Template / layoutStates / Control Center 自動化細節。

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

### Photoshop Automation / AI Workflow Boundary（Locked）

- 未修改 Review Workspace UI、Navigator、Dynamic Inspector、Decision Area、Completion Screen、Crop / Eraser、Canvas、Thumbnail、Batch、`layoutStates`、Approved Asset Resolver、Project State schema、Review Decision Model。僅有的例外是一個既有 UX Bug 修正：完成畫面判斷改為依目前 Filter 是否還有素材，而不是全域審閱進度（見 CHANGELOG），未改變上述架構本身。
- Photoshop Adapter 的職責與 Boundary（只讀 manifest、只輸出 processed assets）不變。
- AI Workflow 的 Control Center Orchestration 不直接寫 Canvas、`layoutStates` 或 Project State schema，僅呼叫既有 Asset Pipeline / Photoshop Adapter / Review Workspace 介面。

## FAQ / Troubleshooting

### Q: Import Processed Folder / Auto Import matched 0，怎麼辦？

檢查 processed filename 是否符合「原始 basename + `.png`」；如果檔名被改動或遺失副檔名，控制台無法對回 `assetPipelineState.assets[assetKey]`。

### Q: Review decision 已恢復，但 Canvas 還是原圖？

這是正常 fallback。Project State v4 只保存 metadata 與 decision，不保存 processed 圖片本體或 FileSystemHandle。重新跑一次處理（或人工 Import Processed Folder）後，`processedAssetIndex` 會重新建立，approved processed assets 才會恢復使用 processed image。

### Q: approved 後仍然 fallback original？

常見原因：

- `processedAsset` metadata 不存在。
- `processedAssetIndex` runtime handle 不存在（尚未在目前 session 重新建立）。
- processed filename 無法對回 assetKey。

### Q: Review Workspace 沒有 processed image（破圖）？

檢查：

- Processed 資料夾內對應檔案是否存在、內容是否正常（可用 Finder 直接開啟確認）。
- `processedAssetIndex` 是否已在目前 session 被正確填入（AI Workflow 的 Auto Import 成功後應自動填入；若是透過「整批重新開始」類 Retry 復原，需確認該次復原也有正確轉交 Handle）。
- 若檔案本身正常但 Review Workspace 仍破圖，屬於 `processedAssetIndex` 未被填入的已知 Root Cause 類型（見 CHANGELOG 已修正紀錄），不是「圖片不存在」。

### Q: Batch / Thumbnail 何時會使用 processed asset？

Batch / Thumbnail 在 render projection 時會透過 Approved Asset Resolver 判斷是否使用 processed asset。它們不可寫入 `layoutStates`，也不可成為 state owner。

### Q: Photoshop Pipeline 是否會修改 Canvas？

不會。Photoshop Pipeline 只處理素材並輸出 processed assets，不讀寫 Canvas、不寫 `layoutStates`、不修改 Render Engine。

### Q: Ready Check 明明 Photoshop 已開啟卻顯示未通過？

macOS：確認 Photoshop 版本；Ready Check 依 bundle id `com.adobe.Photoshop` 判斷，理論上跨版本穩定。若持續異常，檢查 Runtime Terminal 的診斷輸出（returncode／stderr／例外類型）。Windows：目前尚未完成實機驗證，若遇到問題請先確認是否為已知 Deferred 範圍。

## Phase History

### Phase 2A

Phase 2A 只建立素材處理流程的資料邊界：

```text
jobs + asset folder
  ↓
Asset Pipeline State
  ↓
Manifest（當時：photoshop-job-manifest.json）
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

Photoshop Adapter 讀取 Manifest，開啟素材並依 `output.filename` 輸出 processed assets。

### Phase 2C

Review Workspace 用於人工檢查 processed assets，並標記：

- `approved`
- `needs_rerun`

### Phase 2D

Approved Asset Resolver 讓 Main Canvas、Thumbnail 與 Batch 可使用 approved processed assets。

### Photoshop Rerun Automation

Needs Rerun Collection 由 `status === needs_rerun` 派生，不建立 queue array。人工「重新去背素材（N）」選單項目匯出 rerun manifest，Import Processed Folder 後回到 Review Workspace；此人工流程與後續 AI Workflow 的自動化 Rerun 並存，未被取代。

### PS-2A

Project State v4 保存 Asset Pipeline metadata 與 Review decision，但不保存 processed image dataUrl、FileSystemHandle、object URL、`processedAssetIndex` 或 runtime cache。

### Review Workspace UI Upgrade（v0.4.5）

Review Workspace UI Upgrade 只調整 Review Workspace 的 UI（Navigator / Dynamic Inspector / Decision Area / Completion Screen），不修改本文件描述的 Pipeline Flow、Asset Pipeline State schema、Manifest schema、Processed Folder Matching、Review Decision 資料格式或 Approved Asset Resolver。

### Photoshop Automation（Completed）

完成 SPX AD Runtime（Ready / Execution / Status / Result Contract）、Platform Adapter Architecture、macOS Adapter（bundle id Ready Check）與 Windows Adapter（pywin32）。macOS 已完成實機驗證（Photoshop 2025）；Windows Validation 與 Jamie Manual Validation 亦已在 Photoshop 2025 實機 PASS。

### AI Workflow（Completed）

完成 Ready Check、Manifest Send + Processing Mode、Status Polling + Auto Import、Auto Open Review Workspace、Rerun Workflow、Error / Recovery Hardening，並通過 macOS Development Manual Validation（Stage 1–4 共 18 項 PASS）。詳見上方各章節與 `docs/CHANGELOG.md`。
