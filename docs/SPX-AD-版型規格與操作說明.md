# SPX AD 版型規格與操作說明

Version: 2026.07.30-manual-image-validation
Last Updated: 2026-07-30
Scope: Banner 版型結構、Style 視覺樣式、素材命名、Template 參數規格與操作流程。

## What's New

- **CSV 匯入版位預設（Commit `d9cf130e8cee6c0f95e520f39a4c5bc1e4d45607`）**：實際入稿表 H6 的合法完整字串會成為此次普通 CSV 匯入的初始版位；H7:H11 仍是各 Job 原有 Style。這只是 Import Default，不會鎖定版位；匯入後仍可自由切換，切換 Job 不會自動切回。空白或非法值不顯示新錯誤或警告，沿用既有 fallback。實際 CSV、四個 mapping、Styles `01`／`02`／`05`／`07`／`10` 與 Jamie Manual Validation 全部 PASS。
- **右側欄手動換圖驗證修正（Commit `8cb7c27c71d664ececb6b57487e921a3f0c44839`）**：對使用者的正式說明維持「手動換圖請使用已完成去背的 PNG，且檔名必須與要取代的圖片完全一致」。每個檔案會先完成檔名、實際格式、decode 與既有圖片預處理，全部成功後才換圖；失敗時原圖保持不變，並在對應 Upload Box 下方顯示紅色錯誤。Runtime 不只看副檔名或 `File.type`，可接受實際內容為有效且可 decode 的 PNG／WebP。完整檔名限制只適用於替換已存在素材；空 Logo slot、未滿三張的商品合法空位，以及尚無 Person／Single Product 時仍可新增。Static Check、Browser Validation、下載／暫存／匯入／完整專案／Batch 回歸與 Jamie Manual Validation 全部 PASS。
- **Windows Photoshop 2026 WebP?PNG ?????????Commit `f37d37e13b0770acab0559dae318576c82458971`?**??????????????? `.png`??? magic bytes ? `RIFF....WEBP`?Photoshop JSX ?? `app.open()` ????????????????? Windows Photoshop 2026 ??? Crash?BEX64 / `0xc0000409`???????????????????? `background_removal_failed`??????????Review Workspace ??????????????????macOS ? Windows ????? JSX ???????????Jamie Manual Validation PASS?

- **AI Workflow 單向審核流程（Commit `8eefbb0924121f3a199c547186306c5eeb722a31`）**：正式流程為 Photoshop First Run → FirstReview →（有 Needs Rerun 時）Photoshop Rerun → SecondReview → Completed。第一輪顯示核准／重新去背／之後手動換圖；第二輪只顯示核准／之後手動換圖，不得產生第三輪。未完成時 Close／Esc 不得離開；Completed 後顯示「AI 去背完成」，不得重新開啟素材審閱。Header 入口與狀態亦同步收斂。Manual Validation A1–E2 與 Code Review 全部 PASS。
- **匯入素材資料夾（Direct Import，Commit `d5a22c86f203d1b5c795d808b1f6eb700a9c13d4`）**：Header 新增第二條素材入口「匯入素材資料夾」，供已完成去背、四周透明的 PNG 直接匯入。資料夾結構與檔名規則需和正式素材資料夾相同；此流程不啟動 SPX Helper、Photoshop 或 AI Workflow，不建立 Processed，也不進入素材審閱。素材完成 Matching 後直接進入既有 Approved Asset Runtime，後續沿用 Asset Resolver、autoTrim、Shadow、Canvas、手動換圖、Job 切換、PNG、單張暫存與完整專案。Jamie Manual Validation 全部 PASS。
- **素材審閱在 Processed 不可用時顯示 Original（Bug Fix，Commit `c21c79e5e762598a35d6368fff5013ffd6ee21df`）**：有可用 Processed 的素材仍預設顯示 Processed；去背失敗、沒有 Processed，或 Processed 讀取失敗時，只要 Original 成功，中央預覽會直接建立 Editor 並顯示 Original，不需要手動切換。Original 讀取失敗維持既有錯誤處理。快速切換素材的既有防競態保護與 Original／Processed 切換不變；Navigator、Decision、Crop、Eraser 及其他流程均未修改。Jamie Manual Validation PASS。
- **素材審閱新增 `skipped` 決策（Commit `c2151987fae163d6e1c8af7f660f2823908846ca`）**：完整移除「撤回上一個決策」。`skipped` 保留 Auto Next，並成為目前 Project 不可解除的 Terminal State；不加入 Needs Rerun、不出現在第二輪 Review，也不進任何 Photoshop Manifest。其目前正式 UI 名稱已由 Commit `8eefbb0924121f3a199c547186306c5eeb722a31` 更新為「之後手動換圖」。
- **已有有效透明背景素材略過 Remove Background（Commit `af30a4106b82e5661ae72d768f6af1141ad632fb`）**：非 Logo 素材由 Photoshop 開啟後會檢查實際影像是否已有有效透明背景；命中時只略過 Remove Background 動作，仍儲存 Processed PNG、回報 success、自動匯入並進入 Matching 與 Review Workspace，Run Report method 為 `existingTransparency`。不依 PNG 副檔名判斷，不透明 PNG 與 JPG 仍正常去背；Logo copy、fallback 與 failure contract 不變。First Run／Needs Rerun、後續 Download、Render、Import／Export 均維持既有流程。Jamie Manual Validation PASS；新版 JSX 已納入 SPX Helper `0.6.1` 的 macOS Local Packaging。
- **Imported Job 切換後保留最後選擇 Style（Bug Fix，Commit `f19364d2fe4aa8f8652c36abbb7f8f2a851765ae`）**：從完整專案取出的 single-state JSON 匯入後，使用者更換 Style，再切換其他 Job 並返回時，Style selector 與 Canvas 都會保留最後選擇，不再恢復成匯入當下的舊 Style。普通 CSV Job 行為不變，Jamie Manual Validation PASS。
- **1人＋1品手動換圖後商品圖區域維持收合（UI Bug Fix）**：修正 Person／Single Product 手動換圖完成後，無 mode 的 accordion defaults 將商品圖區域誤展開。現在初始載入、手動換圖及 Job 切換後，1人＋1品模式下的商品圖區域均維持收合；三商品版型行為不變。Jamie Manual Validation PASS。
- **下載單張暫存精簡（Commit `2c7dca06146b414ec23f29df94d190d8d09d457d`）**：single-state JSON 不再包含 `jobs[].thumbnail`，也不再為縮圖執行 on-demand Canvas capture；檔名改為與單張 PNG 相同 basename、僅使用 `.json` 副檔名。素材 data URL、processed asset、版面、手動換圖及圖片編輯結果均維持可還原。Browser Validation 與 Jamie Manual Validation PASS。
- **左側 Job List 鍵盤導航（Commit `b6d2b8f41015d56f1fd207dcba1145b40ede96ca`）**：一般控制台按 `ArrowUp`／`ArrowDown` 可切換上一個／下一個 Job，首尾不循環；切換沿用既有 `selectJob()`，active Job Card 只在左側列表內自動捲動。輸入控制項、Main Canvas iframe、Modal、Editor、Review Workspace 與 Crop／Eraser等模式中不切換；素材審核選單開啟時仍可切換，按鈕取得焦點時則不切換。Jamie Manual Validation PASS。
- **左側 Job List 縮圖移除（Commit `b67604b037f553fb1ac76d7e320acaa9a6afd970`）**：Job Card 不再顯示縮圖、placeholder、loading shimmer 或縮圖內 validation dot，一般操作也不再背景生成只供左側列表使用的縮圖。原本三行文字資料與 Job 點擊、active 狀態、排序、刪除及切換行為均保留；第三行改為 `12px`、主要文字色與一般字重。該次 Commit 保留既有 thumbnail 行為，後續 single-state thumbnail 已由 Commit `2c7dca0` 獨立移除；缺少素材的 validation panel，以及完整專案／Batch、Project State 的既有行為仍保留。Jamie Manual Validation PASS。
- **Upload Panel stale hint rendering 修正（UI Bug Fix，Commit `e44f65879e3140ba87ecb4c49f5171d291d5e98d`）**：Products／1人＋1品的提示文字容器已移除，但舊 sibling lookup 仍會把商品清單與 Reset button 誤認為提示區並覆寫內容；現已只移除失效的提示文字與顏色寫入。商品排序、角色判斷、Upload、Reset 與雙向互斥均維持原行為，Browser Validation 與 Jamie Manual Validation PASS。
- **手動換圖跨 Job 保留（Bug Fix，Commit `4ff252f`）**：Products、Person、Single Product 使用相同完整檔名手動換圖後，切換到其他 Job 再切回，仍顯示手動換入的圖片；既有大小、位置、旋轉與前後順序依原本 Job layout state 正確保留。快速切換 Job 時可能等待目前 Render 完成，但完成後不會再被原始或 processed 圖片覆蓋。此修正只作用於目前頁面 session，不新增重新整理後的永久保存。
- **SPX Helper Runtime Productization Phase 3 macOS Packaging（Completed）**：macOS 正式產品由 PKG 安裝至 `/Applications/SPX Helper.app`，安裝後立即啟動，之後登入時透過 LaunchAgent 自動啟動；也可從 Applications 手動開啟。正式版本現為 `0.6.1`，交付檔為 `SPX Helper-0.6.1.pkg`；原 `0.5.5` 與既有 GitHub Release 編號衝突，已用新增修正 Commit 更正而未改寫已 Push 歷史。Menu Bar 提供 Running、Open SPX BN Generator、About、Version、Restart 與 Quit。App 不顯示 Dock Icon，也不開啟 Terminal Window。本輪只重新 Local Packaging、不安裝新版 PKG；既有安裝、Helper 啟動與 Jamie Manual Validation 結果均維持 PASS。Bundle ID、Package ID 與 LaunchAgent 不變。Developer ID signing／Notarization 尚未驗證。
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
- Review Workspace UI Upgrade 完成：更新素材審閱操作流程（Navigator、Dynamic Inspector、Decision Area、Completion Screen、Completed Asset Re-entry）。

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
15. [匯入素材資料夾（Direct Import）](#匯入素材資料夾direct-import)
16. [素材審核 / 素材審閱](#素材審核--素材審閱)
17. [AI Workflow 使用者流程](#ai-workflow-使用者流程)
18. [CSV 匯入版位預設](#csv-匯入版位預設)

## 四個尺寸

| 尺寸 | Template | Style |
|---|---|---|
| `984x309` | `templates/984x309/template.json` | `templates/984x309/styles/` |
| `1080x1920` | `templates/1080x1920/template.json` | `templates/1080x1920/styles/` |
| `1599x1080` | `templates/1599x1080/template.json` | `templates/1599x1080/styles/` |
| `3189x3992` | `templates/3189x3992/template.json` | `templates/3189x3992/styles/` |

## CSV 匯入版位預設

實際入稿表的 H 欄同時承載整批版位與各 Job Style：

- H6：此次匯入共用的 batch-level Placement。
- H7:H11：每筆 Job 原有的 Style ID。
- H6 不會建立 Job；H7:H11 維持既有 Style 解析與兩位數正規化。

H6 只接受以下四個完整合法字串：

| CSV 完整值 | placementId | 控制台初始版位 |
|---|---|---|
| `TVBN-智取店` | `tvbn-smart-store` | `TVBN-智取店_1080x1920` |
| `TVBN-一般門市` | `tvbn-standard-store` | `TVBN-一般門市_1599x1080` |
| `繳費機手機號碼輸入畫面下 BN` | `payment-phone-banner` | `繳費機手機號碼輸入畫面下 BN_984x309` |
| `智取店繳費機 BN` | `smart-payment-banner` | `智取店繳費機 BN_3189x3992` |

此值只決定普通 CSV 匯入完成後的初始版位：

- 不是鎖定；版位下拉維持可用，使用者可自由切換。
- 切換其他 Job 後不會自動切回 CSV 初始版位。
- H6 空白或不是上表四個完整值時，匯入仍正常完成，且沿用既有 fallback；不新增錯誤或警告。
- H7:H11 的數字只會作為各 Job Style，不會被當成 Placement。
- JSON 暫存匯出／匯入仍沿用既有 Placement／Template／Style 保存與還原流程，不需要新的欄位或操作。

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

手動換圖請使用已完成去背的 PNG；替換既有 Logo 時，檔名必須與目前 Logo 完全一致，包含大小寫及副檔名。Logo slot 尚無素材時仍可沿用既有規則新增。檔案格式、decode 與白底裁切全部成功後才更新 Logo；失敗時原 Logo 保持不變。

## 文字

主標、小字使用 `ShopeeNotoSans(content)-Medium.ttf`，`fontWeight: 400`。副標依 Template 設定。文字位置、尺寸與行高由 Template 控制；文字顏色由 Style 控制。

控制台右側欄的主標、副標、日期／警語會直接同步目前 Job 與 Canvas，不再提供「套用文字到模板」按鈕：

- 非中文輸入法組字期間，每次輸入即時同步；失焦或按 Enter 亦立即同步，Enter 不會插入換行。
- 中文輸入法 composition 期間不顯示中間字串；選字時按 Enter 不會提前提交，選字完成後立即同步最終文字。
- 既有禁用語、自動替換、允許字元清理、數字／日期格式、Toast、主標 8 字／副標 7 字／日期警語 14 字限制與英數半形字元 0.5 字算法均維持不變。
- 驗證未通過時，Canvas 保留最後合法內容；修正為合法內容後立即恢復同步。自動替換後，欄位、active Job 與 Canvas 顯示相同的清理後內容。
- active Job 的三個文字欄位全部清空時，Canvas 文字亦全部清空。CSV 初始文字套用、文字位置、尺寸、行高與 Style 顏色規則不變。

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

更新時機：貼上網址（自動套用）、Enter、失焦皆會觸發驗證；QRCode 與三個文字欄位的即時同步流程保持獨立。

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

手動換圖請使用已完成去背的 PNG。替換既有商品時，完整檔名必須完全一致，包含大小寫及副檔名；商品未滿三張且有合法空位時，仍可新增不同檔名的新商品。商品已滿三張或指定 slot 已被不同檔名占用時，不允許不同檔名覆蓋。每個新選檔案獨立完成實際格式、decode、autoTrim、shadow 與尺寸計算後才 Commit，不重新處理其他既有商品；失敗檔案不移除或改變原商品，已成功的其他檔案不受影響。成功取代時商品角色身份、id 與前後順序皆不變，僅更新圖片內容與檔名；Canvas 沿用既有排版流程。下載單張暫存並重新開啟後，換圖結果維持一致（Bug Fix，Commit `3269b67`、驗證修正 Commit `8cb7c27`）。同一頁面 session 中切換到其他 Job 再切回，手動換入的圖片與原本大小、位置、旋轉、前後順序仍會保留；快速切換完成後也不會被原始或 processed 圖片覆蓋（Bug Fix，Commit `4ff252f`）。

## 1人＋1品

1人＋1品 Upload Box 下方不顯示「檔名需包含『*人』或『*品』；同角色會替換。」；不保留提示文字空白。「恢復預設位置」按鈕維持原文字與 enabled／disabled 行為，`*人`／`*品` 角色判斷、Upload、Reset 及與商品圖的雙向互斥不變。

1人＋1品模式下，右側「商品圖」區域維持收合，「1人＋1品」區域維持展開。Person 或 Single Product 手動換圖完成後仍沿用 `person_product` mode，不會自動展開商品圖區域；Job 切換及三商品版型原有 accordion 行為不變。

Person：

- 由 Template 的 `person.fitWidth` 控制。
- 可在中央 Canvas 上下微調位置；X 軸固定，不可左右拖曳。
- 不支援縮放或旋轉，也不顯示 Transform handles。
- Template 原始預設 top 是可上移的最上界；可由預設位置向下移動，並可向上移回預設位置，但不可超過該位置。
- 點擊 1人＋1品區塊的「恢復預設位置」會回到 Template 預設 top；拖曳完成與 Reset 均沿用既有 layout state 保存 Person 位置。

SingleProduct：

- 初始尺寸由 `singleProduct.maxWidth / maxHeight` 控制。
- 是否加陰影由 `singleProduct.autoShadow` 控制。
- 支援拖曳、縮放、旋轉與恢復預設位置。

手動換圖（Person／Single Product 皆適用）：請使用已完成去背的 PNG。角色已有素材時，完整檔名必須與目前素材完全一致，包含大小寫及副檔名；只有角色尚無素材時才沿用既有 `_人`／`_品` 規則新增。實際格式、decode、autoTrim、Single Product shadow 與尺寸計算全部成功後才切換 Template mode／Accordion 並更新圖片；失敗時原圖、模式與 Accordion 均不變。Person 仍沿用既有 autoTrim、尺寸、比例與適配方式，換圖完成後位置回到 Template 預設 top，不保留換圖前的垂直微調位置；Single Product 則維持既有尺寸規則，依新圖比例重新調整大小，換圖前的位置與旋轉角度維持不變，仍可繼續拖曳、縮放、旋轉；Shadow 依 `singleProduct.autoShadow` 正確套用。下載單張暫存並重新開啟後，換圖結果維持一致，不會還原成換圖前的舊圖（Bug Fix，Commit `c390a61`、驗證修正 Commit `8cb7c27`）。同一頁面 session 中切換到其他 Job 再切回，Person 與 Single Product 仍使用各自 Job 的手動換入圖片；Person 的目前 Y 位置沿用既有 layout state，Single Product 尺寸不會重新放大（Bug Fix，Commit `4ff252f`、Person 位置控制 Commit `f890e73`）。

手動換圖 Picker 對使用者只宣告 PNG；Runtime 會依實際檔案內容確認 PNG／WebP Magic Number，並要求成功 decode，不以副檔名或 `File.type` 作為唯一依據。JPG／JPEG／GIF／BMP／AVIF、假 PNG、損壞或無法 decode 的圖片均拒絕。錯誤顯示於對應 Upload Box 下方，不使用彈跳視窗；再次選檔、成功或切換 Job 時自動清除。固定訊息如下：

- `換圖失敗，檔名必須與目前素材完全一致。`
- `手動換圖僅支援已完成去背的 PNG，且檔名必須與要取代的圖片完全一致。`
- `圖片損壞無法讀取，原圖片未被更換。`

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

macOS 正式使用方式：安裝 SPX Helper PKG 後，Helper 位於 `/Applications/SPX Helper.app`。安裝完成會透過已註冊的 LaunchAgent 自動啟動；後續登入會自動啟動，也可從 Applications 手動開啟。Menu Bar 的「Open SPX BN Generator」可開啟正式 GitHub Pages 控制台。Quit 會停止目前登入 Session 的 Helper，且因 LaunchAgent 不使用 `KeepAlive`，不會立刻自動重啟；下次登入或從 Applications 手動開啟才會再次啟動。Product Version 為 `0.6.1`。

控制台名稱：

```text
SPX AD BN生成器
```

Header 固定四個一般使用者入口，順序如下：

- 匯入CSV
- 匯入暫存
- 匯入素材資料夾
- 自動去背匯入素材

Header 狀態規則：

- 初始、CSV-only、Direct Import、`Idle`：不顯示素材審核或處理中。
- Photoshop First Run／Rerun 實際執行時：顯示「處理中（N／N）」。
- `FirstReview`／`SecondReview`：顯示素材審核入口。
- `Completed`：隱藏素材審核／rerun，於「已匯入工單（N）」後顯示不可點擊的綠色「AI 去背完成」。
- Header 不顯示「已套用文字」；文字套用與 `bn-text` postMessage 行為不變。

「匯入暫存」只接受 JSON，支援一次選取一份或多份 single-state JSON。每份 JSON 必須只包含一個 Job；同一批檔案會先依完整檔名 Natural Sort（例如 `1.json`、`2.json`、`10.json`），再依序新增至左側 Job List 尾端。既有 Job 不會被覆蓋或重新排序，之後再次匯入的新批次也只會接續 append；整批完成後會選取本批第一個新增 Job。

每個新增 Job 會分別恢復該 JSON 下載當下的 Placement、Template、Style、`layoutState`／`layoutStates` 與其他既有 single-state 資料。若同 normalized filename 對應不同素材內容，系統會在匯入前拒絕整批；任何檔案解析、格式或素材衝突失敗時，Workspace 不會留下部分新增結果。普通 CSV Workspace 的既有操作方式不變。

左側 Job List 的每張 Job Card 只顯示原本三行文字資訊，不顯示縮圖、placeholder、loading shimmer 或縮圖內 validation dot。Job 點擊、active 狀態、排序、刪除與切換行為不變；缺少素材時仍由既有 validation panel 顯示。第三行與第二行同為 `12px` 及主要文字色，但維持一般字重。

一般控制台可按 `ArrowUp`／`ArrowDown` 依目前 Job List 順序切換上一個／下一個 Job，第一筆與最後一筆不循環。切換使用既有 `selectJob()`；active Job Card 只在左側列表容器內自動捲動，整個頁面不會跟著捲動。焦點位於輸入控制項或按鈕時，以及 Main Canvas iframe、Modal、Editor、Review Workspace、Crop／Eraser等模式中，方向鍵不切換控制台 Job。素材審核選單開啟時仍可切換；素材審核按鈕取得焦點時不切換。

素材審核選單只在 `FirstReview`／`SecondReview` 顯示：

- 匯入處理結果
- 重新去背素材（N）
- 開啟素材審核

一般使用者 UI 不顯示 Photoshop / Manifest / Processed Folder 等技術術語。底層素材處理、rerun manifest 與 processed import 能力保留，但不作為一般使用者需要理解的主入口。

## 匯入素材資料夾（Direct Import）

「匯入素材資料夾」是第二條獨立入口，不取代「自動去背匯入素材 → SPX Helper → Photoshop → Processed → 素材審核」。

適用條件：

- 素材已完成去背，圖片四周為透明背景。
- 可匯入素材只接受 PNG；非 PNG 會略過，不轉檔、不去背。
- 素材資料夾結構與檔名規則必須和正式素材資料夾完全相同。
- 請先匯入 CSV／建立 Jobs，再按「匯入素材資料夾」並選擇資料夾。

此入口只取得資料夾 read permission，並直接完成既有 Matching 與 Approved Asset Runtime 建立。它不啟動 SPX Helper、不啟動 Photoshop、不建立 `Processed`、不開啟素材審閱，也不執行 Needs Rerun／Rerun。

成功匯入後，後續操作與 Photoshop 去背並核准完成後相同：沿用既有 Asset Resolver、autoTrim、Shadow、Canvas、自動尺寸與初始定位、手動換圖、移動／縮放／旋轉、Job 切換、PNG 輸出、單張暫存、完整專案及暫存匯入還原。

功能 Commit：`d5a22c86f203d1b5c795d808b1f6eb700a9c13d4`（`feat: add direct transparent asset import`）。Jamie Manual Validation 全部 PASS。

Scope Boundary：本次未修改 `BNAssetResolver`、`BNAssetRenderPayload`、Review Workspace、Photoshop Automation、SPX Helper、任何 `ai-workflow` 模組、Project State v5 schema 或 `qrcode-demo`。

## 素材審核 / 素材審閱

控制台 Header 入口名稱固定為「素材審核」（Control Center UI Upgrade，Locked）；點選「開啟素材審核」後開啟的工作區標題為「素材審閱」（Review Workspace UI Upgrade）。兩者是同一個功能在不同層級的名稱，不是兩個不同功能。

素材處理與審核流程（目前實際行為，AI Workflow 已完成，macOS Development Validated；見下方「AI Workflow 使用者流程」）：

```text
先自行開啟 Photoshop
  ↓
匯入CSV
  ↓
自動去背匯入素材（選擇素材資料夾一次）
  ↓
Photoshop Ready Check
  ↓
Processing Mode（背景自動處理，Control Center 鎖定）
  ↓
自動 Import 並自動開啟素材審核（進入素材審閱工作區，自動選取第一筆）
  ↓
FirstReview：核准 / 重新去背 / 之後手動換圖
```

Control Center 選單內的「匯入處理結果」「重新去背素材（N）」等人工流程仍保留為既有備援入口，未被移除，可獨立於自動化流程使用。

Review Workspace（素材審閱）只檢查 Photoshop processed result。可操作：

- 核准：processed asset 可進入 Main Canvas / Thumbnail / Batch。
- 重新去背：加入 Needs Rerun Collection。
- 之後手動換圖：寫入既有 `skipped` 並 Auto Next；同一 Project 後續改由使用者手動換圖，不再送入 Photoshop。

正式 Review Decision 只有 `approved`、`needs_rerun`、`skipped`。`skipped` 視為 Review 已完成且為目前 Project 的 Terminal State；它不加入 Needs Rerun、不計入「重新去背素材（N）」、不出現在第二輪 Review。`background_removal_failed` 仍只代表 Photoshop 系統處理失敗，與使用者略過不同。

### Navigator（左側）

Navigator 只顯示：

- 檔名
- Review Status（待審閱／已處理／核准／重新去背／略過／去背失敗）
- Dirty Status（尚未儲存的修改以圓點標示）

不顯示 Role、Job ID、Slot、Asset Key、Processed Filename、Mode 等技術 Metadata。

Review Summary（進度、核准數、重新去背數、略過數、去背失敗數）與 Filter 固定在 Navigator 上方，並排顯示：

- `全部素材`
- `待重新去背`
- `去背失敗`（去背失敗獨立分類 Bug Fix 新增；僅列出 Photoshop 從未成功處理過的素材）

### Workspace / Dynamic Inspector（中間與右側）

- 預設畫面為 Navigator + Workspace，Inspector 收合，Workspace 使用剩餘最大空間。
- 點選「裁切」或「橡皮擦」時展開 Dynamic Inspector；儲存或取消後自動收合。
- Dynamic Inspector 依目前工具顯示對應設定（View / 裁切 / 橡皮擦），不顯示素材 Metadata。

### Header 與 Decision Area

- Header 只保留「素材審閱」標題與「關閉」。
- 上一張／下一張不再是 Header 常駐按鈕，但仍可用 Navigator 點選或鍵盤 `←` / `→` 導航；Review Decision Undo 已完整移除。
- 第一輪底部 Decision Area 三顆按鈕同列，由左至右：核准、重新去背、之後手動換圖；三種決策皆保留 Auto Next（非循環導航）。
- 第二輪只顯示核准、之後手動換圖；不顯示或建立 disabled 的重新去背按鈕。
- 已是 `skipped` 的素材維持終態，Decision 按鈕停用，A／R 快捷鍵也不會改寫。
- 去背失敗素材（Photoshop 從未成功處理過）不顯示上述三顆按鈕，改顯示「此素材去背失敗，請回控制台手動更換圖片。」提示文字，並顯示原圖。若 Processed 不存在、為空或讀取失敗，只要 Original 成功，中央預覽會直接以 Original 建立 Editor；有可用 Processed 時仍預設顯示 Processed。

### Completion Screen（全部素材完成審閱）

所有可審閱素材完成 Decision 後顯示 Completion Screen：

- Needs Rerun = 0：顯示「全部素材已完成審閱」與「返回控制台」。
- Needs Rerun > 0：額外顯示「X 個素材待重新去背」與「重新去背素材（X）」。
- 去背失敗 > 0：額外顯示「X 個素材去背失敗，請回控制台手動更換圖片」，無對應 action 按鈕。

第一輪完成判斷使用全域可審閱素材；第二輪只依本輪 Needs Rerun 素材集合判斷。去背失敗素材不計入可審閱素材或完成判斷，也不計入「重新去背素材（N）」的 N。

Completion Screen 不提供 Review Decision Undo。AI Workflow 進入 `Completed` 後不得重新開啟 Review Workspace；`skipped` 維持 Terminal State，不提供解除或改回其他決策。

### 快捷鍵與工具

- 快捷鍵：`A` 核准、`R` 重新去背（僅第一輪）、`←` 上一張、`→` 下一張、`Esc` 關閉。第二輪按 `R` 不得寫入 `needs_rerun` 或觸發 rerun。
- 尚有未完成素材時，右上角「關閉」與 `Esc` 都不得離開，固定提示「請先完成全部素材審核後再關閉。」
- Review Workspace 不提供固定拖曳工具；按住 `Space` 可暫時 Pan，放開後回到原工具。

### 重新去背素材（N）

`重新去背素材（N）` 只可由 `FirstReview` 啟動。點擊後串接 AI Workflow：重新執行一次 Ready Check、重新進入 Processing Mode（Photoshop 全程保持開啟，不重新啟動），完成後自動進入 `SecondReview`，Filter 自動切到「待重新去背」，只顯示本輪重新處理的素材子集，不 Auto Approve。`SecondReview` 不提供重新去背，不得建立第三輪；全部素材完成 decision 後進入 `Completed`。

`skipped` 不屬於 Needs Rerun，因此既有 Rerun Manifest 不會包含它；完整 Photoshop Manifest 也會排除 `status === skipped`。兩種 Manifest schema 均未改變。

重新去背完成後，新的 processed asset 會自動覆蓋上一版 processed asset（同名檔案安全覆蓋），但 original asset 仍保留。完成後會回到 Review Workspace，必須再次核准後才會進入成品渲染。

若原始素材本身需要更換，請使用控制台右側既有素材更換流程，不在 Review Workspace 中換圖。對 skipped 素材手動換圖時，系統會保留 `status: "skipped"` 與 `review.decision: "skipped"`，不得重設為 `pending`。

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
- skipped decision 會以既有 Asset Pipeline record 欄位保存；Project State 維持 version 5，不新增 Object 或 Flag。

同批 JSON 依完整檔名 Natural Sort 後 append，既有 Job 不會被覆蓋或重排。匯入後不需要重新 Import Processed Folder。Main Canvas、Thumbnail 與 Batch 會使用各 Job JSON 內恢復的 latest processed image。

Imported Job 匯入後若由使用者更換 Style，該 Job 會同步保存目前選擇；切換至其他 Job 再返回時，Style selector 與 Canvas 均維持最後選擇，不會重新套用 JSON 匯入當下的舊 Style。此修正不改變 Placement、Template 或普通 CSV Job 的既有行為。

### single-state Restore

下載單張暫存用於保存單張工單；輸出檔名與該 Job 的單張 PNG 使用相同 basename，只將副檔名改為 `.json`（例如 `Banner_A.png` 對應 `Banner_A.json`，空 `outputFilename` 使用 `banner.json`）。JSON 不包含僅供舊左側 Job List 縮圖使用的 `jobs[].thumbnail`，也不執行 on-demand thumbnail capture。

匯入後仍會恢復該工單需要的 Placement、Template、Style、assets data URL、processed image、`layoutState`／`layoutStates`、手動換圖、Crop、Eraser、Shadow 與其他既有資料，因此不需要保留原素材資料夾或 processed folder。多選時每份 single-state 只建立一個 Job，並以 Atomic Append 加入既有 Workspace。此流程不變更 Project State schema，也不影響完整專案、Batch Download 或單張 PNG。

### Review Workspace Restore

匯入 single-state（包含從完整專案 ZIP 取出的逐 Job JSON）後，Review Workspace 開啟時會顯示最後一次 Save 的 processed result。

Approved asset 仍可重新進入 Review Workspace 編輯。Crop / Eraser Save 後會覆蓋目前 processed image，不建立版本歷史。

Project JSON 匯出／匯入會保留 skipped status 與 review decision。匯入新 CSV 代表建立新 Project，會重建 Asset Pipeline State，不沿用上一個 Project 的 skipped。

### Latest Save Restore

系統只保存 latest processed image：

- 不保存 v1 / v2 / v3。
- 不另存 `edited.png` 或 `cleaned.png`。
- 新 Photoshop output 或 Review Workspace Save 會覆蓋目前 processed image。

## AI Workflow 使用者流程

「AI Workflow」與「Photoshop Automation」皆已完成 Coding，並通過 macOS Development Manual Validation（Photoshop 2025，Stage 1–4 共 18 項 PASS）。Windows Development Validation 與 Jamie Manual Validation 亦已在 Photoshop 2025 實機 PASS。以下為目前實際使用者流程；其他 Photoshop 版本尚未驗證。

核心原則：使用者只需在開始前自行開啟 Photoshop；通過 Photoshop Ready Check 後，不需要再操作 Photoshop，也不需要理解 Manifest、Runtime、Processed Folder 或其他技術流程。Photoshop 只是背景素材處理引擎，不是使用者日常操作介面。

非 Logo 素材仍會完整送入 Photoshop 並開圖。若 Photoshop 判斷實際影像已有有效透明背景，只略過 Remove Background 動作，仍輸出 Processed PNG、回報成功、自動匯入並進入素材審閱；系統不會只因為檔案是 PNG 就略過，不透明 PNG 與 JPG 仍正常去背。Logo 原有 copy 規則、去背 fallback、失敗處理、First Run 與 Needs Rerun 流程均不變。

```text
1. 使用者先自行開啟 Photoshop。
2. 使用者開啟 SPX AD 生成器。
3. 匯入 CSV。
4. 點擊「自動去背匯入素材」並選擇素材資料夾（一次；選擇時一併取得後續寫入 Processed／ 所需的權限）。
5. 系統執行 Photoshop Ready Check。
6. 若未通過，顯示「Photoshop 已關閉。請重新開啟 Photoshop。開啟後按「重新檢查」即可繼續。」；使用者開啟 Photoshop 後按「重新檢查」即可繼續，不需要重新選擇 CSV / 素材資料夾。
7. Ready Check 通過後，系統進入 Processing Mode：
   素材處理中（18 / 63）
   請勿操作 Photoshop，
   系統將自動完成背景處理。
   完成後將自動帶入素材審閱。
8. 背景處理期間 Control Center 不可操作（不可修改文字、不可切換工單、不可下載、不可開始新的工作）。
9. 完成後顯示：素材處理完成（停留約 0.8 秒，此時間只屬於 UI 轉場，不是處理完成的判定依據）。
10. 系統自動進入 `FirstReview` 並選取第一筆素材，使用者不需要再按「開啟素材審核」；第一輪提供核准／重新去背／之後手動換圖，以及既有裁切／橡皮擦。
11. Needs Rerun = 0 → 全部 decision 完成後進入 `Completed`。
12. Needs Rerun > 0 → 點擊「重新去背素材（N）」，系統重新執行 Ready Check 後再次進入相同的 Processing Mode（Photoshop 全程保持開啟，不重新啟動），完成後自動進入 `SecondReview`，Filter 固定為「待重新去背」，只顯示本輪重新處理的素材。
13. `SecondReview` 只提供核准／之後手動換圖；不顯示重新去背，`R` 與其他 decision 入口均不得寫入 `needs_rerun`。全部素材完成 decision 後進入 `Completed`，不存在第三輪 Rerun。
14. 返回控制台後隱藏素材審核／rerun 與處理中，顯示不可點擊的綠色「AI 去背完成」；不得重新開啟 Review Workspace 或重新去背。
15. 若有素材去背失敗（去背失敗獨立分類 Bug Fix；Photoshop 從未成功處理過），Completion Screen 另外顯示「X 個素材去背失敗，請回控制台手動更換圖片」；此提示不影響完成判斷，也不計入「重新去背素材（N）」的 N。
```

若過程中發生失敗，畫面會顯示對應復原提示（「Photoshop 已關閉」「素材處理失敗」「無法寫入處理結果」「無法開啟素材審閱」）與對應動作（「重新檢查」「重試」「重新授權」「重新開啟素材審閱」），Global Interaction Lock 持續維持直到復原成功並進入素材審閱；Retry 不會重複觸發 Photoshop，也不會遺漏已成功的部分。部分素材去背失敗（至少一張成功）不顯示上述整批 Recovery 提示——直接進入素材審閱，失敗素材改以「去背失敗」呈現（見上方 Completion Screen 說明）；只有全部素材皆處理失敗時才會顯示「素材處理失敗」與「重試」。

使用者始終只看到工作語言（處理中、素材處理完成、素材審閱、核准、重新去背、之後手動換圖、待重新去背、重新去背素材（N）、AI 去背完成、去背失敗、請回控制台手動更換圖片）與上述核可的復原提示；不會看到 Manifest、Runtime、Processed Folder、executionId 等技術詞彙。「素材處理完成」後直接自動進入素材審閱，不存在獨立的「等待審閱」中繼狀態。

本次 skipped 功能只修改 Browser 端 Review Workspace、Asset Pipeline、Manifest 與 Project JSON 串接；SPX Helper、Python Runtime、Photoshop JSX、Windows／macOS Helper、Ready／Execute／Status Contract、Packaging 與 Installer 均未修改。

Photoshop Automation 與 AI Workflow 責任不重疊：Photoshop 端的 Ready Contract、批次去背、Progress / Completion 狀態回報屬於 Photoshop Automation；Control Center 端的 Manifest 建立與送出、Processing Mode、自動 Import、自動開啟 Review Workspace、Error / Recovery 屬於 AI Workflow。AI Workflow 未重新設計 Navigator、Dynamic Inspector、Decision Area 或 Completion Screen 的架構；已修正兩個既有 UX Bug：完成畫面判斷改為依目前 Filter 是否還有素材、去背失敗獨立分類（新增第三個 Filter 與既有元件內的新增顯示內容，詳見 CHANGELOG）。
