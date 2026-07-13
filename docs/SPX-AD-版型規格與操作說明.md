# SPX AD 版型規格與操作說明

Version: 2026.07.12-ai-workflow  
Last Updated: 2026-07-13  
Scope: Banner 版型結構、Style 視覺樣式、素材命名、Template 參數規格與操作流程。

## What's New

- **去背失敗獨立分類（Bug Fix）**：素材審閱新增「去背失敗」Filter 與 Navigator 標籤，去背失敗素材改顯示提示文字並需回控制台手動更換圖片；Completion Screen 新增計數但不影響完成判定。詳見下方「素材審核 / 素材審閱」與「AI Workflow 使用者流程」，以及 CHANGELOG。
- AI Workflow 使用者流程完成（macOS Development Validated；Windows Validation Deferred）：素材審核／素材審閱流程新增自動化 Ready Check、Processing Mode、自動 Import、自動開啟審閱與 Rerun，詳見下方「素材審核 / 素材審閱」與「AI Workflow 使用者流程」。
- 四個尺寸皆採用 `template.json` + `styles/01.json`～`styles/16.json`。
- Template 只保存排版結構。
- Style 只保存背景、資訊圖與文字顏色。
- Source assets 統一放在 `backgrounds/` 與 `info/`。
- 商品角色命名支援 `_主品/_左配品/_右配品`，並相容 `_01/_02/_03`。
- 控制台名稱更新為 `SPX BN生成器`，Header 固定一般使用者入口。
- Review Workspace UI Upgrade 完成：更新素材審閱操作流程（Navigator、Dynamic Inspector、Decision Area、Completion Screen、Completion Recovery）。

## Table of Contents

1. [四個尺寸](#四個尺寸)
2. [Template](#template)
3. [Style](#style)
4. [Style JSON 格式](#style-json-格式)
5. [素材路徑](#素材路徑)
6. [Logo](#logo)
7. [文字](#文字)
8. [三商品](#三商品)
9. [1人＋1品](#1人1品)
10. [商品角色命名](#商品角色命名)
11. [Template 參數](#template-參數)
12. [新增 Style](#新增-style)
13. [控制台入口](#控制台入口)
14. [素材審核 / 素材審閱](#素材審核--素材審閱)
15. [AI Workflow 使用者流程](#ai-workflow-使用者流程)

## 四個尺寸

| 尺寸 | Template | Style |
|---|---|---|
| `984x309` | `templates/984x309/template.json` | `templates/984x309/styles/` |
| `1080x1920` | `templates/1080x1920/template.json` | `templates/1080x1920/styles/` |
| `1599x1080` | `templates/1599x1080/template.json` | `templates/1599x1080/styles/` |
| `3189x3992` | `templates/3189x3992/template.json` | `templates/3189x3992/styles/` |

## Template

Template 是排版結構，固定檔名：

```text
templates/{size}/template.json
```

Template 負責：

- Canvas 寬高
- 文字位置與尺寸
- Logo 區域
- 三商品區域
- Person 區域
- SingleProduct 區域
- 圖層順序
- `sizeRatios`
- `layoutMode`
- `autoShadow`
- baseline / transform 初始排版設定

Template 不負責背景圖、資訊圖、文字顏色，也不保存使用者手動拖曳、縮放、旋轉後的狀態。

## Style

Style 是視覺樣式，固定路徑：

```text
templates/{size}/styles/{styleId}.json
```

Style 負責：

- 背景圖
- 資訊圖
- 主標顏色
- 副標顏色
- 小字顏色

Style 不可覆寫座標、尺寸、Logo、商品、Person、SingleProduct 或 transform。

## Style JSON 格式

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

目前欄位對應：

- 主標：`headlineColor`
- 副標：`subHeadlineColor`
- 小字：`smallTextColor`

若未來改為 `colors` 物件，對應為：

- `colors.headline`
- `colors.subHeadline`
- `colors.smallText`

## 素材路徑

背景：

```text
assets/source/{size}/backgrounds/bg_01.png
...
assets/source/{size}/backgrounds/bg_16.png
```

資訊圖：

```text
assets/source/{size}/info/info_01.png
...
assets/source/{size}/info/info_16.png
```

對位參考圖：

```text
assets/source/{size}/guide_品.png
assets/source/{size}/guide_1人1品.png
```

## Logo

Logo 最多 3 張，依 `LOGO_01 / LOGO_02 / LOGO_03` 排序。上傳後會做白底裁切，實際位置與尺寸由 Template 的 Logo 區域控制。

## 文字

主標、小字使用 `ShopeeNotoSans(content)-Medium.ttf`，`fontWeight: 400`。副標依 Template 設定。文字位置、尺寸與行高由 Template 控制；文字顏色由 Style 控制。

## 三商品

三商品 position 定義固定：

- position 0：主品，中間最大
- position 1：左配品
- position 2：右配品

視覺排列由 `layout-runtime.js` 依 Template 控制。使用者可拖曳、縮放、旋轉，也可以恢復預設位置。恢復預設位置會清除 user transform，重新套用 Template 初始排版。

## 1人＋1品

Person：

- 由 Template 的 `person.fitWidth` 控制。
- 不支援手動 transform。

SingleProduct：

- 初始尺寸由 `singleProduct.maxWidth / maxHeight` 控制。
- 是否加陰影由 `singleProduct.autoShadow` 控制。
- 支援拖曳、縮放、旋轉與恢復預設位置。

## 商品角色命名

商品角色判斷只由 `js/product-slot-utils.js` 處理。

優先語意命名：

- `_主品` → position 0
- `_左配品` → position 1
- `_右配品` → position 2

相容命名：

- `_01 / _1` → position 0
- `_02 / _2` → position 1
- `_03 / _3` → position 2

無指定商品依上傳順序補剩餘空位。

## Template 參數

- `width / height`：Canvas 實際輸出尺寸。
- `logo`：Logo 區域與排列設定。
- `text`：主標、副標、小字區域。
- `products`：三商品區域。
- `person.fitWidth`：人物初始寬度。
- `singleProduct.maxWidth / maxHeight`：單品初始最大尺寸。
- `singleProduct.autoShadow`：單品是否套陰影。
- `sizeRatios`：三商品比例，例如 `[1, 0.85, 0.72]`。
- `autoShadow`：三商品是否自動套陰影。
- `baselineRatio`：商品陰影與底部基準。
- `layoutMode`：商品排列模式。
- `sourceAssets`：對位參考圖路徑。

## 新增 Style

新增第 17 個 Style 時，需新增：

```text
assets/source/{size}/backgrounds/bg_17.png
assets/source/{size}/info/info_17.png
templates/{size}/styles/17.json
```

新增 Style 不需要修改 Template。若 Style 清單來自 config，需同步更新 config 或產生器，讓控制台知道新增的 style id。

## 控制台入口

控制台名稱：

```text
SPX BN生成器
```

Header 固定四個一般使用者入口：

- 匯入CSV
- 匯入暫存
- 選擇素材資料夾
- 素材審核

素材審核選單：

- 匯入處理結果
- 重新去背素材（N）
- 開啟素材審核

一般使用者 UI 不顯示 Photoshop / Manifest / Processed Folder 等技術術語。底層素材處理、rerun manifest 與 processed import 能力保留，但不作為一般使用者需要理解的主入口。

## 素材審核 / 素材審閱

控制台 Header 入口名稱固定為「素材審核」（Control Center UI Upgrade，Locked）；點選「開啟素材審核」後開啟的工作區標題為「素材審閱」（Review Workspace UI Upgrade）。兩者是同一個功能在不同層級的名稱，不是兩個不同功能。

素材處理與審核流程（目前實際行為，AI Workflow 已完成，macOS Development Validated；見下方「AI Workflow 使用者流程」）：

```text
先自行開啟 Photoshop
  ↓
匯入CSV
  ↓
選擇素材資料夾（一次）
  ↓
Photoshop Ready Check
  ↓
Processing Mode（背景自動處理，Control Center 鎖定）
  ↓
自動 Import 並自動開啟素材審核（進入素材審閱工作區，自動選取第一筆）
  ↓
核准 / 重新去背
```

Control Center 選單內的「匯入處理結果」「重新去背素材（N）」等人工流程仍保留為既有備援入口，未被移除，可獨立於自動化流程使用。

Review Workspace（素材審閱）只檢查 Photoshop processed result。可操作：

- 核准：processed asset 可進入 Main Canvas / Thumbnail / Batch。
- 重新去背：加入 Needs Rerun Collection。

### Navigator（左側）

Navigator 只顯示：

- 檔名
- Review Status（待審閱／已處理／核准／重新去背／去背失敗）
- Dirty Status（尚未儲存的修改以圓點標示）

不顯示 Role、Job ID、Slot、Asset Key、Processed Filename、Mode 等技術 Metadata。

Review Summary（進度、核准數、重新去背數、去背失敗數）與 Filter 固定在 Navigator 上方，並排顯示：

- `全部素材`
- `待重新去背`
- `去背失敗`（去背失敗獨立分類 Bug Fix 新增；僅列出 Photoshop 從未成功處理過的素材）

### Workspace / Dynamic Inspector（中間與右側）

- 預設畫面為 Navigator + Workspace，Inspector 收合，Workspace 使用剩餘最大空間。
- 點選「裁切」或「橡皮擦」時展開 Dynamic Inspector；儲存或取消後自動收合。
- Dynamic Inspector 依目前工具顯示對應設定（View / 裁切 / 橡皮擦），不顯示素材 Metadata。

### Header 與 Decision Area

- Header 只保留「素材審閱」標題與「關閉」。
- 上一張／下一張／撤回上一個決策不再是 Header 常駐按鈕，但仍可用 Navigator 點選或鍵盤 `←` / `→` 導航，且核准 / 重新去背後仍會 Auto Next（非循環導航）。
- 底部 Decision Area 三顆按鈕同列，由左至右：核准、重新去背、撤回上一個決策。
- 去背失敗素材（Photoshop 從未成功處理過）不顯示上述三顆按鈕，改顯示「此素材去背失敗，請回控制台手動更換圖片。」提示文字，並顯示原圖。

### Completion Screen（全部素材完成審閱）

所有可審閱素材完成 Decision 後顯示 Completion Screen：

- Needs Rerun = 0：顯示「全部素材已完成審閱」、「返回控制台」、「撤回上一個決策」。
- Needs Rerun > 0：額外顯示「X 個素材待重新去背」與「重新去背素材（X）」。
- 去背失敗 > 0：額外顯示「X 個素材去背失敗，請回控制台手動更換圖片」，無對應 action 按鈕。

完成判斷使用全域可審閱素材，不是目前 Filter 的結果；若切到「待重新去背」但該 Filter 目前是空的、而全域仍有未審閱素材，會顯示「目前沒有待重新去背的素材」，不會誤顯示成全部完成。去背失敗素材不計入可審閱素材或完成判斷，也不計入「重新去背素材（N）」的 N；即使還有去背失敗素材未處理，只要其餘素材都完成 Decision，仍會顯示「全部素材已完成審閱」。

Completion Screen 可撤回上一個決策並回到正確素材；使用者可隨時透過 Navigator 點選任一已完成素材重新進入編輯，繼續查看、裁切、橡皮擦、儲存、核准或重新去背，不是只能審閱一次。

### 快捷鍵與工具

- 快捷鍵：`A` 核准、`R` 重新去背、`←` 上一張、`→` 下一張、`Esc` 關閉。
- Review Workspace 不提供固定拖曳工具；按住 `Space` 可暫時 Pan，放開後回到原工具。

### 重新去背素材（N）

`重新去背素材（N）` 代表目前需要重新去背的素材數量。`N=0` 時不可執行。點擊後會串接 AI Workflow：重新執行一次 Ready Check、重新進入 Processing Mode（Photoshop 全程保持開啟，不重新啟動），完成後自動回到素材審閱，Filter 自動切到「待重新去背」，只顯示本輪重新處理的素材子集，不 Auto Approve；一般 UI 不顯示 Photoshop / Manifest 等技術術語。系統不會自動啟動 Photoshop App，使用者需自行先開啟 Photoshop。Control Center 選單內原本呼叫 `exportPhotoshopRerunManifest` 的人工匯出流程仍保留，作為獨立備援入口。

重新去背完成後，新的 processed asset 會自動覆蓋上一版 processed asset（同名檔案安全覆蓋），但 original asset 仍保留。完成後會回到 Review Workspace，必須再次核准後才會進入成品渲染。

若原始素材本身需要更換，請使用控制台右側既有素材更換流程，不在 Review Workspace 中換圖。

## Project Persistence / 完整專案保存

Project Persistence 的使用原則是：Project Save = Workspace Save。

### Download Complete Project

控制台主要下載流程為「下載完整專案」。下載後會得到：

```text
project_YYYY-MM-DD.zip
├── JOB-1.png
├── JOB-2.png
├── project-state.json
└── processed/
    ├── 商品A.png
    └── ...
```

Naming Contract（Locked by Jamie，全域唯一規則）：`processed/` 內檔名固定為「原始素材 basename ＋ `.png`」（例如 `商品A.jpg` / `商品A.webp` 都對應 `商品A.png`），與 AI Workflow、人工備援流程（匯出處理檔／匯入處理結果）輸出的檔名規則完全一致；assetKey 只作為內部 metadata（`project-state.json` 內 `processedAssets` 的物件 key）使用，不會進入這裡的實體檔名。Project Persistence 沒有另外一套命名規則，`processed/` 的檔名就是直接沿用 Asset Pipeline State 裡 `processedAsset.filename` 的值。

ZIP 內包含：

- 所有輸出 PNG。
- `project-state.json`。
- Review Workspace 最後一次 Save 的 latest processed image。

使用者不需要另外保存素材資料夾或 Photoshop processed folder，匯入 `project.zip` 後即可恢復工作區。

### Import Project ZIP

匯入 `project.zip` 後會恢復：

- Jobs / 文字。
- Template / Style。
- `layoutStates`。
- Review decision。
- Approved processed assets。
- Review Workspace 最後一次 Save 的 processed result。

匯入後不需要重新 Import Processed Folder。Main Canvas、Thumbnail 與 Batch 會使用 ZIP 內恢復的 latest processed image。

### single-state Restore

`single-state.json` 用於保存單張工單。匯入後會恢復該工單需要的 processed image，因此不需要保留原素材資料夾或 processed folder。

### Review Workspace Restore

匯入 single-state 或 project.zip 後，Review Workspace 開啟時會顯示最後一次 Save 的 processed result。

Approved asset 仍可重新進入 Review Workspace 編輯。Crop / Eraser Save 後會覆蓋目前 processed image，不建立版本歷史。

### Latest Save Restore

系統只保存 latest processed image：

- 不保存 v1 / v2 / v3。
- 不另存 `edited.png` 或 `cleaned.png`。
- 新 Photoshop output 或 Review Workspace Save 會覆蓋目前 processed image。

## AI Workflow 使用者流程

「AI Workflow」與「Photoshop Automation」皆已完成 Coding，並通過 macOS Development Manual Validation（Photoshop 2025，Stage 1–4 共 18 項 PASS）。以下為目前實際使用者流程；Windows Validation 為 Deferred（Waiting for Windows Validation Environment），不宣稱已支援 Windows 或所有 Photoshop 版本。

核心原則：使用者只需在開始前自行開啟 Photoshop；通過 Photoshop Ready Check 後，不需要再操作 Photoshop，也不需要理解 Manifest、Runtime、Processed Folder 或其他技術流程。Photoshop 只是背景素材處理引擎，不是使用者日常操作介面。

```text
1. 使用者先自行開啟 Photoshop。
2. 使用者開啟 SPX AD 生成器。
3. 匯入 CSV。
4. 選擇素材資料夾（一次；選擇時一併取得後續寫入 Processed／ 所需的權限）。
5. 系統執行 Photoshop Ready Check。
6. 若未通過，顯示「Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。」；使用者開啟 Photoshop 後按「重新檢查」即可繼續，不需要重新選擇 CSV / 素材資料夾。
7. Ready Check 通過後，系統進入 Processing Mode：
   素材處理中（18 / 63）
   請勿操作 Photoshop，
   系統將自動完成背景處理。
   完成後將自動帶入素材審閱。
8. 背景處理期間 Control Center 不可操作（不可修改文字、不可切換工單、不可下載、不可開始新的工作）。
9. 完成後顯示：素材處理完成（停留約 0.8 秒，此時間只屬於 UI 轉場，不是處理完成的判定依據）。
10. 系統自動開啟素材審閱並自動選取第一筆素材，使用者不需要再按「開啟素材審核」：核准 / 重新去背 / 裁切 / 橡皮擦（UI 與既有 Review Workspace 完全相同）。
11. Needs Rerun = 0 → 返回控制台。
12. Needs Rerun > 0 → 點擊「重新去背素材（N）」，系統重新執行 Ready Check 後再次進入相同的 Processing Mode（Photoshop 全程保持開啟，不重新啟動），完成後自動回到素材審閱，Filter 自動切到「待重新去背」，只顯示本輪重新處理的素材，核准後自動顯示下一筆，不會誤跳回完成畫面。
13. 重複至 Needs Rerun = 0，Workflow 結束。
14. 若有素材去背失敗（去背失敗獨立分類 Bug Fix；Photoshop 從未成功處理過），Completion Screen 另外顯示「X 個素材去背失敗，請回控制台手動更換圖片」；此提示不影響「全部素材已完成審閱」的顯示，也不計入「重新去背素材（N）」的 N。使用者需回控制台手動更換圖片，再自行重新走一次流程。
```

若過程中發生失敗，畫面會顯示對應復原提示（「Photoshop 已關閉」「素材處理失敗」「無法寫入處理結果」「無法開啟素材審閱」）與對應動作（「重新檢查」「重試」「重新授權」「重新開啟素材審閱」），Global Interaction Lock 持續維持直到復原成功並進入素材審閱；Retry 不會重複觸發 Photoshop，也不會遺漏已成功的部分。部分素材去背失敗（至少一張成功）不顯示上述整批 Recovery 提示——直接進入素材審閱，失敗素材改以「去背失敗」呈現（見上方 Completion Screen 說明）；只有全部素材皆處理失敗時才會顯示「素材處理失敗」與「重試」。

使用者始終只看到工作語言（素材處理中、素材處理完成、素材審閱、核准、重新去背、待重新去背、重新去背素材（N）、去背失敗、請回控制台手動更換圖片）與上述核可的復原提示；不會看到 Manifest、Runtime、Processed Folder、executionId 等技術詞彙。「素材處理完成」後直接自動進入素材審閱，不存在獨立的「等待審閱」中繼狀態。

Photoshop Automation 與 AI Workflow 責任不重疊：Photoshop 端的 Ready Contract、批次去背、Progress / Completion 狀態回報屬於 Photoshop Automation；Control Center 端的 Manifest 建立與送出、Processing Mode、自動 Import、自動開啟 Review Workspace、Error / Recovery 屬於 AI Workflow。AI Workflow 未重新設計 Navigator、Dynamic Inspector、Decision Area 或 Completion Screen 的架構；已修正兩個既有 UX Bug：完成畫面判斷改為依目前 Filter 是否還有素材、去背失敗獨立分類（新增第三個 Filter 與既有元件內的新增顯示內容，詳見 CHANGELOG）。
