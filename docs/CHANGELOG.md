# CHANGELOG

Version: v0.3.5  
Last Updated: 2026-07-07  
Scope: 專案版本紀錄與重要設計決策。此文件不是 Git commit log，而是維護者交接用版本紀錄。

## What's New

- Project State 正式完成：Project State v4 已達成可恢復工作區核心目標。
- 新增 v0.3.4 Phase 2D-2C：Batch Approved Assets。
- 新增 Phase 2D-2B-2：Thumbnail Render Context 紀錄。
- 新增 AI-HANDOFF.md 與 AI 文件架構導覽。
- 新增 v0.3.1 Batch Restore by filename 穩定版紀錄。
- 新增 2026.07.04-u 版本紀錄。
- 記錄 Phase 1 Asset shared modules。
- 記錄 `layoutStates` per placement/template restore。
- 記錄三商品 / 1人＋1品 restore 與 batch render 修正。
- 記錄 Phase 1.5 State Boundary Review。

## Table of Contents

1. [v0.3.5](#v035---2026-07-07)
2. [v0.3.4](#v034---2026-07-06)
3. [v0.3.1](#v031---2026-07-05)
4. [Documentation](#documentation)
5. [Phase 2D-2B-2](#phase-2d-2b-2---thumbnail-render-context)
6. [2026.07.04-u](#20260704-u)
7. [2026.07.02-t](#20260702-t)
8. [2026.07.01-s](#20260701-s)
9. [2026.06.30-r](#20260630-r)
10. [Design Decisions](#design-decisions)
11. [建議後續可優化項目](#建議後續可優化項目)

## v0.3.5 - 2026-07-07

### Project State Completion

- Project State v4 已完成。
- `project-state.json` / `single-state.json` 會保存 `assetPipelineState` metadata。
- Review decision 可恢復：`approved` / `needs_rerun` / `rejected`。
- 保存 `processedAsset` metadata，但不保存 processed image `dataUrl`。
- Project State 已達成「可恢復工作區」核心目標。

### State Boundary

- 不保存 `FileSystemHandle` / object URL / `processedAssetIndex` / runtime cache。
- 匯入 Project State 後，若尚未重新 Import Processed Folder，approved processed asset 會 fallback original。
- 重新 Import Processed Folder 後，Main Canvas 可恢復 approved processed assets。
- Thumbnail refresh UX 屬於未來優化，不屬於 Project State 缺口。

### Compatibility

- v2 / v3 Project State 保持相容。
- 未修改 `layoutStates` schema。
- 未修改 Main Canvas / Thumbnail / Batch 架構。
- 未修改 Photoshop Pipeline。

## v0.3.4 - 2026-07-06

### Phase 2D-2C - Batch Approved Assets

- Batch ZIP export now uses approved processed assets.
- Main Canvas / Thumbnail / Batch now share the same `BNAssetResolver` and Render Context.
- Batch remains a projection and is not a state owner.
- No changes to `layoutStates` schema.
- No changes to Project State schema.
- No changes to Photoshop Pipeline.
- No changes to Main Canvas / Thumbnail stable behavior.

## v0.3.1 - 2026-07-05

### Fixed

- 修正三商品 Batch ZIP 匯出後產品壓縮變形與跑位。
- 修正 Batch 匯出後 project-state.json / single-state.json 還原商品位置錯誤。
- 修正 Batch Render 在 iframe 重建後商品身份對應錯誤。
- 統一四個 Editor Launcher 的 Server 啟動流程。
- 全部改為使用 127.0.0.1:8080。
- Launcher 可自動重用既有的專案 Server，不會因不同尺寸互相干擾。
- 新增 Template HTTP 檢查，避免 Server 啟動失敗卻仍開啟瀏覽器。
- 改善本機 Server 啟動穩定性與錯誤提示。

### Architecture

- 三商品 layout restore 身份識別改為：
  id → filename → position
- filename 成為 Batch Restore 的主要商品身份識別。
- position 僅作最後 fallback，不再作為主要識別依據。

### Stability

已驗證：

- Batch PNG 與主 Canvas 完全一致。
- 三商品大小、位置、前後順序可正確還原。
- project-state / single-state 匯入可完整恢復調整。
- 不影響：
  - 1人＋1品
  - Thumbnail
  - Review Workspace
  - Photoshop Pipeline

## Documentation

- 新增 AI-HANDOFF.md。
- 新增 AI 文件架構。
- README / Architecture 更新文件導覽。


## Phase 2D-2B-2 - Thumbnail Render Context

### Changed

- Thumbnail 使用 Render Context，不再依賴 active job。
- Placement / Template 切換後，Main Canvas 與 Thumbnail 維持一致。
- Thumbnail queue item 保存 enqueue 當下的 render context。
- 不修改 job placement / template。
- 不修改 layoutStates schema。

### Stability

- 不影響 Batch。
- 不影響 Project State。
- 不影響 Photoshop Pipeline。

## 2026.07.04-u

Date: 2026-07-04

### Added

- 新增 Asset shared modules：
  - `js/asset-classifier.js`
  - `js/asset-processing.js`
  - `js/asset-render-payload.js`
- 新增共用 Asset Payload 產生流程，主 Canvas、Thumbnail hidden iframe 與 Batch Render 共用同一套素材 payload 組裝邏輯。
- 新增 `layoutStates` per `placementId|templateId` 保存策略，讓不同尺寸 / template 的 transform state 獨立保存。
- 新增 Phase 1.5 State Boundary Review，明確定義 Main Canvas、Thumbnail、Batch Render、Project State、Asset Payload 與未來 Photoshop Pipeline 的讀寫邊界。

### Changed

- 三商品分類改由 `asset-classifier.js` 統一處理，並繼續使用 `product-slot-utils.js` 判斷商品 position。
- Logo 排序、三商品分類、1人＋1品分類、trim 與 Canvas payload 產生從 `src/app.js` 抽到 shared modules。
- 主 Canvas 與 thumbnail hidden iframe 的素材套圖流程改為共用 `asset-render-payload.js`。
- `layoutStates` restore 規則改為只讀目前 `placementId|templateId` key；若目前尺寸沒有 layout state，使用該 template 預設 layout。
- 1人＋1品跨尺寸不做 transform 同步；每個尺寸使用自己的 layoutState 或 template 預設。

### Fixed

- 修正三商品調整後切換 job / 尺寸可能遺失大小、位置、旋轉或順序的問題。
- 修正 `single-state.json` / `project-state.json` 未保存或未恢復調整後 `layoutStates.products` 的問題。
- 修正 1人＋1品 SingleProduct handle、拖曳、縮放、旋轉與 template zone 邊界不一致的問題。
- 修正切換尺寸時 Person 消失或 1人＋1品 restore 順序錯誤的問題。
- 修正 batch render 使用錯誤 job 狀態、掉圖或有調整商品變形的問題。
- 修正主 Canvas 載入 callback race，避免舊 iframe callback 晚到後污染目前尺寸 / template 的素材或 layoutState。

### Design Decisions

- Main Canvas active edit flow 與 Project State Import 是唯二可以寫入 `job.layoutStates` 的邊界。
- Thumbnail hidden iframe 與 Batch Render 只能讀 `layoutStates`，不得回寫 transform state。
- Asset Payload 只負責素材初始套入 Canvas，不負責使用者 transform restore。
- Photoshop Pipeline 未來只接 Asset Pipeline，輸出 processed / approved assets，不直接耦合 Render Engine 或 `layoutStates`。
- 有 `layoutStates` map 時，不得 fallback 到其他尺寸 key。
- 三商品未來可另行設計 Linked Product Transform，但 Phase 1 不做跨尺寸同步。
- 1人＋1品因人物與商品區域強依賴 template 構圖，不做跨尺寸同步。

## 2026.07.02-t

Date: 2026-07-02

### Added

- 新增 `favicon.svg`，並讓控制台、Canvas 與 Editor 入口共用同一個 favicon。

### Changed

- `src/app.js` 的 Template / Style 合併流程只委派 `ADTemplateLoader.applyStyle()`，避免控制台保留第二套 fallback merge 邏輯。
- SingleProduct transform 移除自寫 fallback，統一使用 `box-transform-utils.js`。
- 三商品空 overlay 改為不攔截 pointer events，避免影響 SingleProduct 操作。

### Fixed

- 修正 Person 在部分尺寸可被手動拖曳的問題；Person 僅由 Template `person.fitWidth` 與 person 區域控制。
- 修正 SingleProduct 在 Chrome 實機測試中可見把手但互動容易被 overlay 或邊界限制影響的問題。
- 修正 SingleProduct 拖曳、縮放、旋轉後 DOM style 與共用 transform state 不一致的風險。
- 修正 `/favicon.ico` 404 造成的 console 雜訊。

### Design Decisions

- Person 不支援手動 transform，避免 1人＋1品人物位置與 Template 規格分裂。
- Product 與 SingleProduct 的可操作 transform 必須共用 `box-transform-utils.js`，不保留第二套拖曳實作。
- Template / Style 合併規則只由 `template-loader.js` 維護，控制台與 Canvas 不各自複製合併邏輯。
- favicon 屬瀏覽器入口資源，採共用 root SVG，避免每個入口各自維護圖示。

## 2026.07.01-s

Date: 2026-07-01

### Added

- 新增 `templates/{size}/template.json` 作為排版結構唯一來源。
- 新增 `templates/{size}/styles/01.json`～`16.json` 作為視覺樣式來源。
- 新增 `assets/source/{size}/backgrounds/` 保存背景圖。
- 新增 `assets/source/{size}/info/` 保存資訊圖。
- 新增 Style 下拉，控制目前工單視覺樣式。
- 新增 `scripts/generate-style-json.js` 作為 Style JSON 維護工具。
- 新增 Project State JSON 暫存格式，支援單張與整批工作區。
- 新增匯入暫存 JSON，支援 `single-state.json` 與 `project-state.json`。
- 新增重設工作區，清除目前工作資料並回到初始狀態。

### Changed

- Template Loader 改為載入 `template.json + styles/{styleId}.json`。
- Render Flow 改為由 Project State 指定 size、template 與 style。
- CSV 匯入改為建立全新工作區，不再套用舊狀態。
- 暫存匯入改為恢復工作區，包含素材、thumbnail、layoutState 與 transform。
- Thumbnail hidden iframe 需使用指定 job 的 `template.json` 與 Style JSON。
- 批次產圖 ZIP 內保留 `project-state.json`，用於後續恢復整批工單。
- 文件統一使用 Template = 排版結構、Style = 視覺樣式。

### Fixed

- 修正重新匯入同一 CSV 可能帶到上一次修改狀態的問題。
- 修正 Style 與 Template 概念混在一起造成交接困難的問題。
- 移除使用者需要理解內部樣式編號含義的描述。

### Design Decisions

- Template 只保存位置、尺寸、圖層與素材區域，避免視覺樣式影響排版。
- Style 只保存背景、資訊圖與文字顏色，讓新增樣式時不需要修改 JS。
- CSV 被定義為新工作區，避免瀏覽器暫存或舊 Project State 誤套到新工單。
- 暫存 JSON 被定義為恢復工作區，並將素材 dataUrl 存在 JSON，讓使用者只需管理單一檔案。
- Template Loader 統一負責合併 Template 與 Style，Canvas runtime 不各自猜測路徑。
- Style JSON 產生工具屬於 Developer Tool，不可成為 Runtime 依賴。

## 2026.06.30-r

Date: 2026-06-30

### Added

- 新增商品角色共用模組 `product-slot-utils.js`。
- 新增 Transform 共用模組 `box-transform-utils.js`。
- 新增 SingleProduct transform 支援。
- 新增右側素材 Accordion。
- 新增恢復預設位置。
- 新增左側 thumbnail queue 與 quickThumbnail。

### Changed

- 控制台與 Editor 共用商品角色判斷、position 與 transform 能力。
- 1人＋1品 SingleProduct 與三商品 Product 共用 transform controller。
- 右上狀態 Badge 統一視覺規格。
- 右下下載區文案整理為下載單張圖檔、下載單張暫存、批次產圖、重設工作區。

### Fixed

- 修正三商品 slot 判斷與 Editor 不一致的問題。
- 修正 1人＋1品 `_人` / `_品` 判斷與 Editor 不一致的問題。
- 修正 hidden iframe thumbnail capture lifecycle。
- 修正 singleProduct transform pointer target 與 iframe document 監聽問題。

### Design Decisions

- 商品角色抽成 `product-slot-utils.js`，避免控制台與編輯器判斷分裂。
- Transform 抽成 `box-transform-utils.js`，讓三商品與 SingleProduct 共用拖曳、縮放、旋轉與 reset。
- 右側素材區改 Accordion，降低資訊密度並保持互鎖邏輯。
- 新增恢復預設位置，讓使用者可回到 Template 初始 layout。
- 新增重設工作區，提供明確清空流程。

## Design Decisions

本專案的長期方向是共用能力集中維護。凡是控制台與編輯器都會使用的判斷、排序、transform、暫存或渲染流程，都應抽成 shared module。

重要決策：

- 商品角色判斷只維護在 `product-slot-utils.js`。
- Transform 只維護在 `box-transform-utils.js`。
- Template 與 Style 分離，降低新增樣式成本。
- Project State Serializer 統一單張暫存、整批暫存與匯入暫存。
- 暫存採 JSON dataUrl，降低使用者管理 ZIP / folder 的理解成本。
- 移除尺寸 Badge，避免與版位名稱重複且降低狀態同步成本。
- Main Canvas 是互動 transform 的唯一寫入來源；Thumbnail、Batch Render 與 Asset Payload 只能讀 layout state。
- `layoutStates` 以 `placementId|templateId` 作為 per size/template transform source。

## 建議後續可優化項目

- 將 Project State Serializer 從 `src/app.js` 獨立成 shared module。
- 將 Thumbnail Queue 從 `src/app.js` 獨立成 shared module。
- 將 Accordion 狀態管理從 inline plugin 邏輯整理為可測試模組。
- 將舊 Editor project JSON 相容層更新為 `template/style` 命名。
- 將 `config/templates.json`、`templates/index.json`、`templates/sizes.json` 整理成單一 source of truth。
- 設計 Photoshop Pipeline adapter、job manifest 與 Review Workspace，但需維持 Asset Pipeline 與 Render Engine 解耦。
