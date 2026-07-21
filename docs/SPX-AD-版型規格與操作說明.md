# SPX AD 版型規格與操作說明

Version: 2026.07.20-single-state
Last Updated: 2026-07-20
Scope: Banner 版型結構、Style 視覺樣式、素材命名、Template 參數規格與操作流程。

## What's New

- **下載單張暫存精簡（Commit `2c7dca06146b414ec23f29df94d190d8d09d457d`）**：single-state JSON 不再包含 `jobs[].thumbnail`，也不再為縮圖執行 on-demand Canvas capture；檔名改為與單張 PNG 相同 basename、僅使用 `.json` 副檔名。素材 data URL、processed asset、版面、手動換圖及圖片編輯結果均維持可還原。Browser Validation 與 Jamie Manual Validation PASS。
- **左側 Job List 鍵盤導航（Commit `b6d2b8f41015d56f1fd207dcba1145b40ede96ca`）**：一般控制台按 `ArrowUp`／`ArrowDown` 可切換上一個／下一個 Job，首尾不循環；切換沿用既有 `selectJob()`，active Job Card 只在左側列表內自動捲動。輸入控制項、Main Canvas iframe、Modal、Editor、Review Workspace 與 Crop／Eraser等模式中不切換；素材審核選單開啟時仍可切換，按鈕取得焦點時則不切換。Jamie Manual Validation PASS。
- **左側 Job List 縮圖移除（Commit `b67604b037f553fb1ac76d7e320acaa9a6afd970`）**：Job Card 不再顯示縮圖、placeholder、loading shimmer 或縮圖內 validation dot，一般操作也不再背景生成只供左側列表使用的縮圖。原本三行文字資料與 Job 點擊、active 狀態、排序、刪除及切換行為均保留；第三行改為 `12px`、主要文字色與一般字重。該次 Commit 保留既有 thumbnail 行為，後續 single-state thumbnail 已由 Commit `2c7dca0` 獨立移除；缺少素材的 validation panel，以及完整專案／Batch、Project State 的既有行為仍保留。Jamie Manual Validation PASS。
- **Upload Panel stale hint rendering 修正（UI Bug Fix，Commit `e44f65879e3140ba87ecb4c49f5171d291d5e98d`）**：Products／1人＋1品的提示文字容器已移除，但舊 sibling lookup 仍會把商品清單與 Reset button 誤認為提示區並覆寫內容；現已只移除失效的提示文字與顏色寫入。商品排序、角色判斷、Upload、Reset 與雙向互斥均維持原行為，Browser Validation 與 Jamie Manual Validation PASS。
- **手動換圖跨 Job 保留（Bug Fix，Commit `4ff252f`）**：Products、Person、Single Product 使用相同完整檔名手動換圖後，切換到其他 Job 再切回，仍顯示手動換入的圖片；既有大小、位置、旋轉與前後順序依原本 Job layout state 正確保留。快速切換 Job 時可能等待目前 Render 完成，但完成後不會再被原始或 processed 圖片覆蓋。此修正只作用於目前頁面 session，不新增重新整理後的永久保存。
- **SPX Helper Runtime Productization Phase 3 macOS Packaging（Completed）**：macOS 正式產品由 PKG 安裝至 `/Applications/SPX Helper.app`，安裝後立即啟動，之後登入時透過 LaunchAgent 自動啟動；也可從 Applications 手動開啟。Menu Bar 提供 Running、Open SPX BN Generator、About、Version `0.5.4`、Restart 與 Quit；App 不顯示 Dock Icon，也不開啟 Terminal Window。Jamie Manual Validation 全部 PASS。Developer ID signing／Notarization 尚未驗證。
- **Phase 3 macOS Packaging 安裝後啟動 Bug Fix（Commit `781df79c232a9644cc0bd69653e390ef70d12964`）**：PKG 安裝完成後改由 LaunchAgent bootstrap + kickstart 啟動 Helper，不再由 installer 直接 `open` App，因此不會繼承已刪除的 PackageKit temp environment。Jamie 已以正式 5 筆工單／22 個素材重驗 GitHub Pages → Helper → Photoshop → Processed PNG PASS；使用者操作、Menu Bar Quit 與 Login Startup 行為不變。
- **一人一品（Person + Single Product）手動換圖修正（Bug Fix，Commit `c390a61`）**：手動換圖後下載單張暫存並重新開啟，正確保留換過的新圖（不再還原成舊圖）；Single Product 換圖後 Shadow 正確顯示；換圖前已拖曳／縮放／旋轉的位置與角度維持不變，仍可繼續正常拖曳、縮放、旋轉。詳見下方「1人＋1品」章節。
- **三商品手動同檔名換圖保留 Product Identity（Bug Fix，Commit `3269b67`）**：拖曳與既有商品完整檔名（含副檔名）相符的新圖片，會視為取代該商品，原地更新圖片內容，商品角色身份與前後順序不變；Canvas 立即更新，整組比例、間距、overlap 與商品區域 fit 皆與其餘兩張商品一致；下載單張暫存並重新開啟後，換圖結果維持一致。詳見下方「三商品」章節。
- **三商品前後順序與角色身份解耦（Bug Fix，Commit `ff1d97b`）**：調整前後順序不再改變商品角色身份（主品／左配品／右配品固定不變），只改變視覺堆疊順序；前後順序會隨其他調整正確保存與還原。詳見下方「三商品」章節。
- **QR Code（Completed，功能 Commit `79de045`、Tag `v0.5.2`）**：每個 Job 依 CSV 的 `QRcode` 欄位網址自動產生 QR Code，可於控制台右側欄手動修改；四個尺寸皆有 Locked Visual Baseline 固定座標，位置與大小不可調整。詳見下方「QRCode」章節。
- **去背失敗獨立分類（Bug Fix）**：素材審閱新增「去背失敗」Filter 與 Navigator 標籤，去背失敗素材改顯示提示文字並需回控制台手動更換圖片；Completion Screen 新增計數但不影響完成判定。詳見下方「素材審核 / 素材審閱」與「AI Workflow 使用者流程」，以及 CHANGELOG。
- AI Workflow 使用者流程完成（macOS 與 Windows Development Validated，Photoshop 2025）：素材審核／素材審閱流程新增自動化 Ready Check、Processing Mode、自動 Import、自動開啟審閱與 Rerun，詳見下方「素材審核 / 素材審閱」與「AI Workflow 使用者流程」。
- 四個尺寸皆採用 `template.json` + `styles/01.json`～`styles/16.json`。
- Template 只保存排版結構。
- Style 只保存背景、資訊圖與文字顏色。
- Source assets 統一放在 `backgrounds/` 與 `info/`。
- 商品角色命名支援 `_主品/_左配品/_右配品`，並相容 `_01/_02/_03`。
- 控制台名稱為 `SPX AD BN生成器`，Header 固定一般使用者入口。
- Review Workspace UI Upgrade 完成：更新素材審閱操作流程（Navigator、Dynamic Inspector、Decision Area、Completion Screen、Completion Recovery）。

## Table of Contents

1. [四個尺寸](#四個尺寸)
2. [Template](#template)
3. [Style](#style)
4. [Style JSON 格式](#style-json-格式)
5. [素材路徑](#素材路徑)
6. [Logo](#logo)
7. [文字](#文字)
8. [QRCode](#qrcode)
9. [三商品](#三商品)
10. [1人＋1品](#1人1品)
11. [商品角色命名](#商品角色命名)
12. [Template 參數](#template-參數)
13. [新增 Style](#新增-style)
14. [控制台入口](#控制台入口)
15. [素材審核 / 素材審閱](#素材審核--素材審閱)
16. [AI Workflow 使用者流程](#ai-workflow-使用者流程)

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

## QRCode

每個 Job 擁有一組 QR Code，由 CSV 的 `QRcode` 欄位網址自動產生；使用者可於控制台右側欄修改網址，系統依網址重新產生 QR Code。不使用使用者自行準備的 QR Code 圖片。

CSV 欄位：

- 固定欄名為 `QRcode`（欄名可含換行與括號說明文字，例如「QRcode\n( 請提供縮短網址 )」，系統只比對清理後剛好等於 `QRcode` 的欄位）。
- 內容為網址，每個 Job 可不同。
- 建議優先使用縮短網址，以提升 QR Code 掃描辨識率；但不限制網址類型。

網址驗證：

- 自動 trim 前後空白。
- 未含 Protocol（例如 `shopee.tw`）自動補上 `https://` 後再驗證。
- 不限制網域、是否縮網址、是否帶參數、網址類型，只需為合法網址即可。

狀態訊息（固定顯示於輸入框下方）：

| 情境 | 訊息 |
|---|---|
| 成功更新（合法網址且與目前不同） | ✓ QR Code 已更新 |
| 網址未變更（網址相同） | 目前網址未變更 |
| 已移除（清空網址） | ✓ QR Code 已移除 |
| 無有效網址（空值或非法網址） | ⚠ 請輸入有效的網址（例如：https://example.com） |

更新時機：貼上網址（自動套用）、Enter、失焦皆會觸發驗證；不綁定「套用文字到模板」按鈕。

檢查網址連結：合法網址可點擊、使用預設瀏覽器開啟；空值或非法網址時停用。

外觀與位置：固定黑碼、白底；固定 Error Correction Level `M`，不提供使用者調整；固定位於 Info 圖層之上；不可拖曳、縮放、旋轉。四個尺寸皆有 Locked Visual Baseline（已包含 Quiet Zone 與黑碼）：

| 尺寸 | X | Y | W | H |
|---|---|---|---|---|
| 984×309 | 880 | 183 | 85 | 85 |
| 1080×1920 | 46 | 1667 | 165 | 165 |
| 1599×1080 | 82 | 808 | 175 | 175 |
| 3189×3992 | 151 | 3213 | 500 | 500 |

匯出：下載單張圖檔、下載單張暫存、下載完整專案皆會依各自 Job 的網址正確顯示或不顯示 QR Code；空值或非法網址的 Job 不顯示 QR Code，Banner 正常 Render，不影響其他 Job。

## 三商品

三商品 position 定義固定：

- position 0：主品，中間最大
- position 1：左配品
- position 2：右配品

視覺排列由 `layout-runtime.js` 依 Template 控制。使用者可拖曳、縮放、旋轉，也可以調整前後順序（▲／▼，誰蓋住誰），也可以恢復預設位置。恢復預設位置會清除 user transform，重新套用 Template 初始排版。

商品圖 Upload Box 下方不顯示「01 主品置中最大；02 左側配品；03 右側配品。未編號時依上傳順序。」；不保留提示文字空白。商品上傳後，商品列表與移除／▲／▼操作正常保留，「恢復預設位置」按鈕與 1人＋1品雙向互斥行為不變。Logo 與商品圖素材列不顯示「編輯」按鈕；Editor 程式與圖片處理能力仍保留。

調整前後順序不會改變商品的角色身份（主品／左配品／右配品固定不變），只改變視覺堆疊順序；右側商品清單依前後順序顯示，角色標籤仍依實際角色顯示。前後順序會隨其他調整一起保存於工單，下載單張暫存或完整專案後重新匯入時會正確還原（Bug Fix，Commit `ff1d97b`）。

手動換圖：拖曳一張與既有商品完整檔名（含副檔名）相符的新圖片到商品圖區塊，會視為取代該商品，商品角色身份、id 與前後順序皆不變，僅更新圖片內容與檔名；Canvas 立即更新，並整組重新套用排版，換圖後比例、間距、overlap 與商品區域 fit（不超出邊界）皆與其餘兩張商品一致。下載單張暫存並重新開啟後，換圖結果維持一致（Bug Fix，Commit `3269b67`）。同一頁面 session 中切換到其他 Job 再切回，手動換入的圖片與原本大小、位置、旋轉、前後順序仍會保留；快速切換完成後也不會被原始或 processed 圖片覆蓋（Bug Fix，Commit `4ff252f`）。

## 1人＋1品

1人＋1品 Upload Box 下方不顯示「檔名需包含『*人』或『*品』；同角色會替換。」；不保留提示文字空白。「恢復預設位置」按鈕維持原文字與 enabled／disabled 行為，`*人`／`*品` 角色判斷、Upload、Reset 及與商品圖的雙向互斥不變。

Person：

- 由 Template 的 `person.fitWidth` 控制。
- 不支援手動 transform。

SingleProduct：

- 初始尺寸由 `singleProduct.maxWidth / maxHeight` 控制。
- 是否加陰影由 `singleProduct.autoShadow` 控制。
- 支援拖曳、縮放、旋轉與恢復預設位置。

手動換圖（Person／Single Product 皆適用）：拖曳與既有圖片檔名同角色（含 `_人`／`_品`）的新圖片，會視為取代該角色，原地更新圖片內容，不重建 Canvas 元素；Single Product 換圖後會依既有尺寸規則、依新圖比例重新調整大小，換圖前的位置與旋轉角度維持不變，仍可繼續拖曳、縮放、旋轉；Shadow 依 `singleProduct.autoShadow` 正確套用。下載單張暫存並重新開啟後，換圖結果維持一致，不會還原成換圖前的舊圖（Bug Fix，Commit `c390a61`）。同一頁面 session 中切換到其他 Job 再切回，Person 與 Single Product 仍使用各自 Job 的手動換入圖片；Single Product 尺寸不會重新放大（Bug Fix，Commit `4ff252f`）。

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

macOS 正式使用方式：安裝 SPX Helper PKG 後，Helper 位於 `/Applications/SPX Helper.app`。安裝完成會透過已註冊的 LaunchAgent 自動啟動；後續登入會自動啟動，也可從 Applications 手動開啟。Menu Bar 的「Open SPX BN Generator」可開啟正式 GitHub Pages 控制台。Quit 會停止目前登入 Session 的 Helper，且因 LaunchAgent 不使用 `KeepAlive`，不會立刻自動重啟；下次登入或從 Applications 手動開啟才會再次啟動。Product Version 為 `0.5.4`。

控制台名稱：

```text
SPX AD BN生成器
```

Header 固定四個一般使用者入口：

- 匯入CSV
- 匯入暫存
- 選擇素材資料夾
- 素材審核

「匯入暫存」只接受 JSON，支援一次選取一份或多份 single-state JSON。每份 JSON 必須只包含一個 Job；同一批檔案會先依完整檔名 Natural Sort（例如 `1.json`、`2.json`、`10.json`），再依序新增至左側 Job List 尾端。既有 Job 不會被覆蓋或重新排序，之後再次匯入的新批次也只會接續 append；整批完成後會選取本批第一個新增 Job。

每個新增 Job 會分別恢復該 JSON 下載當下的 Placement、Template、Style、`layoutState`／`layoutStates` 與其他既有 single-state 資料。若同 normalized filename 對應不同素材內容，系統會在匯入前拒絕整批；任何檔案解析、格式或素材衝突失敗時，Workspace 不會留下部分新增結果。普通 CSV Workspace 的既有操作方式不變。

左側 Job List 的每張 Job Card 只顯示原本三行文字資訊，不顯示縮圖、placeholder、loading shimmer 或縮圖內 validation dot。Job 點擊、active 狀態、排序、刪除與切換行為不變；缺少素材時仍由既有 validation panel 顯示。第三行與第二行同為 `12px` 及主要文字色，但維持一般字重。

一般控制台可按 `ArrowUp`／`ArrowDown` 依目前 Job List 順序切換上一個／下一個 Job，第一筆與最後一筆不循環。切換使用既有 `selectJob()`；active Job Card 只在左側列表容器內自動捲動，整個頁面不會跟著捲動。焦點位於輸入控制項或按鈕時，以及 Main Canvas iframe、Modal、Editor、Review Workspace、Crop／Eraser等模式中，方向鍵不切換控制台 Job。素材審核選單開啟時仍可切換；素材審核按鈕取得焦點時不切換。

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
├── AD_01.png
├── AD_01.json
├── AD_02.png
├── AD_02.json
├── AD_03.png
└── AD_03.json
```

ZIP 內包含：

- 每個成功 Job 的最終 PNG。
- 與該 PNG 同 basename 的 version 5 single-state JSON；每份 JSON 只包含一個 Job、不包含 `jobs[].thumbnail`，並保存該 Job 既有的完整還原資料。

ZIP 根目錄不包含單一 Project JSON，也不建立 Assets、Processed、Thumbnail、Hidden、Manifest 或其他子資料夾。使用者可從 ZIP 取出任一 JSON，直接使用既有「匯入暫存」重新開啟對應 Job。

### 匯入完整專案中的 Job 暫存

從完整專案 ZIP 取出一份或多份 Job JSON，可一次使用「匯入暫存」加入目前 Workspace；每份 JSON 對應一個新 Job，並恢復：

- Jobs / 文字。
- Placement / Template / Style。
- `layoutState` / `layoutStates`。
- Review decision、Approved processed assets 與 Review Workspace 最後一次 Save 的 processed result。

同批 JSON 依完整檔名 Natural Sort 後 append，既有 Job 不會被覆蓋或重排。匯入後不需要重新 Import Processed Folder。Main Canvas、Thumbnail 與 Batch 會使用各 Job JSON 內恢復的 latest processed image。

### single-state Restore

下載單張暫存用於保存單張工單；輸出檔名與該 Job 的單張 PNG 使用相同 basename，只將副檔名改為 `.json`（例如 `Banner_A.png` 對應 `Banner_A.json`，空 `outputFilename` 使用 `banner.json`）。JSON 不包含僅供舊左側 Job List 縮圖使用的 `jobs[].thumbnail`，也不執行 on-demand thumbnail capture。

匯入後仍會恢復該工單需要的 Placement、Template、Style、assets data URL、processed image、`layoutState`／`layoutStates`、手動換圖、Crop、Eraser、Shadow 與其他既有資料，因此不需要保留原素材資料夾或 processed folder。多選時每份 single-state 只建立一個 Job，並以 Atomic Append 加入既有 Workspace。此流程不變更 Project State schema，也不影響完整專案、Batch Download 或單張 PNG。

### Review Workspace Restore

匯入 single-state（包含從完整專案 ZIP 取出的逐 Job JSON）後，Review Workspace 開啟時會顯示最後一次 Save 的 processed result。

Approved asset 仍可重新進入 Review Workspace 編輯。Crop / Eraser Save 後會覆蓋目前 processed image，不建立版本歷史。

### Latest Save Restore

系統只保存 latest processed image：

- 不保存 v1 / v2 / v3。
- 不另存 `edited.png` 或 `cleaned.png`。
- 新 Photoshop output 或 Review Workspace Save 會覆蓋目前 processed image。

## AI Workflow 使用者流程

「AI Workflow」與「Photoshop Automation」皆已完成 Coding，並通過 macOS Development Manual Validation（Photoshop 2025，Stage 1–4 共 18 項 PASS）。Windows Development Validation 與 Jamie Manual Validation 亦已在 Photoshop 2025 實機 PASS。以下為目前實際使用者流程；其他 Photoshop 版本尚未驗證。

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
