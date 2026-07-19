# UI Design Guideline

Version: 2026.07.19-ui-copy
Last Updated: 2026-07-19
Scope: 控制台 UI、互動、視覺語言與 Template / Style 命名規範。

## What's New

- **Upload Panel stale hint rendering 修正（UI Bug Fix，Commit `e44f658`）**：移除 `updateMutualExclusion()` 對已不存在之 Products／1人＋1品提示容器的 sibling lookup 與文字／顏色寫入，避免覆寫商品清單與「恢復預設位置」按鈕。商品排序、角色判斷、Reset 與雙向互斥行為不變；Browser Validation 與 Jamie Manual Validation PASS。
- **三商品前後順序（z-order）與角色身份解耦（Bug Fix，Commit `ff1d97b`）**：右側商品圖清單改為依前後順序（Layer／堆疊順序）排列顯示；每一列的角色標籤（主品／左配品／右配品）仍固定依該商品實際角色顯示，不隨列的顯示順序改變。詳見下方商品圖區塊小節與 CHANGELOG。
- **QR Code（Completed，功能 Commit `79de045`、Tag `v0.5.2`）**：控制台右側欄新增 QRCode 區塊，固定順序為主標／副標／小字之後、Logo 之前；包含標題、網址輸入框、檢查網址連結、狀態訊息（固定保留於輸入框下方，有狀態時顯示文字、無狀態時保持空白）；不提供縮圖、位置／尺寸資訊、拖曳、縮放、旋轉或樣式設定。詳見下方 Right Panel 小節與 CHANGELOG。
- **去背失敗獨立分類（Bug Fix）**：Review Workspace 新增第三個 Filter 分頁「去背失敗」與 Navigator 標籤；去背失敗素材的 Decision Area 改顯示提示文字取代三顆按鈕；Completion Screen 新增去背失敗計數，但不影響完成判定；Recovery Banner 不再顯示「部分素材處理失敗」。詳見下方相關小節與 CHANGELOG。
- AI Workflow 背景處理狀態 UI 完成（macOS 與 Windows Development Validated，Photoshop 2025）：Processing Notice、Recovery Banner 皆已實作，詳見下方「Control Center 背景處理狀態 UI」。
- Review Workspace UI Upgrade：Navigator Information Architecture 簡化、Workspace Layout 與 Dynamic Inspector 改版、Decision Area 三顆按鈕同列、新增 Completion Screen / Completion Recovery、Review Workspace 正式中文化。
- Control Center UI Upgrade：Header 簡化為一般使用者主入口，素材審核入口整合狀態與操作。
- 控制台 UI 文件同步 Template + Style 架構。
- 新增目前控制台架構圖。
- 明確定義 Template = 排版，Style = 背景 / 資訊圖 / 文字顏色。
- 補上 `template.json`、`styles/`、`backgrounds/`、`info/` 命名規範。
- 初始狀態、匯入 CSV、匯入暫存與重設工作區 UI 狀態需保持一致。
- Review Workspace decision UI 三顆按鈕：核准、重新去背、撤回上一個決策。
- 新增 Review Workspace 繁體中文 UI Terminology 對照表。

## Table of Contents

1. [控制台架構圖](#控制台架構圖)
2. [Template / Style UI 原則](#template--style-ui-原則)
3. [命名規範](#命名規範)
4. [Header](#header)
5. [Left Panel](#left-panel)
6. [Canvas](#canvas)
7. [Right Panel](#right-panel)
8. [Dialog](#dialog)
9. [Button](#button)
10. [Typography](#typography)
11. [Spacing](#spacing)
12. [Color](#color)
13. [Interaction](#interaction)
14. [Empty State](#empty-state)
15. [Review Workspace UI](#review-workspace-ui)
16. [UI 原則](#ui-原則)

## 控制台架構圖

```text
Header
  ↓
Workspace
  ├─ Left Panel: jobs + thumbnails
  ├─ Canvas Panel: toolbar + preview iframe
  └─ Right Panel: text + assets + download actions
        ↓
Project State
        ↓
canvas.html Render Engine
```

## Template / Style UI 原則

```text
Template
  ↓
排版結構
  ↓
位置 / 尺寸 / 圖層 / Logo / 商品 / Person / SingleProduct

Style
  ↓
視覺樣式
  ↓
背景 / 資訊圖 / 文字顏色
```

UI 上 Template 與 Style 是兩個概念：

- Template 欄位顯示目前排版結構。
- Style 下拉顯示目前視覺樣式。
- 切換 Style 不應讓使用者誤以為換了排版。
- Style 切換不得清除素材、文字或 transform。

## 命名規範

Template：

```text
templates/{size}/template.json
```

Style：

```text
templates/{size}/styles/{styleId}.json
例如 styles/01.json 到 styles/16.json
```

背景：

```text
assets/source/{size}/backgrounds/bg_01.png
```

資訊圖：

```text
assets/source/{size}/info/info_01.png
```

UI 文案應使用「Template / Style / 樣式」，避免使用需要使用者理解內部編號的舊詞。

## Header

Header 放品牌、主要匯入操作與狀態 Badge。Badge 使用一致高度、圓角、字級、padding、間距與 status dot。

### Control Center UI Upgrade

Header 品牌顯示：

```text
SPX AD BN生成器
```

Header 固定四個一般使用者入口：

- 匯入CSV
- 匯入暫存
- 選擇素材資料夾
- 素材審核

素材審核入口負責狀態呈現與開啟既有審核流程：

- 處理中：`處理中（18 / 63）`
- 全部完成：`素材審核（63）`
- 有待審核：`素材審核（已完成：58｜待審核：5）`

素材審核選單可承載既有流程入口，但一般使用者 UI 不顯示 Photoshop / Manifest / Processed Folder 等技術術語。

`建立素材處理檔` 屬於 Manifest export 技術流程，不作為一般使用者可見入口。底層能力可保留，但入口不得重新暴露，除非使用者明確要求。

常駐 Badge 僅顯示必要狀態：

- 已套用文字
- 素材資料夾狀態
- CSV 工單狀態

匯入暫存是一次性動作，不顯示常駐 Badge，可用 toast 或短暫狀態提示。

## Left Panel

工單列表顯示 job 編號、主標、副標與 thumbnail。縮圖顯示優先序：

1. `job.thumbnail`
2. `job.quickThumbnail`
3. placeholder / loading

Active 狀態使用藍色外框與深色底。切換工單時不得造成 Canvas 閃爍。

## Canvas

Toolbar 顯示：

- 版位
- Template
- Style

尺寸 Badge 不顯示，避免與版位名稱重複。Canvas 實際輸出尺寸仍由 Template 控制。

## Right Panel

文字欄位固定在上方，QRCode 區塊固定於文字欄位之後、Logo 之前。Logo、商品圖、1人＋1品使用 Accordion。

素材上傳區塊固定使用以下精簡文案，不在 Upload Box 下方顯示額外說明文字：

- Logo 標題：`Logo（最多3張）`；Upload Box：`＋ 點擊或拖曳上傳 Logo`。
- 商品圖標題：`商品圖（最多3張）`；Upload Box：`＋ 點擊或拖曳上傳商品圖`。
- 1人＋1品標題：`1人＋1品`；Upload Box：`＋ 點擊或拖曳上傳圖片`。

Products 與 1人＋1品 Upload Box 下方不建立或保留提示文字占位；後續清單與「恢復預設位置」按鈕自然接續排列。互斥狀態只調整既有 Upload Box 與 Reset button 狀態，不得以 sibling lookup 寫入商品清單或 Reset button 文字。

### QRCode 區塊（Completed）

固定順序：主標／副標／小字之後、Logo 之前；不是 Accordion，恆常展開，也不參與素材互鎖判斷。

包含：

- 標題「QRCode」。
- 網址輸入框（placeholder：`https://example.com`）。
- 檢查網址連結：合法網址時可點擊，使用預設瀏覽器開啟；空值或非法網址時停用（視覺降低對比，游標不可互動）。
- 狀態訊息：固定保留於輸入框下方（版面固定佔位，不因有無文字而跳動）；有狀態時顯示文字，無狀態時保持空白；不使用 Toast，不自動消失。

不提供：

- QR Code 縮圖預覽。
- 位置／尺寸／比例資訊。
- 拖曳、縮放、旋轉。
- 樣式設定（顏色、Error Correction Level 皆固定，不開放調整）。

更新時機固定為貼上網址（自動套用）、Enter、失焦；不綁定「套用文字到模板」按鈕，兩者各自獨立觸發。

Accordion 規則：

- 收合只影響 UI 顯示，不改變資料。
- 互鎖 disabled 狀態仍依素材模式判斷。
- 切換工單時依該工單模式套用預設展開。

恢復預設位置按鈕放在對應素材區塊內：

- 商品圖區塊：重設三商品。
- 1人＋1品區塊：只重設 SingleProduct。

商品圖區塊清單前後順序（▲／▼）：

- 清單列的顯示順序依前後順序（Layer／堆疊順序）排列，由前到後。
- 每一列的角色標籤（主品／左配品／右配品）固定依該商品實際角色顯示，不隨列在清單中的顯示順序改變。
- ▲／▼ 只調整該商品在堆疊順序中的前後位置（誰蓋住誰），不改變其角色、預設大小或預設位置。
- 商品上傳後，商品列及其編輯、移除、▲／▼操作必須持續顯示，不得由 Upload Panel 的提示文字更新覆寫。

## Dialog

Confirm、Success、Danger dialog 維持深色 Apple / Figma 風格。可關閉 dialog 應支援：

- 圓形 X icon
- ESC
- 必要時背景點擊

危險操作必須先確認，例如重設工作區。

## Button

- Primary：主要動作。
- Secondary：一般操作與下載。
- Danger：重設工作區。
- Disabled：降低對比並禁止互動。
- Icon Button：固定尺寸，需有 hover/focus 狀態。

按鈕成功後不應長期改文字；長期狀態應放 Badge 或狀態列。

## Typography

控制台全域 UI font-family：

```css
-apple-system,
BlinkMacSystemFont,
"Segoe UI",
"PingFang TC",
"Microsoft JhengHei",
"Noto Sans TC",
system-ui,
sans-serif
```

Canvas Banner 成品字體不受控制台 UI 字體影響。Banner 文字字型依 Template / Canvas runtime 設定。

## Spacing

區塊間距以 8px 倍數為主。右側 Accordion 區塊間距需清楚，避免上傳區、列表與按鈕擠在一起。

## Color

- Primary：系統藍。
- Success：綠。
- Warning：黃橘。
- Danger：紅。
- Neutral：深色灰階。

避免增加多餘裝飾色。狀態色只用於可操作或可判讀的狀態。

## Interaction

Hover、Focus、Disabled、Loading 狀態需一致。

重要互動規則：

- CSV 匯入後 UI 進入全新工作區。
- 匯入暫存後立即顯示縮圖與已保存狀態。
- Style 切換不得造成 Canvas 閃爍或清除素材。
- Toast 用於一次性成功提示。

## Empty State

初始狀態：

- 不顯示已套用文字。
- 不顯示素材 Badge。
- 不顯示 CSV Badge。
- 版位顯示「請先匯入 CSV」。
- Template 與 Style 顯示 `—`。
- 左側無工單。
- Canvas 回到空白或初始提示。


## Review Workspace UI

Review Workspace（素材審閱）是 processed result 的檢查與修圖工作區，不是素材管理或換圖介面。

Decision actions 固定為：

- 核准
- 重新去背
- 撤回上一個決策

不得再新增 `Rejected` action。原始素材若需要更換，沿用控制台右側素材欄。

### Navigator（Review Workspace UI Upgrade）

- Navigator 主要顯示：檔名、Review Status、Dirty Status。
- 不顯示 Role、Job ID、Slot、Asset Key、Processed Filename、Mode 等素材技術 Metadata。
- Review Summary 與 Filter 固定在 Navigator 上方；Filter 並排顯示「全部素材」「待重新去背」「去背失敗」三個選項（去背失敗獨立分類 Bug Fix 新增第三個選項，見下方 Completion Screen 與去背失敗小節）。

### Workspace Layout（Review Workspace UI Upgrade）

- 預設畫面為 Navigator + Workspace，Inspector 預設收合。
- 點選裁切或橡皮擦時展開 Dynamic Inspector；儲存或取消後收合 Inspector。
- Workspace 永遠使用剩餘最大空間；不建立新的 Editor Session，不重建 Editor DOM。

### Dynamic Inspector（Review Workspace UI Upgrade）

- Inspector 依目前工具顯示對應設定：View、裁切、橡皮擦。
- Inspector 不再顯示素材 Metadata（Asset Key、Role、Job ID、Slot、Mode、Processed Filename 等一律移除）。

### Header 與 Decision Area（Review Workspace UI Upgrade）

- Header 僅保留：素材審閱（標題）、關閉。
- 已移除可見的上一張、下一張、撤回上一個決策 Header 按鈕；底層 Navigator 點擊、Keyboard ← / →、Auto Next、非循環導航皆保留，只是不再是 Header 常駐按鈕。
- 底部 Decision Area 三顆按鈕同列，由左至右：核准、重新去背、撤回上一個決策。
- 樣式：核准為 Primary；重新去背為 Warning / Danger；撤回上一個決策為灰色 Outline、低視覺權重。
- 去背失敗（`background_removal_failed`，去背失敗獨立分類 Bug Fix）素材不顯示上述三顆按鈕，改顯示提示文字「此素材去背失敗，請回控制台手動更換圖片。」；顯示原圖（無 processed image 可看）。

### Completion Screen（Review Workspace UI Upgrade）

所有 Reviewable Assets 完成 Decision 後顯示 Completion Screen：

- Needs Rerun = 0：顯示「全部素材已完成審閱」「返回控制台」「撤回上一個決策」。
- Needs Rerun > 0：額外顯示「X 個素材待重新去背」與「重新去背素材（X）」。
- 去背失敗 > 0（去背失敗獨立分類 Bug Fix）：額外顯示「X 個素材去背失敗，請回控制台手動更換圖片」，不提供對應的 action 按鈕。

Completion 判斷必須使用全域 Reviewable Assets，不得使用目前 Filter collection；Needs Rerun 數量沿用 `BNAssetPipelineState.getNeedsRerunAssets()`。「待重新去背」Filter 為空、但全域仍有未審閱素材時，顯示「目前沒有待重新去背的素材」，不得誤顯示全域完成。去背失敗素材完全不計入 Reviewable Assets 或完成判斷（永遠不會被視為「待完成」），也不計入「重新去背素材（N）」的 N；`重新去背素材（N）` 沿用 `BNAssetPipelineState.getNeedsRerunAssets()`，不受去背失敗影響。

### Completion Recovery（Review Workspace UI Upgrade）

- Completion Screen 可撤回上一個決策，撤回後回到正確素材。
- 使用者可點 Navigator 任一已完成素材重新進入 Editor 繼續查看、裁切、橡皮擦、儲存、核准或重新去背，不是只能審閱一次。
- Completion Screen 不得永久覆蓋 Editor。

### Review Workspace UX Polish

- Review Progress Header 必須清楚顯示目前 filter 的 `current / total`、Approved count 與 Needs Rerun count。
- Review Complete Header 用於最後一張完成後的狀態，不自動關閉 Workspace。
- Auto Next 是 decision flow 的預設行為；`Approve` / `Needs Rerun` 後自動前往下一張。
- Keyboard Shortcuts 只在 Review Workspace 開啟時生效；焦點在 input、textarea、select、contenteditable 或 slider 時不得攔截。
- 快捷鍵：`A` Approve、`R` Needs Rerun、`←` Previous、`→` Next、`Esc` Close、`Space` Temporary Pan。
- Temporary Pan（Space）是 momentary action，放開 Space 後必須回到原工具。
- Remove Drag Tool UX Principle：Pan 不應是 persistent tool；不顯示固定 Drag Tool 按鈕。

`重新去背素材（N）` 屬於素材審核選單／Completion Screen 內的流程型 action，目前有兩個共存的入口（AI Workflow Completed 後的現況，非本 UI Upgrade 當時的行為）：

- `N=0` 時兩個入口皆 disabled。
- **Review Workspace Completion Screen 內的入口（主要流程）**：點擊後串接 AI Workflow Orchestrator，自動重新執行一次 Ready Check、重新進入 Processing Mode（Photoshop 全程保持開啟，不重新啟動）、完成後自動 Import、自動回到素材審閱並將 Filter 切到「待重新去背」，只顯示本輪重新處理的素材子集，不 Auto Approve。
- **Control Center 選單內的入口（人工備援）**：仍呼叫既有 `exportPhotoshopRerunManifest` callback，匯出 `photoshop-rerun-manifest.json` 供人工執行既有 Photoshop Runner，執行後需人工點擊「匯入處理結果」；這個入口保留作為獨立備援，AI Workflow 沒有取代或移除它。
- 一般 UI 使用「重新去背素材」，不使用 Photoshop / Manifest 等技術術語。
- 兩個入口共用同一套 basename + `.png` Naming Contract（見 `docs/Photoshop Asset Pipeline.md`），Processed 結果匯入後都回到 Review Workspace，都不會自動更新 Main Canvas / Thumbnail / Batch。
- 若 Project State 已恢復 `approved` decision，Main Canvas 可透過既有 approved asset refresh flow 更新 approved processed asset source。
- Main Canvas refresh 僅更新既有 DOM 的圖片來源，不重建 DOM、不重設 transform、不修改 `layoutState`。

### Review Workspace 繁體中文 UI Terminology

| 英文 / 內部概念 | 正式中文 UI Label | Internal value（不變） |
|---|---|---|
| Review Workspace | 素材審閱 | - |
| All Assets | 全部素材 | `all` |
| Needs Rerun Only | 待重新去背 | - |
| Background Removal Failed | 去背失敗 | `background_removal_failed` |
| Approved | 核准 | `approved` |
| Needs Rerun | 重新去背 | `needs_rerun` |
| Pending | 待審閱 | `pending` |
| Processed | 已處理 | `processed` |
| Undo Last Decision | 撤回上一個決策 | - |
| Crop | 裁切 | `crop` |
| Eraser | 橡皮擦 | `eraser` |
| Restore | 復原 | - |
| Fit to Canvas | 符合畫面 | - |
| Save | 儲存 | - |
| View Original | 查看原圖 | - |

中文化只限 UI Label，internal values 必須繼續維持英文小寫原值，不得因中文化而改變資料格式或 API 契約。

### Control Center 背景處理狀態 UI（AI Workflow，Completed — macOS 與 Windows Development Validated）

Photoshop Automation 已完成背景自動化能力，AI Workflow 已完成 Control Center 端的背景處理狀態 UI，並通過 macOS Development Manual Validation（Photoshop 2025）。以下為目前實際實作行為。

正常狀態（Processing Notice，`position:fixed`，永遠顯示在最上層，不受 Review Workspace 等其他 UI 影響）：

```text
素材處理中（18 / 63）
請勿操作 Photoshop，
系統將自動完成背景處理。
完成後將自動帶入素材審閱。
```

完成狀態：

```text
素材處理完成
```

Ready Check 未通過提示（唯一允許直接顯示 Photoshop 名稱的前置條件訊息）：

```text
Photoshop 已關閉。
請重新開啟 Photoshop。
開啟後按「重新檢查」即可繼續。
［重新檢查］
```

Recovery Banner（可復原的失敗狀態，`position:fixed`，z-index 高於 Global Interaction Lock Overlay）：

```text
素材處理失敗。／無法寫入處理結果。／無法開啟素材審閱。
［重試］／［重新檢查］／［重新授權］／［重新開啟素材審閱］
```

說明：

- 正常工作流程仍不暴露 Manifest、Runtime、Processed Folder、executionId 等技術詞彙；Ready Check 失敗與復原提示是唯一允許直接顯示「Photoshop」名稱或明確錯誤語言的訊息，且僅限上述核可文案。
- Processing Mode 期間 Control Center 不可操作（不可修改文字、不可切換工單、不可下載、不可開始新的工作）；可復原的失敗狀態下，Lock 依然維持，只開放對應的 Recovery Banner 動作按鈕。
- 「素材處理完成」停留約 0.8 秒為完成轉場動畫，不是處理完成的判定依據；完成後直接自動開啟素材審閱並自動選取第一筆素材，不存在獨立的「等待審閱」中繼狀態。
- 部分素材去背失敗（PartialFailure，至少一張成功；去背失敗獨立分類 Bug Fix）不顯示 Recovery Banner、不使用「部分素材處理失敗」文案——直接進入素材審閱，Lock 正常解除；失敗素材改於素材審閱內以「去背失敗」呈現（見上方 Review Workspace 相關小節）。只有全部素材皆處理失敗（zero success）才會顯示上述「素材處理失敗。」Recovery Banner。
- AI Workflow 已完成背景處理狀態（含 Ready Check 提示與 Recovery Banner）自動化，未重新設計 Review Workspace UI Upgrade 的 Locked 規格架構（Navigator、Dynamic Inspector、Decision Area、Completion Screen 的架構皆維持既有設計）；已修正兩個既有 UX Bug：完成畫面判斷改為依目前 Filter 是否還有素材、去背失敗獨立分類新增第三個 Filter 與 Decision Area／Completion Screen 內的新增顯示內容（皆為既有元件內的新增內容，非重新設計，見 CHANGELOG）。
- Photoshop Automation 與 AI Workflow 責任不重疊：本節描述的 Control Center UI 屬於 AI Workflow；Photoshop 端的 Ready Contract、批次處理、狀態回報屬於 Photoshop Automation，不在本節範圍內。
- Windows Validation 與 Jamie Manual Validation 已在 Photoshop 2025 實機 PASS。

## Project Persistence UX

Project Persistence 的 UX 原則是讓使用者理解「保存的是完整工作區」，而不是理解內部 state / folder 差異。

### Download Complete Project

- 主要下載 CTA 使用「下載完整專案」。
- ZIP 同時包含輸出 PNG、`project-state.json` 與 `processed/`。
- UI 不應要求使用者區分「批次產圖」與「專案 ZIP」。
- 匯入 `project.zip` 後應回到可繼續工作的狀態。

### Latest Save Principle

- Review Workspace 最後一次 Save 是唯一會被保存的 processed result。
- 不顯示版本歷史。
- 不出現 `edited` / `cleaned` / `v2` 等使用者不需要理解的版本語言。
- 新 Photoshop output 或新的 Review Workspace Save 會覆蓋目前 processed image。

### Review Workspace Integration

- Approved asset 重新開啟 Review Workspace 時，應顯示最後一次 Save 的 result。
- Approved asset 可繼續 Crop / Eraser 編輯。
- Save 不自動 Approve、不改 decision、不直接改 Render Engine。
- Restore 後 Main Canvas、Thumbnail、Batch 透過既有 Resolver 使用 restored processed source。

### No Version History / Latest Only

- 不新增版本切換 UI。
- 不新增 processed history panel。
- 不新增 original / edited / cleaned folder 的 UI 概念。
- 使用者只需要知道目前 project.zip 會保存「最新狀態」。

## UI 原則

- 維持 Apple / Figma 風格。
- 減少重複資訊。
- 狀態要清楚，尤其是 CSV 新工作區與暫存恢復工作區。
- 操作流程保持簡潔。
- UI 不應暴露使用者不需要理解的內部架構。
- 控制台 UI 與 Canvas 成品視覺需分離。
