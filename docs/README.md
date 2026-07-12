# SPX AD 電子版位管理器

Version: 2026.07.01-s  
Last Updated: 2026-07-01  
Scope: 專案總覽、啟動方式、目前架構、主要流程與維護入口。

## What's New

- Template + Style 架構已完成：`template.json` 負責排版結構，`styles/{styleId}.json` 負責視覺樣式。
- Project State 已重整：CSV 匯入 = 建立全新工作區；匯入暫存 JSON = 恢復既有工作區。
- Style 下拉改為獨立控制背景、資訊圖與文字顏色。
- Source assets 改為 `backgrounds/` 與 `info/`。
- Thumbnail Queue、匯入暫存、下載暫存、批次產圖與重設工作區皆以目前 Project State 為準。

## Table of Contents

1. [專案介紹](#專案介紹)
2. [最新架構圖](#最新架構圖)
3. [如何啟動](#如何啟動)
4. [資料夾結構](#資料夾結構)
5. [四個尺寸](#四個尺寸)
6. [Template 與 Style](#template-與-style)
7. [素材架構](#素材架構)
8. [主要模組](#主要模組)
9. [Canvas Render Flow](#canvas-render-flow)
10. [Project State](#project-state)
11. [Thumbnail Queue](#thumbnail-queue)
12. [主要功能](#主要功能)
13. [新增 Style](#新增-style)

## 專案介紹

SPX AD 電子版位管理器用於批次製作四種電子版位 Banner。控制台負責匯入 CSV、管理工單、套用素材、切換 Style、下載 PNG、匯入/匯出暫存與重設工作區。Canvas Render Engine 負責真正渲染 Banner；Editor 用於單張版型操作與驗證。

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
templates + assets + js + css + forms
```

更細的 render 關係：

```text
CSV / 暫存 JSON / 素材資料夾
        ↓
Project State
        ↓
template.json + styles/{styleId}.json
        ↓
canvas.html + js/template-loader.js
        ↓
js/canvas-entry.js
        ↓
js/layout-runtime.js + js/box-transform-utils.js
        ↓
Preview / Thumbnail / PNG Export
```

## 如何啟動

- 控制台：雙擊 `launch/啟動 AD 管理器（Chrome）.command`
- 編輯器：雙擊對應尺寸的 `launch/啟動編輯器_*.command`

啟動檔會開啟本機 HTTP server，避免直接用 file 開啟時遇到瀏覽器資源限制。

若要使用 AI Workflow 自動去背功能（Completed，macOS Development Validated；Windows Validation Deferred），需先自行開啟 Photoshop，並雙擊 `tools/photoshop-automation/start-spx-ad-runtime.command` 啟動本機 SPX AD Runtime（Development Tool，僅供開發／驗證使用），才能讓控制台的 Ready Check 通過。詳見 `docs/AI-HANDOFF.md`、`docs/Architecture.md` 與 `tools/photoshop-automation/README.md`。Production Launcher（一般使用者不需操作 Runtime）尚未開始（Not Started）。

## 資料夾結構

```text
index.html
canvas.html
editor/

src/
  app.js
  app.css

js/
  template-loader.js
  canvas-entry.js
  layout-runtime.js
  product-slot-utils.js
  box-transform-utils.js
  bn-image-utils.js

config/
  templates.js
  templates.json

templates/
  984x309/
    template.json
    styles/
      01.json
      ...
      16.json
  1080x1920/
    template.json
    styles/
  1599x1080/
    template.json
    styles/
  3189x3992/
    template.json
    styles/

assets/source/{size}/
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

css/
forms/
scripts/
tests/
docs/
```

## 四個尺寸

- `984x309`
- `1080x1920`
- `1599x1080`
- `3189x3992`

每個尺寸都使用相同架構：一個 `template.json` 加上 `styles/01.json` 到 `styles/16.json`。

## Template 與 Style

Template = 排版結構。

`templates/{size}/template.json` 保存：

- Canvas 尺寸
- 文字、Logo、商品、Person、SingleProduct 區域
- 圖層順序
- `sizeRatios`
- `layoutMode`
- `autoShadow`
- baseline / transform 初始排版相關設定

Style = 視覺樣式。

`templates/{size}/styles/{styleId}.json` 保存：

- 背景圖
- 資訊圖
- 主標顏色
- 副標顏色
- 小字顏色

Style 不保存座標、尺寸、商品區域、Logo 區域或使用者 transform。

## 素材架構

```text
assets/source/{size}/backgrounds/bg_01.png
assets/source/{size}/backgrounds/bg_02.png
...
assets/source/{size}/info/info_01.png
assets/source/{size}/info/info_02.png
...
```

Style JSON 只引用這些路徑。新增視覺樣式時，不需要修改 Template。

## 主要模組

- `src/app.js`：控制台、工單、素材、Style、縮圖、下載、暫存與重設工作區。
- `js/template-loader.js`：載入並合併 `template.json` 與 Style JSON。
- `js/canvas-entry.js`：Canvas 入口，建立 DOM、套用背景/資訊圖/文字色、接收 postMessage。
- `js/layout-runtime.js`：依 Template 排版、套用 position、layoutState 與 capture。
- `js/product-slot-utils.js`：商品角色命名判斷。
- `js/box-transform-utils.js`：Product 與 SingleProduct 共用拖曳、縮放、旋轉與 reset transform。
- `js/bn-image-utils.js`：影子、baselineRatio 等影像共用處理。

## Canvas Render Flow

```text
Project State job
        ↓
template.json
        +
styles/{styleId}.json
        ↓
ADTemplateLoader
        ↓
canvas-entry
        ↓
layout-runtime
        ↓
box-transform-utils
        ↓
Preview / Capture / Download
```

Canvas Render Engine 只處理「指定 job 的目前狀態」。控制台切換 Style 時，只更新背景、資訊圖與文字顏色，不清除文字、Logo、商品或 transform。

## Project State

Project State 是目前工作區的唯一暫存格式。

保存內容包含：

- CSV 工單資料
- 文字
- size / template / style
- Logo / Product / Person 素材 dataUrl
- 三商品與 SingleProduct transform
- layoutState
- thumbnail / quickThumbnail

重要規則：

- 匯入 CSV = 建立全新工作區，不套用上一次狀態。
- 匯入暫存 JSON = 恢復工作區，包含素材、縮圖與 transform。

## Thumbnail Queue

CSV 匯入後先立即產生 quickThumbnail，讓左側列表不空白。正式 thumbnail 由背景 queue 使用 hidden iframe 逐張產生，完成後寫回 `job.thumbnail`。

Thumbnail 生成必須使用指定 job 的 `template.json` 與 `styleId`，不能依賴目前使用者正在看的 currentJob。

## 主要功能

- 匯入 CSV：建立全新 jobs 與乾淨工作區。
- 匯入暫存：接受 `single-state.json` 或 `project-state.json`，完整恢復工作區。
- 選擇素材資料夾：依目前 jobs 自動帶入 Logo、三商品或 1人＋1品。
- Style 下拉：切換目前工單視覺樣式。
- 下載單張圖檔：下載目前工單 PNG。
- 下載單張暫存：輸出單張完整 JSON。
- 批次產圖：輸出 PNG ZIP，內含 `project-state.json`。
- 重設工作區：清除目前工作資料，回到第一次開啟控制台的狀態。

## 新增 Style

新增第 17 個 Style 時，依尺寸補齊：

```text
assets/source/{size}/backgrounds/bg_17.png
assets/source/{size}/info/info_17.png
templates/{size}/styles/17.json
```

`styles/17.json` 範例：

```json
{
  "id": "17",
  "name": "樣式 17",
  "background": "assets/source/1599x1080/backgrounds/bg_17.png",
  "infoGraphic": "assets/source/1599x1080/info/info_17.png",
  "headlineColor": "#ffffff",
  "subHeadlineColor": "#ffffff",
  "smallTextColor": "#ffffff"
}
```

只新增 Style 不需要修改 JS。若控制台清單仍未顯示新 Style，需同步更新 config 或產生流程，讓 Style 清單知道目前有第 17 個樣式。

可選維護工具：`scripts/generate-style-json.js` 可依 `config/templates.json` 的 `styleCount` 產生 / 補齊 Style JSON，也可用 `--count 17` 暫時指定產生數量。這是 Developer Tool，不是 Runtime 依賴。
