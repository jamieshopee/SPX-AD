# CHANGELOG

## 左側 Job List 鍵盤導航 - 2026-07-20

Status：**Completed — Browser Validation／Jamie Manual Validation PASS**
Code Commit：`b6d2b8f41015d56f1fd207dcba1145b40ede96ca`
Commit subject：`feat: add keyboard job navigation`

- Navigation：一般控制台按 `ArrowUp`／`ArrowDown` 會依 `jobs` array 順序切換上一個／下一個 Job，沿用既有 `selectJob()` 與 Canvas load transaction；首尾不循環，沒有 Job、只有一個 Job 或 active Job 無效時不執行。
- Scroll：真正切換後只調整 `el.jobList.scrollTop`，讓 active Job Card 留在左側 Job List 可視範圍內，不捲動整個頁面。
- Guards：input、textarea、select、button、`role=button`、contenteditable、Main Canvas iframe，以及既有 Modal、Editor、Review Workspace、Crop／Eraser等模式不切換控制台 Job。素材審核選單開啟時仍可切換；素材審核按鈕取得焦點時由 button guard 保護。原有 Escape 與其他快捷鍵不變。
- Validation：一般導航、首尾邊界、大量 Job 左側局部捲動、快速連按後 active Job／欄位／Main Canvas 一致均 PASS；Browser Console errors 0、`node --check src/app.js` 與 `git diff --check` PASS，Jamie Manual Validation PASS。
- Boundary：本次不是新的快捷鍵系統，未新增快捷鍵設定或其他快捷鍵；未修改 Job 排序、Project State、`layoutStates`、Main Canvas Render、Thumbnail、下載、Batch Render 或 Photoshop Pipeline。

## 左側 Job List 縮圖移除 - 2026-07-20

Status：**Completed — Browser Validation／Jamie Manual Validation PASS**
Code Commit：`b67604b037f553fb1ac76d7e320acaa9a6afd970`
Commit subject：`feat: remove job list thumbnails`

- UI：左側 Job Card 不再顯示縮圖、placeholder、loading shimmer 或縮圖內 validation dot；保留原本三行文字資料、Job 點擊、active 狀態、排序、刪除與 `selectJob()` 行為。第一行樣式不變；第三行改為 `12px`、`var(--text-primary)` 與一般字重。
- Runtime：一般操作不再執行只供左側 Job List 使用的 Quick Thumbnail、Active Job Thumbnail Canvas capture、Hidden iframe Thumbnail Queue、Thumbnail DOM 更新與因此觸發的列表重建。
- Preserved：保留 `captureThumb()`、`exportSingleState()` 的 on-demand thumbnail、`batchRender()` 由正式輸出 PNG 建立 `job.thumbnail`、Project State thumbnail 欄位與 import 相容、`generateJobThumbnail()` 函式及既有 cache 資料結構。缺少素材的 validation panel 仍保留；只有縮圖內 validation dot 隨縮圖移除。
- Boundary：未刪除整套 Thumbnail 系統，未處理或宣稱縮小單張暫存／完整專案；該次 Commit 未實作鍵盤上下鍵切換 Job，後續已由 Commit `b6d2b8f` 獨立完成。Main Canvas、Resolver、Render Context、`layoutStates`、Project State schema、正式下載輸出、Batch Render 與 Photoshop Pipeline 均未修改。

## Logo／商品圖素材列編輯按鈕移除 - 2026-07-19

Status：**Completed — Browser Validation／Jamie Manual Validation PASS**
Code Commit：`4a65c1981187ca38784a35cf9b004e0fd284ae2b`
Commit subject：`fix: remove logo and product edit buttons`

- UI：移除右側欄 Logo 與商品圖素材項目的「編輯」按鈕。
- Boundary：Editor 程式與圖片處理能力完整保留；未修改 Upload、手動換圖、商品排序、素材移除、Job Restore、Download、Render、Runtime、State、資料結構或其他圖片流程。

## Upload Panel stale hint rendering 修正 - 2026-07-19

Status：**Completed — Browser Validation／Jamie Manual Validation PASS**
Code Commit：`e44f65879e3140ba87ecb4c49f5171d291d5e98d`
Commit subject：`fix: remove stale upload panel hint rendering`

- Root Cause：Products 與 1人＋1品的提示文字 DOM 容器先前已移除，但 `updateMutualExclusion()` 仍分別以 `prodDrop.nextElementSibling`、`ppDrop.nextElementSibling` 尋找 `prodHint`／`ppHint`。實際 sibling 已變成 `#bn-prod-list` 與「恢復預設位置」Reset button；後續 `textContent` 寫入因此覆寫商品清單 DOM 與 Reset button 文字。
- Fix：只移除失效的 `prodHint`／`ppHint` lookup、文字與顏色寫入；未修改商品排序、商品角色判斷、`*人`／`*品` 角色判斷、Upload、Reset、雙向互斥或其他架構。
- UI Result：商品上傳後，商品列表與編輯／移除／▲／▼排序操作正常保留；Products 與 1人＋1品的舊提示文字不再顯示，且不保留額外空白；兩區「恢復預設位置」按鈕與雙向互斥維持正常。
- Validation：`node --check js/bn-editor-plugin.js` PASS、`git diff --check` PASS、Browser Console errors 0、Codex Browser Validation PASS、Jamie Manual Validation PASS。
- Boundary：本次是 UI Bug Fix，不新增功能、不修改 Architecture；Code Commit 只修改 `js/bn-editor-plugin.js`。

## 手動換圖跨 Job 保留與 Products Render Race 修正 - 2026-07-19

Status：**Completed — Browser Validation／Jamie Manual Validation PASS**
Code Commit：`4ff252f89a5a6662084abe5bb4fb43e3907e56dc`
Commit subject：`fix: preserve manual assets across job switches`

- Root Cause：手動換圖只更新 Canvas DOM 與 `_bnProducts`／`_bnPerson`／`_bnSingleProd` globals，沒有保存到該 Job。切換 Job 時 globals 被清空，切回後重新依 Approved processed asset／original `assetIndex` 建立 payload，因舊 Approved record 已正確失效化，最後回到原始圖片。Products 另有非同步 render race：快速切換時，較早 Job 的 render 可能在 `await` 後繼續寫入目前 Canvas。
- Fix：`src/app.js` 新增 Job-scoped、runtime-only `_manualRenderState`，只保存同一 Job、相同 filename、role／slot 的最終手動 render source 與該素材類型必要尺寸欄位。既有 payload 完整建立後套用同一個 overlay，再依原順序套用 `layoutStates`；沒有 manual entry 的素材仍完整沿用 Approved processed asset → original `assetIndex` 流程。
- Products race：`applyProductsToCanvas()` 的三商品 render 固定綁定呼叫時的 `job`、`loadSeq` 與 `frameWindow`；每個非同步階段後及 globals／message 寫入前檢查 transaction 是否仍有效。Stale render 直接停止，不得清空或覆寫 `_bnProducts`，也不得送出 `bn-product-add`。
- Validation：Products、Person、Single Product 手動同檔名換圖後切換 Job 再切回，圖片均正確保留；Products 的大小、位置、旋轉與 z-order 正確，Single Product 未再放大。Products 快速切換完成後不再被原始／processed asset 覆蓋。Jamie Manual Validation：**PASS**。
- Boundary：只修改 `src/app.js`；未修改 plugin、globals shape、autoTrim、autoShadow、Crop、Eraser、Shadow Editor、Template defaults、`layoutStates`、Approved Asset Resolver、Render Context、Photoshop Pipeline 或 Project State schema。`_manualRenderState` 不處理重新整理頁面後的永久保存。

## Phase 3 macOS Packaging Bug Fix - 2026-07-18

Status：**Completed — Jamie Manual Validation PASS**
Code Commit：`781df79c232a9644cc0bd69653e390ef70d12964`
Commit subject：`fix: launch macOS helper through LaunchAgent`

- Root Cause：PKG `postinstall` 直接使用 `launchctl asuser ... /usr/bin/open "/Applications/SPX Helper.app"` 啟動 Helper，導致 process 繼承 PackageKit 的 `PKInstallSandbox`、`INSTALLER_TEMP`、`INSTALLER_PAYLOAD_DIR`、`SCRIPT_NAME=postinstall` 與 installer `PWD`。Installer 清除 sandbox 後，`POST /execute` 在 `_create_workspace()`／`tempfile.mkdtemp()` 拋出 `FileNotFoundError`，回傳 HTTP 400 `manifest_invalid`。
- Fix：移除 `APP_PATH` 與 `/usr/bin/open`，保留既有 LaunchAgent bootstrap，改以非強制 `launchctl kickstart` 啟動 `gui/$CONSOLE_UID/com.spxad.helper`。不使用 `kickstart -k` 或 `bootout`，不新增 `KeepAlive`；`RunAtLoad = true`、Menu Bar Quit 與 Login Startup 行為不變。
- Validation：shell syntax、macOS static validator、local PKG build、Clean Install 全部 PASS。安裝後 LaunchAgent job running，Helper process／`127.0.0.1:8901` listener 各一，`/ready` 200，正常使用者 `TMPDIR` 存在，environment 不含任何 installer variables。
- Jamie Manual Validation：以正式 GitHub Pages 匯入 5 筆工單、處理 22 個素材，SPX Helper → Adobe Photoshop → Processed PNG 全流程 PASS；安裝後不需手動 Quit 或重新啟動 Helper。
- Scope：只修改 macOS Packaging `postinstall` 與 static validator；未修改 SPX Helper Core、Runtime、Adapter、Browser API、Frontend、Photoshop Automation、Windows Packaging 或 Product Host version。Phase 4、Phase 5 尚未開始。
- Release 狀態不變：Developer ID Application／Installer signing 與 Apple Notarization 尚未驗證；最新正式 Git Tag 仍為 `v0.5.5`，本次不建立 Tag。

## SPX Helper Runtime Productization — Phase 3 macOS Packaging - 2026-07-18

Status：**Completed**
Code Commit：`ee55dd527a00361f1155ba45713ff2ce3957b06c`
Commit subject：`feat: add Phase 3 macOS packaging`

### Completed

- 新增 `tools/photoshop-automation/packaging/macos/` macOS Packaging source，以 PyInstaller 建立正式 `SPX Helper.app`，並以 macOS PKG 安裝到 `/Applications/SPX Helper.app`。
- 正式產品資訊：Product Name `SPX Helper`、Bundle Identifier `com.spxad.helper`、Package Identifier `com.spxad.helper.pkg`、Product Version `0.5.4`。
- App 使用 `LSUIElement = true` 與無 console bundle：提供 Menu Bar 與 Applications 手動啟動入口，不顯示 Dock Icon，不開啟 Terminal Window。
- 新增 `/Library/LaunchAgents/com.spxad.helper.plist` Login Startup；`RunAtLoad = true`，不使用 `KeepAlive`。安裝後立即啟動，登入後自動啟動；Quit 後不在同一登入 Session 自動重啟。
- 新增 macOS Packaging Static Validation、Build Validation 與 Install Validation。

### Validation

- local PyInstaller app build：**PASS**。
- local macOS PKG build：**PASS**。
- local installation validation：**PASS**。
- Jamie Manual Validation：**PASS**。涵蓋 Fresh Install、安裝至 `/Applications/SPX Helper.app`、安裝後立即啟動、LaunchAgent、Package Receipt、Menu Bar、Running、Open SPX BN Generator、About、Version `0.5.4`、無 Dock Icon、無 Terminal Window、GitHub Pages → SPX Helper → Photoshop → Processed PNG、Restart、Quit 與 Login Startup。
- Restart 後只有一個 Helper process 與一個 `127.0.0.1:8901` listener；Quit 後 process／listener 均為 0；重新登入後自動啟動且仍只有一個 process／listener。

### Fixed

- 初次 Fresh Install 發現 PackageKit 將 App relocation 回 build staging。根因為 bundle relocation 行為。
- component plist 明確設定 `RootRelativeBundlePath = Applications/SPX Helper.app` 與 `BundleIsRelocatable = false`；在 staging App 保留的情況下重新驗證後，最終正確安裝至 `/Applications/SPX Helper.app`，relocation 不再發生，Fresh Install PASS。

### Credential-dependent Validation

- Developer ID Application signing：尚未驗證。
- Developer ID Installer signing：尚未驗證。
- Apple Notarization：尚未驗證。
- 原因：目前機器沒有有效 signing identities／notary credentials。本 Phase 不宣稱正式簽署或 Notarization PASS。

### Scope Boundary

- 未修改 SPX Helper Core、Runtime Contract、HTTP API、Browser API、Frontend、GitHub Pages、Photoshop Automation、AI Workflow 或 Windows Packaging。
- Phase 4 Update + Uninstall 與 Phase 5 Final Validation 尚未開始。
- Product Host version 維持 `0.5.4`；最新正式 Git Tag 仍為 `v0.5.5`。本次 Phase 3 Docs Update 不建立新 Tag，也不決定下一個 Tag。

## SPX Helper Runtime Productization — Phase 2 Windows Packaging - 2026-07-17

### Completed

- 新增 `tools/photoshop-automation/packaging/windows/` Windows Packaging source，以 PyInstaller 封裝既有 `spx_helper_product.py` Product Host，並以 WiX Toolset SDK 5.0.2 建立 per-machine MSI。
- MSI 包含 Fresh Install、安裝後立即啟動、Windows Run 登入自動啟動、Start Menu Shortcut 與 Apps & Features 標準產品資訊；不包含 EXE Bootstrapper、Auto Update、Version Check 或自訂 Uninstaller。
- WiX v7 的 OSMF 條件不符合本專案不需額外付費的 Packaging 要求，因此固定採用 WiX Toolset SDK 5.0.2。
- 功能 Commit：`9240504`（`feat: add Phase 2 Windows packaging`）。

### Validation

- Windows Packaging configuration validation、Product Foundation validation、PyInstaller EXE Build 與 WiX MSI Build／Install：**PASS**。
- 背景常駐、System Tray、Tray Menu 與 Running 狀態：**PASS**。
- Jamie Manual Validation：GitHub Pages → SPX Helper → Photoshop → Processed PNG 正式流程 **PASS**。

### Known Issue

- 同一 Windows 環境中，Version／About Information Dialog 與部分 Installer Dialog 的 OK、Esc、X 關閉事件異常。目前不認定為 Packaging regression；不影響 Runtime、Browser API、Photoshop Automation 或正式去背流程，另案處理。
- 未完成 Windows 實機驗證的 MessageBox daemon-thread 修改已撤回，不包含於本次功能 Commit。

### Scope Boundary

- 未修改 SPX Helper Core、Product Host lifecycle、Runtime Contract、Browser API、Frontend、Photoshop Automation 或 Platform Adapter。
- 此為 Phase 2 完成當時的 Scope Boundary：Phase 3 macOS Packaging、Phase 4 Update + Uninstall 與 Phase 5 Final Validation 當時尚未完成。Phase 3 後續已完成，現況見本文件頂端。

## SPX Helper Runtime Productization — Phase 1 Foundation - 2026-07-17

### Completed

- 新增 `tools/photoshop-automation/spx_helper_product.py`，作為既有、未修改 `spx_helper.py` Core 外層的正式 Product Host。Foundation lifecycle 包含 Running／Working／Attention、固定 `127.0.0.1:8901` 單一 Helper Instance、Tray／Menu Bar、Open SPX BN Generator、About、Version、Restart 與 Quit。
- 新增 `tools/photoshop-automation/validate_spx_helper_product.py`，驗證 Product Host 啟動、Idle → Running、Working 進出、Attention、既有 Ready Contract、第二次啟動不建立第二個 RuntimeCore、固定選單、Quit、Restart 與 Working 警告。
- 新增 `tools/photoshop-automation/requirements-product.txt`，固定 Phase 1 Product Host 的跨平台 Tray／Menu Bar 開發依賴；正式打包仍由後續 Windows／macOS Packaging Phase 處理。
- Code Commit：`51c4828`（`feat: add SPX Helper product foundation`）。

### Validation

- Browser／Platform Validation：**PASS**。正式 GitHub Pages 可正常載入；macOS Product Host 成功執行，僅一個產品 Process 與一個 `127.0.0.1:8901` listener；既有 Helper HTTP／Runtime Contract regression validation 全數 PASS。
- Jamie Manual Validation：**PASS**。Menu Bar、Running／Working／Running、正式 GitHub Pages、About、Version `0.5.4`、Working 警告、Restart 與 Quit 全數通過；Happy Path 去背正常完成，無 Regression。
- Restart 完整驗證：舊 PID `6818` 停止、新 PID `9905` 啟動，僅一個產品 Process 與一個 `127.0.0.1:8901` listener，Restart 後 Browser 可正常使用。

### Scope Boundary

- 本 Phase 未修改 SPX Helper Core、Runtime Contract、Browser API、Frontend、HTTP API、Platform Adapter、Photoshop Automation、AI Workflow、Review Workspace 或 Processed Pipeline。
- 本 Phase 不包含 Installer、Windows MSI、macOS PKG、登入自動啟動、Update、Uninstall、Signing、Notarization、Authenticode 或 Final Validation；這些項目依後續 Phase 分開完成與驗證。

## SPX Helper Core - 2026-07-17

### Added

- 新增 `tools/photoshop-automation/spx_helper.py`，作為正式產品架構的 localhost 邊界：固定監聽 `127.0.0.1:8901`、驗證正式 GitHub Pages Origin `https://jamieshopee.github.io`、處理 CORS／OPTIONS，並直接委派既有 Runtime HTTP handler。
- SPX Helper 內部建立並沿用既有 RuntimeCore 與 Platform Adapter；Ready／Execute／Asset Upload／Status／Result Contract、Frontend、RuntimeCore 行為、macOS Adapter、Windows Adapter、Photoshop Automation、AI Workflow、Review Workspace 與 Processed Pipeline 均未修改。
- 固定 port bind 作為單一 Helper 實例邊界；停止後可建立全新的 Helper／RuntimeCore 實例重新啟動。
- 新增 `tools/photoshop-automation/validate_spx_helper.py`，覆蓋允許／拒絕 Origin、CORS／OPTIONS、Runtime Contract response mapping、單一實例、停止後重啟與真實 RuntimeCore pass-through。功能 Commit：`9a71794`。

### Validation

- macOS Jamie Manual Validation：Helper 啟動、Browser → Helper、Ready、Execute、`photoshop-run-report.json`、Processed PNG，以及 Helper 重啟後再次 Execute，全部 PASS。
- Windows Jamie Manual Validation：Helper 啟動、Browser → Helper、Ready、Execute、RuntimeCore、Windows Adapter、Runtime Contract 與 `photoshop-run-report.json`，全部 PASS。
- Windows 該次筆電環境在 Photoshop Remove Background／Select Subject 執行階段發生既有 Photoshop API 問題。Root Cause Analysis 已確認不是 SPX Helper、RuntimeCore、Windows Adapter 或共用 `remove-background.jsx` regression；此問題另案處理，不納入 SPX Helper 收尾。

### Scope Boundary

- 本次只完成 SPX Helper Core。installer、OS login auto-start、auto update、code signing、notarization、Authenticode、release packaging、Runtime recovery、AI Workflow recovery 與執行中 Photoshop 工作恢復均未實作，需後續各自 Proposal。
- 正式產品架構維持 GitHub Pages → SPX Helper → Adobe Photoshop → Processed PNG；macOS 與 Windows 共用同一套 Helper 架構與既有 Runtime Contract。

## Windows DoJavaScript full-script entry - 2026-07-16

- Windows Runtime 改為每次 `execute()` 以 UTF-8 讀取單一共用的 `tools/photoshop/remove-background.jsx`，以 `json.dumps()` 注入 `manifestPath`、`originalFolder`、`outputFolder`，再透過 `app.DoJavaScript(full_script)` 執行完整 JavaScript 字串。macOS 現有 AppleScript 流程、Runtime Contract、Processed Pipeline 與正式產品架構均未改變。
- `DoJavaScriptFile()` 為已完成實機驗證且失敗的歷史方案，不再採用；未建立 Windows 專用 JSX 副本。
- Windows Validation：PASS。Jamie Manual Validation：PASS。真實 Windows + Photoshop 2025 環境已成功產生 `photoshop-run-report.json` 與 Processed PNG。此項是當時的 JavaScript Entry 驗證；後續 Phase 2 Windows Packaging 狀態見本文件頂端。

Version: v0.5.5（Product Host `0.5.4`；SPX Helper Runtime Productization Phase 3 macOS Packaging Completed；Next: Phase 4 — Update + Uninstall）
Last Updated: 2026-07-18
Scope: 專案版本紀錄與重要設計決策。此文件不是 Git commit log，而是維護者交接用版本紀錄。

## What's New

- **手動換圖跨 Job 保留與 Products Render Race 修正（Bug Fix，Commit `4ff252f`）**：Products、Person、Single Product 的同檔名手動換圖會保存於各自 Job 的 runtime-only manual render state；切換 Job 後優先 overlay 該 Job 的手動圖片，原有 `layoutStates` 繼續保存位置、尺寸、旋轉與 z-order。Products 的非同步 render 固定綁定 `job`／`loadSeq`／`frameWindow`，stale transaction 不得寫入 globals 或 Canvas message。Browser Validation 與 Jamie Manual Validation 均 PASS。
- **SPX Helper Runtime Productization Phase 3 macOS Packaging 完成（功能 Commit `ee55dd527a00361f1155ba45713ff2ce3957b06c`）**：新增正式 `SPX Helper.app` 與 macOS PKG build pipeline；Fresh Install、Login Startup、Menu Bar、Restart／Quit 及 GitHub Pages → Helper → Photoshop → Processed PNG 均 PASS。Developer ID／Notarization 仍是尚未驗證的 Credential-dependent validation；下一步為 Phase 4 — Update + Uninstall（Not Started）。
- **SPX Helper Runtime Productization Phase 2 Windows Packaging 完成（功能 Commit `9240504`）**：新增 PyInstaller executable bundle 與 WiX Toolset SDK 5.0.2 per-machine MSI；Windows Packaging configuration、MSI Build／Install 與 GitHub Pages → Helper → Photoshop → Processed PNG 均 PASS。
- **SPX Helper Runtime Productization Phase 1 Foundation 完成（功能 Commit `51c4828`）**：新增 Product Host、Running／Working／Attention、單一 Helper Instance、固定 Tray／Menu Bar、Quit 與 Restart；Browser／Platform Validation 與 Jamie Manual Validation 均 PASS。
- **SPX Helper Core 完成（功能 Commit `9a71794`）**：新增正式 localhost 邊界、Origin／CORS、單一實例邊界與既有 RuntimeCore Integration；macOS／Windows Jamie Manual Validation 已完成。Windows 與 macOS installer／auto-start／packaging 已由 Phase 2、Phase 3 完成；Update／Uninstall 與 Final Validation 仍待後續 Phase。
- **一人一品（Person + Single Product）手動換圖修正（Bug Fix，Commit `c390a61`）**：修正三個相關問題。(1) 手動換圖後下載單張暫存並重新匯入，畫面還原成換圖前的舊圖：原因是換圖只更新畫布內容，從未讓 Approved Asset Pipeline 內對應該角色（Person／Single Product）仍標示 `approved` 的舊 record 失效，重新匯入後 Approved Asset Resolver 會用舊 record 蓋過剛內嵌的新圖；修正後沿用三商品既有的 `window._bnInvalidateApprovedAssetForManualReplace()` 機制，新增 `role` 參數（`'person'`／`'singleProduct'`，三商品預設值 `'product'` 不變），換圖後精確失效化對應那一筆 record。(2) Single Product 手動換圖後 Handle 消失、無法拖曳／縮放／旋轉：原因是換圖流程每次都會清空並重建整個 Canvas box，先前已綁定的拖曳／縮放／旋轉事件跟著被移除；修正後改為原地更新既有 box（只換圖片內容，不清空、不重建 DOM），並依 Single Product 既有尺寸規則（在 `maxWidth`／`maxHeight` 內依新圖比例 contain 縮放）更新 box 尺寸，以換圖前的中心點反推新位置，換圖前的位置與旋轉角度維持不變。(3) Single Product 手動換圖後 Shadow 消失：原因是換圖判斷 `autoShadow` 讀取的是 `window.__BN_TEMPLATE__`——一個透過 `selectJob()`／`selectStyle()` 內未 await 的 `.then()` 非同步指派、換圖當下可能仍是 `null` 的全域變數；修正後改用與三商品同一套、可靠的 `window._bnGetActiveTemplateJson()`。三商品、Person 分支、下載單張暫存／完整專案的匯出邏輯本身均未修改。
- **三商品手動同檔名換圖保留 Product Identity（Bug Fix，Commit `3269b67`）**：修正手動拖曳同檔名圖片取代三商品其中一張時，商品會被當成全新商品處理（移除既有商品、產生新 id、Canvas DOM 重建）的問題。修正後：以完整檔名（含副檔名）比對既有商品，比對到者原地更新圖片來源與 filename，id 不變，不 remove／不 re-add；Canvas 對應 DOM box 就地更新圖片並立即整組重新排版，換圖後比例、間距、overlap 與商品區域 fit（不超出邊界）皆與其餘兩張商品一致；換圖判斷 autoShadow 改用與初次置入相同的 Template 來源，避免讀到尚未載入的舊值；下載單張暫存並重新開啟後，換圖結果維持一致（不會被重複處理造成陰影疊加或整組尺寸跑掉）。
- **三商品前後順序（z-order）與角色身份（position）解耦（Bug Fix，Commit `ff1d97b`）**：修正調整三商品位置／大小／旋轉／前後順序時，商品角色身份（主品／左配品／右配品）會與前後順序互相影響，造成 Canvas、右側商品清單、layoutState、single-state 之間身份錯亂的問題。修正後：`position` 永遠代表商品角色身份，`zOrder` 只代表視覺堆疊順序（誰蓋住誰），兩者互不影響；右側商品清單依 Layer（zOrder）順序顯示，角色標籤仍依 position 顯示；`zOrder` 正確保存於 single-state，重新匯入後立即正確還原，不需使用者先手動操作一次 ▲／▼ 才會更新。三商品 Smart Layout Propagation、Project Persistence、Batch Render、Approved Asset Resolver 皆已 Regression 驗證不受影響。
- **QR Code 完成 Final Sign-off（功能 Commit `79de045`、Tag `v0.5.2`）**，正式列入 Locked Completed Phases。每個 Job 依 CSV 的 `QRcode` 欄位網址自動產生 QR Code，並可於控制台右側欄手動修改；詳見下方新增章節與 `docs/proposals/QR-Code-Product-Proposal.md`、`docs/proposals/QR-Code-Implementation-Proposal.md`。目前 Active Phase 回到 **None（Waiting for next Proposal）**；Next Planned Phase Order（Photoshop Automation → AI Workflow → Render Context & Export Workflow → QR Code）已全數完成，下一個 Phase 待 Product Owner 另行提出 Proposal。
- **去背失敗獨立分類（Bug Fix，Commit `289ac76`）**：解決批次去背中「只要有素材失敗，整個流程就卡住、只能整批重試」的問題。詳見下方新增章節與 `docs/proposals/Background-Removal-Failure-Classification-Proposal.md`。
- **Render Context & Export Workflow 完成 Final Sign-off（功能 Commit `2ac6546`、Tag `v0.5.1`）**，正式列入 Locked Completed Phases。Windows Validation 為獨立的 Deferred Validation Item（Waiting for Windows Validation Environment），不是 Current 或 Next 開發 Phase；Production Deployment 尚未開始，同樣不是 Current 或 Next。
- **Photoshop Automation 與 AI Workflow 完成 Final Sign-off（Tag `v0.5.0`）**，正式列入 Locked Completed Phases。
- **Photoshop Automation 與 AI Workflow 完成 Coding，通過 macOS Development Manual Validation（Photoshop 2025，Stage 1–4 共 18 項 PASS）**。Windows Validation 為 Deferred（Waiting for Windows Validation Environment），不宣稱已支援 Windows 或所有 Photoshop 版本。詳見下方新增章節。
- Review Workspace UI Upgrade 完成：Navigator Information Architecture 簡化、Workspace Layout 與 Dynamic Inspector 改版、Decision Area 三顆按鈕同列、Completion Screen 與 Completion Recovery、Review Workspace 正式中文化。
- Control Center UI Upgrade 完成：Header 簡化為一般使用者入口，素材審核整合狀態與入口，中央版位下拉只調整 display order。
- Project Persistence 完成：Project State v5、Persistence Layer、single-state / project.zip restore 與 Download Complete Project。
- Review Workspace UX Polish 完成：Auto Next、Multi-pass Review、Review Progress Header、Smart Entry、Keyboard Shortcuts、Decision Guard 與 Remove Drag Tool。
- Photoshop Rerun Automation 完成：Needs Rerun Collection、Rerun Manifest、Latest Processed overwrite 與 Review return loop。
- Review Workspace（Crop / Eraser）完成：Full-screen Workspace、Crop、Eraser、Save Runtime Processed Asset 與 Unsaved Changes Guard。
- 新增 v0.3.6 Smart Layout Propagation：Per-Job runtime-only Master Layout 與 Products Zone Auto Fit。
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

1. [手動換圖跨 Job 保留與 Products Render Race 修正](#手動換圖跨-job-保留與-products-render-race-修正---2026-07-19)
1. [SPX Helper Runtime Productization — Phase 3 macOS Packaging](#spx-helper-runtime-productization--phase-3-macos-packaging---2026-07-18)
1. [SPX Helper Runtime Productization — Phase 2 Windows Packaging](#spx-helper-runtime-productization--phase-2-windows-packaging---2026-07-17)
1. [SPX Helper Runtime Productization — Phase 1 Foundation](#spx-helper-runtime-productization--phase-1-foundation---2026-07-17)
1. [SPX Helper Core](#spx-helper-core---2026-07-17)
1. [一人一品手動換圖修正](#一人一品手動換圖修正---2026-07-15)
1. [三商品手動同檔名換圖保留 Product Identity](#三商品手動同檔名換圖保留-product-identity---2026-07-15)
1. [三商品前後順序與角色身份解耦](#三商品前後順序與角色身份解耦---2026-07-14)
1. [QR Code](#qr-code---2026-07-14)
1. [去背失敗獨立分類](#去背失敗獨立分類---2026-07-13)
1. [Render Context & Export Workflow](#render-context--export-workflow---2026-07-12)
1. [AI Workflow / Photoshop Automation](#ai-workflow--photoshop-automation---2026-07-12)
2. [v0.4.5](#v045---2026-07-11)
2. [v0.4.4](#v044---2026-07-10)
3. [v0.4.3](#v043---2026-07-09)
4. [v0.4.2](#v042---2026-07-09)
5. [Photoshop Rerun Automation](#photoshop-rerun-automation---2026-07-09)
6. [Review Workspace（Crop / Eraser）](#review-workspacecrop--eraser---2026-07-09)
7. [v0.3.6](#v036---2026-07-08)
8. [v0.3.5](#v035---2026-07-07)
9. [v0.3.4](#v034---2026-07-06)
10. [v0.3.1](#v031---2026-07-05)
11. [Documentation](#documentation)
12. [Phase 2D-2B-2](#phase-2d-2b-2---thumbnail-render-context)
13. [2026.07.04-u](#20260704-u)
14. [2026.07.02-t](#20260702-t)
15. [2026.07.01-s](#20260701-s)
16. [2026.06.30-r](#20260630-r)
17. [Design Decisions](#design-decisions)
18. [建議後續可優化項目](#建議後續可優化項目)

## 一人一品手動換圖修正 - 2026-07-15

### Fixed

Bug Fix。一人一品（Person + Single Product）手動換圖有三個相關問題：(1) 下載單張暫存並重新匯入後，畫面還原成換圖前的舊圖；(2) Single Product 換圖後 Handle 消失、無法拖曳／縮放／旋轉；(3) Single Product 換圖後 Shadow 消失。

修正內容：

- `src/app.js`：`window._bnInvalidateApprovedAssetForManualReplace(filename, slot)` 新增第三個參數 `role`（預設值 `'product'`，三商品既有呼叫端行為不變），內部原本寫死的 `role: 'product'` 改讀這個參數。
- `js/bn-editor-plugin.js`：`handlePersonProductFiles()` 的 Person 分支換圖後新增呼叫 `window._bnInvalidateApprovedAssetForManualReplace(fname, null, 'person')`；Single Product 分支換圖後新增呼叫同一函式、帶入 `role:'singleProduct'`，兩者皆精確失效化 Approved Asset Pipeline 內對應那一筆 record，避免 Approved Asset Resolver 在重新匯入後用舊 record 蓋過剛內嵌的新圖。同一個 Single Product 分支內，另外改用既有、可靠的 `window._bnGetActiveTemplateJson()` 重新取得 `singleProduct` 的 `autoShadow`／`maxWidth`／`maxHeight` 設定，取代原本讀取、換圖當下可能仍是 `null` 的 `window.__BN_TEMPLATE__`，確保 `autoApplyShadow()` 穩定執行。
- `js/canvas-entry.js`：`bn-single-product-add` 訊息處理新增判斷，若 Canvas 端既有 Single Product box 已存在（換圖情境），改為原地更新既有 box 內的圖片（不清空、不重建 DOM、不重新綁定拖曳／縮放／旋轉），並依既有尺寸規則（在 `maxWidth`／`maxHeight` 內依新圖實際比例 contain 縮放）更新 box 尺寸，以換圖前的中心點反推新位置，換圖前的位置與旋轉角度維持不變；box 尚不存在時（初次帶入）維持既有清空／重建流程不變。

### Not Changed（Boundaries Reaffirmed）

- 未修改 Project State schema、未新增任何持久化欄位。
- 未修改 `js/asset-resolver.js`、`js/asset-pipeline-state.js`、Approved Asset Resolver 比對邏輯本身、`autoApplyShadow()` 演算法本身。
- 未修改三商品換圖流程、下載單張暫存與下載完整專案的匯出邏輯。

修改檔案：`src/app.js`、`js/bn-editor-plugin.js`、`js/canvas-entry.js`。功能 Commit `c390a61`。

## 三商品手動同檔名換圖保留 Product Identity - 2026-07-15

### Fixed

Bug Fix。修正手動拖曳同檔名圖片取代三商品其中一張時，商品被當成全新商品處理（移除既有商品、產生新 id、Canvas DOM 重建），導致身份與整組排版（比例／間距／overlap／商品區域 fit）受影響的問題；以及換圖判斷 autoShadow 使用的 Template 來源與初次置入不一致，可能讀到尚未載入完成的舊值；以及下載單張暫存並重新開啟後，已處理過的圖片被重新匯入流程誤當原始素材再處理一次，造成陰影疊加、整組尺寸跑掉。

修正內容：

- `js/bn-editor-plugin.js`：新增 `findExistingProductByFilename()`，以完整檔名（含副檔名，不分大小寫）比對既有商品；比對到者不再走「全新上傳」流程，改由新增的 `replaceExistingProductImage()` 原地更新圖片來源、`filename`、`ratio`、`baselineRatio`，id 與 `position`／`zOrder` 不變。換圖後呼叫既有 `broadcastZOrder()`，確保整組前後順序與換圖前一致。
- `js/layout-runtime.js`：新增 `bn-product-image-update` handler，只更新既有 DOM box 的圖片來源與 dataset，清除三張商品的 `userAdjusted` 後呼叫既有、未修改的 `layoutProducts()`，讓三商品一起重新計算排版，換圖後比例、間距、overlap、fit 商品區域皆與其餘兩張一致。
- `src/app.js`：新增 `window._bnGetActiveTemplateJson()`，直接回傳目前 `activeTemplate._json`，取代原本手動換圖讀取、可能尚未載入完成的 `window.__BN_TEMPLATE__`；新增 `window._bnInvalidateApprovedAssetForManualReplace()`，手動換圖後精確失效化 Approved Asset Resolver 內對應該商品 slot 的既有 record（僅調整 `status`／`processedAsset`／`review` 欄位），避免重新套用舊的已核准素材蓋過新換入的圖片；`cloneJobForExport()` 新增優先內嵌 `product.manualReplaceRawSrc`（換圖當下、autoTrim／autoShadow 處理前的原始圖片，runtime-only，與 Crop/Eraser/Shadow Editor 專用的 `baseSrc` 無關），避免下載單張暫存並重新開啟後被重複處理。

### Not Changed（Boundaries Reaffirmed）

- 未修改 Project State schema、未新增任何持久化欄位；`manualReplaceRawSrc` 僅為 runtime-only 屬性。
- 未修改 `js/asset-render-payload.js`、`js/asset-processing.js`、`js/asset-resolver.js`、`layoutProducts()` 本身、Bug #1 的 position／zOrder 邏輯（Commit `ff1d97b`）。
- 全新商品上傳（未比對到既有商品）流程不變。

修改檔案：`js/bn-editor-plugin.js`、`js/layout-runtime.js`、`src/app.js`。功能 Commit `3269b67`。

## 三商品前後順序與角色身份解耦 - 2026-07-14

### Fixed

Bug Fix。修正三商品調整位置／大小／旋轉／前後順序（z-order）時，商品角色身份（主品／左配品／右配品）可能被 Canvas、layoutState、右側商品清單、single-state 之間錯亂對應的問題。

Root Cause：`window._bnProducts[]` 的 `position`（角色身份，理應固定不變）與 `zOrder`（視覺堆疊順序，理應可自由調整）過去被前後順序（▲／▼）按鈕當作同一件事處理，點擊時會連帶互換 `position`，導致角色身份跟著位移；另外 `zOrder` 欄位在 single-state 匯出／匯入後未被同步還原，需使用者手動操作一次 ▲／▼ 才會更新為正確值。

修正內容：

- `js/bn-editor-plugin.js`：前後順序（▲／▼）按鈕改為只互換 `zOrder`，不再互換 `position`；右側商品清單改為依 `zOrder`（Layer 順序）排序顯示，每一列的角色標籤仍固定依該商品的 `position` 顯示，兩者不互相影響。
- `src/app.js`：收到 `bn-layout-state` 訊息、還原每個商品的 Canvas transform 時，同步依已還原的 `zIndex` 重新推導正確的 `zOrder`，並立即重繪右側商品清單，不需使用者先手動操作一次 ▲／▼ 才會更新。

### Not Changed（Boundaries Reaffirmed）

- 未修改 `js/layout-runtime.js`、初始化流程與 Project State schema；`layoutStates` 內既有的 `zIndex` 欄位與還原機制不變。
- 未新增任何欄位；`zOrder` 屬既有 runtime 欄位，僅修正其產生與還原時機。
- 三商品 Smart Layout Propagation（Master Layout）、Project Persistence、Batch Render、Approved Asset Resolver 皆已 Regression 驗證不受影響。

修改檔案：`js/bn-editor-plugin.js`、`src/app.js`。功能 Commit `ff1d97b`。

## QR Code - 2026-07-14

### Added

新功能（Next Planned Phase Order 第 4 項，Completed）：每個 Job 擁有一組 QR Code，由 CSV 的 `QRcode` 欄位網址自動產生，使用者可於控制台右側欄修改網址，系統依網址重新產生 QR Code；不使用使用者自行準備的 QR Code 圖片。詳見 `docs/proposals/QR-Code-Product-Proposal.md`（Product Proposal，Freeze Final）與 `docs/proposals/QR-Code-Implementation-Proposal.md`（Implementation Proposal）。

- **CSV**：新增欄位比對，找到清理後（移除欄名換行後的第一行）**剛好等於** `QRcode`（不分大小寫）的欄位，內容視為網址。刻意不使用「包含 QRcode 字樣」的寬鬆比對：真實入稿表同一列裡還有「QRcode統一導shop...」「QRcode雲端(SPX填寫)」「QR code 圖檔名稱」等 SPX 內部後續流程欄位，同樣含 QRcode 字樣，寬鬆比對會被這些欄位（通常是空的）覆蓋掉，導致使用者實際填寫的網址欄位讀不到。
- **Library**：使用 `soldair/node-qrcode`（MIT License），與既有的 `tools/qrcode-demo/`（技術驗證 demo）共用同一份已驗證的 vendored library 檔案，不重複存放、不各自維護版本。
- **網址驗證**：自動 trim 前後空白；輸入若含任何空白字元一律視為非法（避免瀏覽器 `URL` 建構子把空白靜默轉成 `%20`、把明顯不是網址的文字誤判為合法）；未含 Protocol（例如 `shopee.tw`）自動補上 `https://` 後再驗證；不限制網域、是否縮網址、是否帶參數或網址類型。合法網址一律以補完 Protocol 後的版本為準，控制台輸入框、Project State、QR Code 產生與「檢查網址連結」四處皆使用同一個補完後的值。
- **控制台右側欄**：新增 QRCode 區塊，固定順序為主標／副標／小字之後、Logo 之前；包含標題、網址輸入框、檢查網址連結、狀態訊息（固定保留於輸入框下方，有狀態時顯示文字、無狀態時保持空白）。更新時機固定為貼上網址（自動套用）、Enter、失焦；不提供 QR Code 縮圖、位置／尺寸／比例資訊、拖曳、縮放、旋轉或樣式設定，獨立於既有「套用文字到模板」按鈕之外。
- **Template**：四個尺寸新增 `qrZone`（固定 X／Y／Width／Height，不可拖曳／縮放／旋轉）與 `layerOrder.qrCode = 48`（固定位於既有 `info` 圖層［47］之上）。Locked Visual Baseline（已包含 Quiet Zone 與黑碼）：

  | 尺寸 | X | Y | W | H |
  |---|---|---|---|---|
  | 984×309 | 880 | 183 | 85 | 85 |
  | 1080×1920 | 46 | 1667 | 165 | 165 |
  | 1599×1080 | 82 | 808 | 175 | 175 |
  | 3189×3992 | 151 | 3213 | 500 | 500 |

- **外觀**：固定黑碼、白底；固定使用 Error Correction Level `M`，不提供使用者調整。
- **Project State**：`job.qrCodeUrl` 直接以字串欄位保存於 Project State，`single-state.json` 匯出／匯入與 `project.zip` 皆會保存並正確還原最後修改的網址；不透過 `_embeddedAssets` 或 processed asset 機制（QR Code 為網址驅動、即時產生，不存在「即時畫布 vs 工單資料不同步」的問題，與既有 Logo／商品圖 asset 機制無關）。
- **匯出**：下載單張圖檔（畫面截圖）、下載單張暫存與下載完整專案（`renderSingleJob()`）皆會依各自 job 的 `qrCodeUrl` 正確顯示或不顯示 QR Code，互不影響；空值或非法網址的 job 不顯示 QR Code，Banner 正常 Render。

修改檔案：`index.html`、`canvas.html`、`js/canvas-entry.js`、`js/layout-runtime.js`、`js/qrcode-url-utils.js`（新增）、`src/app.js`、`src/app.css`、`templates/984x309/template.json`、`templates/1080x1920/template.json`、`templates/1599x1080/template.json`、`templates/3189x3992/template.json`。`tools/qrcode-demo/` 維持原樣，由正式程式共用其中的 vendored library 檔案。

### Not Changed（Boundaries Reaffirmed）

- 未修改既有「套用文字到模板」按鈕（`sendRecord()`）；QRCode 更新時機與此按鈕無關。
- 未修改 Main Canvas / Thumbnail / Batch Render 既有商品身份與 layoutState 邏輯。
- 未修改 Project State schema 版號（`version: 5` 不變）；`qrCodeUrl` 為向下相容的新增字串欄位，舊 Project State 檔案沒有此欄位時視為空值。
- 未修改 Photoshop Pipeline、Asset Pipeline、Review Workspace。

### Phase Completion

- QR Code 完成 Coding、Browser Validation（含使用真實入稿表 CSV 檔案驗證，發現並修正一個 CSV 欄位比對範圍過寬的問題）與 Jamie Manual Validation。功能 Commit `79de045`、Tag `v0.5.2`。正式列入 Locked Completed Phases。Active Phase 回到 **None（Waiting for next Proposal）**；Next Planned Phase Order 四項（Photoshop Automation、AI Workflow、Render Context & Export Workflow、QR Code）已全數完成，下一個 Phase 待 Product Owner 另行提出 Proposal。

## 去背失敗獨立分類 - 2026-07-13

### Fixed

Bug Fix（重新開啟 Locked Completed Phases「Photoshop Automation」與「AI Workflow」）。修正批次去背中「只要有素材失敗，整個流程就卡住」的問題：原本 Runtime 只回報整批 summary，只要有任何一張失敗就顯示單一整批 Recovery Banner「部分素材處理失敗」，唯一動作是整批重新開始（含已成功的素材）。

- `tools/photoshop-automation/spx_ad_runtime.py`：`lastResult` 新增逐筆 `itemResults`（每個 assetId 的 success／error），取自 `photoshop-run-report.json` 的 `items[]`；`get_result()` 改為對成功項目才允許取回，PartialFailure 不再整批擋住已成功的素材。
- `js/asset-pipeline-state.js`：新增狀態值 `background_removal_failed`（去背失敗），僅適用於從未成功過的素材；新增 `getBackgroundRemovalFailedAssets` / `getBackgroundRemovalFailedSummary` / `markBackgroundRemovalFailed`，皆與既有 `needs_rerun` 查詢並列，不影響既有 `重新去背素材（N）` 或 Review Workspace 完成判定的既有邏輯路徑。
- `js/ai-workflow-auto-import.js`：Photoshop 確認失敗（從未成功過）的素材不再嘗試下載，直接標記 `background_removal_failed`；已成功過的素材若 Rerun 又失敗，維持原本 `needs_rerun`，沿用上一次成功的處理結果，不新增額外狀態（依 Jamie 要求盡量簡化，不做子狀態分類）。
- `js/ai-workflow-orchestrator.js` / `js/ai-workflow-recovery.js`：PartialFailure（至少一張成功）改為直接走 Auto Import，不再顯示整批 Recovery Banner；移除已被證明不可達的 `partialFailureDetected` phase 與對應文案。整批全部失敗（zero success）行為不變，仍走既有 `Failed` 復原流程。
- `js/asset-review-workspace.js` / `src/asset-review.css`：Review Workspace 新增第三個 Filter 分頁「去背失敗」與 Navigator 標籤；去背失敗素材的 Decision Area 不提供核准／重新去背／撤回按鈕，改顯示提示文字「此素材去背失敗，請回控制台手動更換圖片。」；Completion Screen 新增「X 個素材去背失敗，請回控制台手動更換圖片」計數，但去背失敗完全不參與「全部素材已完成審閱」的判定，也不計入「重新去背素材（N）」。過程中另外發現並修正一個小型 Completion Screen 相關 Bug：核准最後一筆可決策素材後，「尋找下一筆素材」邏輯需跳過去背失敗素材，否則會被誤判為「還有下一筆」而不會顯示完成畫面。
- `tools/photoshop-automation/validate_runtime.py`：新增 PartialFailure 逐筆結果驗證（新增 `PartialFailureFilenameAdapter` 測試 fixture），60/60 PASS。

### Not Changed（Boundaries Reaffirmed）

- 未新增 debug 欄位記錄 Photoshop 原始錯誤文字（`backgroundRemovalError`）——依 Jamie 明確指示不做，維持本次修改範圍最小化。
- 未修改 Review Decision Model（`approved` / `needs_rerun` 兩種決策值不變）、Navigator / Dynamic Inspector / Decision Area / Completion Screen 的架構、Auto Import 既有「失敗中斷、只補傳未成功項目」的重試語意。
- 整批全部失敗（zero success）畫面與行為不變。

Commit `289ac76`（fix: classify background-removal failures separately in batch processing）。Proposal：`docs/proposals/Background-Removal-Failure-Classification-Proposal.md`。

## Render Context & Export Workflow - 2026-07-12

### Fixed

- 下載完整專案（Batch Render）改為使用控制台最後選擇的輸出尺寸，並與 Project State / layoutState 一致。每筆工單仍使用自己的 `styleId`；本次未修改 Project State schema 或 `layoutStates` schema。

### Phase Completion

- Render Context & Export Workflow 完成 Final Sign-off：功能 Commit `2ac6546`（fix: sync batch render with selected output placement）、Tag `v0.5.1`。正式列入 Locked Completed Phases。Active Phase 轉為 **None（Waiting for next Proposal）**；Next 為 **QR Code**（Not Started，尚未建立 Proposal，不得描述為已開始或 Active Phase）。Branch 仍為 `feature/render-context-export-workflow`。

## AI Workflow / Photoshop Automation - 2026-07-12

### Added

**Photoshop Automation（Photoshop 端能力，Completed）：**

- SPX AD Runtime（`tools/photoshop-automation/spx_ad_runtime.py`）：Python stdlib-only 本機 HTTP Runtime，實作 Ready Contract（`GET /ready`）、兩段式 Execution Contract（`POST /execute` 建立 executionId，逐一 `POST /executions/{id}/assets/{assetId}` 上傳原始 binary，不使用 base64）、Status Contract（`GET /status/{executionId}`）與 Result Contract（`GET /executions/{id}/results/{assetId}` 回傳原始 `image/png` binary）。
- Platform Adapter Architecture（`platform_adapter.py`）：依作業系統選擇 macOS 或 Windows Adapter，Runtime 本身不知道平台細節。
- macOS Adapter（`macos_adapter.py`）：沿用既有 AppleScript／`remove-background.jsx`；Ready Check 改用 bundle id `com.adobe.Photoshop` 的 `is running` 屬性判斷，不再依賴容易因版本不同而變動的 process 名稱（Root Cause Fix，見下方 Fixed）。
- Windows Adapter（`windows_adapter.py`）：pywin32／`win32com.client`，`GetActiveObject` 判斷 Ready（不自動啟動）、`DoJavaScript` 執行 `remove-background.jsx`（去背核心不變，見下方 Naming Contract Consistency Fix）；未使用 VBScript 或 `cscript.exe`。已完成實作與自動化測試，**尚未使用真實 Windows + Photoshop 環境驗證**。
- Manifest dedup：同一 `originalAsset.lookupKey` 被多個 assetKey 引用時只建立一個 Manifest item，以 `assetKeys[]` 保留所有內部 assetKey；operations 不一致時回傳結構化 `operations_conflict` 錯誤，不猜測、不輸出多份檔案。
- 輸出命名改為「原始 basename + `.png`」（例如 `商品A.jpg` → `Processed/商品A.png`），取代 `{assetKey}__processed.png`。
- Runtime Workspace 完全隱藏、自動管理，具備 Pending Execution Timeout（避免上傳中斷導致永久 busy）與啟動時 stale Workspace 清理。

**AI Workflow（Control Center 端 Orchestration，Completed）：**

- Ready Check Integration：Control Center 呼叫 Photoshop Automation 的 Ready Contract，未通過時顯示前置提示與「重新檢查」，保留 CSV／素材資料夾／目前設定。
- Manifest Send + Processing Mode：Execute Accepted 後立即鎖定 Control Center（Global Interaction Lock），素材以原始 binary 逐一上傳。
- Status Polling + Auto Import：輪詢 Progress，Completed 後逐一取回 Processed PNG binary，透過既有 `FileSystemDirectoryHandle` 寫入真正的 `素材資料夾/Processed/`，沿用既有 Matching 函式自動 Import。
- Auto Open Review Workspace：Auto Import 成功後顯示「素材處理完成」（約 0.8 秒轉場），自動開啟既有 Review Workspace 並自動選取第一筆素材，使用者不需要手動點擊「開啟素材審核」。
- Rerun Workflow：Review Workspace Completion Screen 的「重新去背素材（N）」串接同一套 Ready Check／Execute／Status Polling／Auto Import 資料流；第二輪自動切到「待重新去背」Filter，只顯示本輪重新處理的素材子集，不 Auto Approve。
- Error / Recovery Hardening：Ready Check 失敗、Execute 被拒絕／Manifest 衝突、素材上傳失敗、Status Polling 失敗（含 Runtime 暫時無回應與 executionId 遺失）、部分失敗、寫入 Processed 失敗（含 readwrite 權限被拒絕）、Auto Import／Matching 失敗、Review Workspace 開啟失敗，皆有對應復原文案與 Retry 動作；Retry 不會重複觸發 Photoshop、不會遺漏已成功的部分。

### Fixed（macOS Development Manual Validation 過程中發現並修正）

- **Ready Check 誤判 Photoshop 已關閉**：`macos_adapter.py` 原本用 System Events 的 process 名稱完全比對（AppleScript `contains` 對 list 是精確比對，非子字串比對），Photoshop 2025 實際 process 名稱與寫死字串不一致時會誤判。改用 bundle id `com.adobe.Photoshop` 的 `is running` 屬性判斷，並保留失敗時的診斷輸出（returncode／stderr／例外類型，不外洩敏感路徑或完整 traceback）。
- **Rerun 未顯示完整 Processing Notice**：Rerun 觸發時 Review Workspace（`position:fixed` 全螢幕 Modal）仍持續開啟，先前 Processing Banner 是一般 `position:static` 區塊元素，會被疊在下面。改為 `position:fixed` 並比照既有 Lock Overlay／Recovery Banner 的 z-index，確保永遠顯示在最上層。
- **寫入 Processed 結果失敗**：`requestPermission({mode:'readwrite'})` 由 Status Polling 自動觸發的背景流程呼叫，不在使用者手勢內，Chrome 會拒絕權限升級請求。改為在使用者選擇素材資料夾當下（真實使用者手勢內）就直接要求 readwrite 權限，之後 Auto Import 內的同一個呼叫只是確認既有授權。
- **Review Workspace 圖片破圖**：Auto Import 只更新 `assetPipelineState` 的 `processedAsset` 中繼資料，從未把寫入後的 `FileSystemFileHandle` 交回 `processedAssetIndex`（Review Workspace 實際讀取圖片內容用的既有快取），導致圖片永遠讀不到內容。修正為把寫入後的 Handle 透過 Orchestrator 轉交給 Control Center 填入既有快取，不新增第二套圖片來源機制。
- **Recovery（整批重新開始類 Retry）後圖片仍然破圖**：`replayFromScratch()` 重新呼叫 `start()`／`startRerun()` 時少傳了既有的 `onProcessedAssetsWritten` callback，導致「Photoshop 處理中關閉」等復原情境即使重跑成功，也不會把 Handle 填回 `processedAssetIndex`。已補傳，其餘 Retry（沿用既有 executionId／不重建）不受影響。
- **Rerun 完成後 Review Workspace 卡在完成畫面**：`open()` 與決策後（`decide()`）的完成畫面判斷原本使用「全域是否審閱完畢」，而不是「目前 Filter 是否還有素材」；Rerun 批次因為規則上不 Auto Approve，狀態維持 `needs_rerun`，全域檢查會誤判為已完成，即使 Filter 明明還有下一筆素材。改為依目前 Filter（`currentAssets`）是否有素材判斷，`all` 模式維持既有「是否每筆可見素材都已審閱」邏輯不變。

### Boundary

- 未修改 Review Workspace UI、Navigator、Dynamic Inspector、Decision Area、Completion Screen 的架構或 Review Decision Model；上述 Review Workspace 修正皆為判斷條件的 Bug Fix，不改變既有 UI 或互動設計。
- 未修改 Canvas、Thumbnail、Batch、`layoutStates`、Approved Asset Resolver、Project State schema。
- 未修改既有 Manifest schema 核心概念、Photoshop Adapter Boundary、`run-photoshop-manifest.applescript`；`remove-background.jsx` 的去背核心／Logo copy／Run Report 未修改，唯一被修改之處是 `output.filename` 缺漏時的 fallback（見下方 Naming Contract Consistency Fix）。
- 原本人工匯出流程（Control Center 選單「重新去背素材（N）」呼叫 `exportPhotoshopRerunManifest`）仍保留，未被移除。

### Naming Contract Consistency Fix（本輪，2026-07-12）

Root Cause：Manifest Builder（`js/asset-pipeline-manifest.js`，人工「匯出處理檔」與 AI Workflow 共用）已將 `output.filename` 統一改為「原始 basename + `.png`」，但人工「匯入處理結果」比對邏輯（`extractAssetKeyFromProcessedFilename()`）當時仍把處理後檔名去掉 `__processed` 尾綴後直接當 assetKey 查表，與新輸出命名不相容，導致人工完整跑一次匯出／匯入會 100% 比對失敗。

- **人工 Export／Import Naming 不一致修正**：`js/asset-pipeline-state.js` 移除 `extractAssetKeyFromProcessedFilename()`；`importProcessedAssets()`（人工「匯入處理結果」使用）改為以 processed 檔名 basename 對照每筆 record 的 `originalAsset.filename`（或 fallback `originalFilename`）basename 查找，不再從檔名反解 assetKey。
- 同一原始素材被多個 assetKey 引用時，一個 basename.png 會正確回填全部相關 assetKey（人工與 AI Workflow 的 `importProcessedAssetsByManifestItems()` 兩條路徑皆驗證）。
- unmatched processed file 誠實記錄（`assetKey` 留空字串，不假造），approved／needs_rerun 狀態優先規則與既有回傳形狀不變；AI Workflow 既有 `importProcessedAssetsByManifestItems()` 未被修改或重寫。
- **JSX fallback 修正**：`tools/photoshop/remove-background.jsx` 的 `getOutputFilename()` 缺少 `output.filename` 時，fallback 改為 `item.source.filename` 的 basename + `.png`，不再組出 `assetKey + "__processed.png"`；`item.output.filename` 存在時的既有路徑、去背核心、Logo copy、Run Report 邏輯完全未修改。
- **Runtime validation tests 已同步目前 Contract**：`tools/photoshop-automation/validate_runtime.py` 全面改寫為使用 Runtime 目前真實的 `create_execution()` / `receive_asset()` / `status(executionId)` / `get_result(executionId, assetId)` 契約（先前測試仍呼叫已不存在的一次性 `core.execute(manifest_path, asset_folder)` API），Section 1／2／3 皆可完整執行；所有 fixture 改為 basename + `.png`，不再使用 `{assetKey}__processed.png`。`spx_ad_runtime.py` 本身未被修改以配合測試。
- **文件範例與現行流程同步**：`docs/Architecture.md`、`docs/SPX-AD-版型規格與操作說明.md`、`docs/Photoshop Asset Pipeline.md`、`docs/UI Design Guideline.md`、`docs/AI-HANDOFF.md`、`tools/photoshop/README.md`、`tools/photoshop-automation/README.md` 內殘留的 `{assetKey}__processed.png` 範例、過期 Runtime HTTP 契約描述、過期 Rerun-only-manual 描述、過期 Windows「未實作」描述，全部同步為現行實作。Project Persistence（`js/project-persistence.js`，本輪未修改）確認沒有獨立命名邏輯，`project.zip`／`single-state` 的 processed 檔名就是直接沿用 `processedAsset.filename`。

### Validation

- Unit Validation／Integration Validation：Runtime、macOS／Windows Adapter、各 `js/ai-workflow-*.js` 模組、Review Workspace 修正、Naming Contract Consistency Fix，皆以真實模組（非純 mock）自動化測試驗證，已於 Coding 過程中全數 PASS。
- macOS Development Manual Validation（Jamie 實機驗收，Photoshop 2025）：Stage 1 Environment／Stage 2 First Run／Stage 3 Rerun／Stage 4 Recovery 共 18 項全數 PASS。此驗證範圍為 **Development Validation**（本機 Development Runtime + 本機 Control Center，非 Production 打包版本）。
- Windows Validation：**Deferred（Waiting for Windows Validation Environment）**，非 Completed、非 Blocked。
- Production Launcher、PyInstaller 打包、Cloud Deployment：**Not Started**。

## v0.4.5 - 2026-07-11

### Added

- Review Workspace UI Upgrade。
- Navigator Information Architecture：Navigator 只顯示檔名、Review Status、Dirty Status；移除 Role / Job ID / Slot / Asset Key / Processed Filename / Mode。
- Review Summary 與 Filter（全部素材／待重新去背）移至 Navigator 上方，並排顯示。
- Workspace Layout：Inspector 預設收合，預設畫面為 Navigator + Workspace；選取裁切或橡皮擦時展開 Dynamic Inspector，儲存或取消後收合；Workspace 永遠使用剩餘最大空間。
- Dynamic Inspector：依目前工具顯示 View / 裁切 / 橡皮擦，不再顯示素材 Metadata。
- Header 簡化為素材審閱／關閉；上一張、下一張、撤回上一個決策移除可見 Header UI（底層 Navigator 點擊、Keyboard ← / →、Auto Next、非循環導航皆保留）。
- Decision Area：底部三顆按鈕同列，依序為核准（Primary）、重新去背（Warning / Danger）、撤回上一個決策（灰色 Outline、低視覺權重）。
- Completion Screen：所有 Reviewable Assets 完成 Decision 後顯示；Needs Rerun = 0 顯示「全部素材已完成審閱」「返回控制台」「撤回上一個決策」；Needs Rerun > 0 額外顯示「X 個素材待重新去背」與「重新去背素材（X）」。判斷邏輯當時使用全域 Reviewable Assets，不使用目前 Filter collection；Needs Rerun 數量沿用 `BNAssetPipelineState.getNeedsRerunAssets()`。（本行為記錄的是 v0.4.5 當時的實作；後續「AI Workflow / Photoshop Automation - 2026-07-12」一節的 Fixed 條目「Rerun 完成後 Review Workspace 卡在完成畫面」已改為依目前 Filter 判斷，見該條目與 `docs/Architecture.md`。）
- Completion Recovery：Completion Screen 可撤回上一個決策並回到正確素材；使用者可透過 Navigator 重新進入任一已完成素材繼續查看、裁切、橡皮擦、儲存、核准或重新去背；Completion Screen 不永久覆蓋 Editor。
- Review Workspace 正式使用者文案中文化（Review Workspace → 素材審閱、All Assets → 全部素材、Needs Rerun Only → 待重新去背、Approved → 核准、Needs Rerun → 重新去背、Undo Last Decision → 撤回上一個決策、Crop → 裁切、Eraser → 橡皮擦、Restore → 復原、Fit to Canvas → 符合畫面、Save → 儲存、View Original → 查看原圖、Pending → 待審閱、Processed → 已處理）。
- `src/app.js` 傳入既有 `exportPhotoshopRerunManifest` 作為「重新去背素材（N）」的 callback。

### Behavior

- 「待重新去背」Filter 為空、但全域仍有未審閱素材時，顯示「目前沒有待重新去背的素材」，不誤顯示全域完成。
- 中文化只限 UI Label；internal values（`approved`、`needs_rerun`、`pending`、`processed`、`all`、`crop`、`eraser`）維持不變。
- 「重新去背素材（N）」目前只呼叫既有 callback，不包含 Background Runner、Photoshop 自動啟動、自動 Import Processed Result、自動第二輪 Review 或 AI Workflow；這些屬於下一個 Planned Phase（AI Workflow）。

> 註（2026-07-11 補充，不更動以上 v0.4.5 已完成內容）：後續 Roadmap 已拆分——Photoshop 端背景處理能力（Ready Check、接收 Manifest、批次去背、Progress / Completion Contract）屬於新增的「Photoshop Automation」前置 Phase；Control Center orchestration（自動建立與送出 Manifest、Processing Mode、自動 Import、自動開啟 Review）屬於「AI Workflow」。詳見下方 Roadmap Notes。

### Boundary

- 不修改 Crop Core Logic、Eraser Core Logic、Undo Stack、Save Runtime Processed Asset Flow。
- 不修改 Keyboard Shortcut 底層邏輯（僅移除可見 Header 按鈕，快捷鍵與 Auto Next 行為不變）。
- 不修改 Photoshop Pipeline、Rerun Architecture、Project State Schema、Asset Pipeline Schema、Resolver 或 Review Decision Model。

## v0.4.4 - 2026-07-10

### Added

- Control Center UI Upgrade。
- Header title updated to `SPX BN生成器`。
- Header 固定一般使用者入口：匯入CSV、匯入暫存、選擇素材資料夾、素材審核。
- 素材審核入口整合處理結果匯入、重新處理素材與開啟素材審核。
- 素材審核入口依既有 asset pipeline / review summary / needs_rerun collection 顯示狀態。
- 中央版位下拉 display order 調整。

### Behavior

- 一般使用者 UI 隱藏 Photoshop / Manifest / Processed Folder 等技術術語。
- 底層 Manifest export、Processed Folder import、Photoshop Rerun 能力保留。
- `建立素材處理檔` 不再作為一般使用者可見入口。
- 版位名稱維持不變，僅調整顯示順序。

### Boundary

- 不修改 Photoshop Pipeline / Runner / Manifest builder。
- 不修改 Processed Folder flow。
- 不修改 Review Workspace UX / Decision Model。
- 不修改 Download 區、Batch Render、Thumbnail 或 Render Engine。
- 不修改 Project State schema、layoutState / layoutStates key、Template / Style JSON。

## v0.4.3 - 2026-07-09

### Added

- Project Persistence。
- Project State v5。
- Persistence Layer：`js/project-persistence.js`。
- single-state Persistence：`single-state.json` 可保存並恢復 latest processed image。
- project.zip Persistence：`project.zip` 可保存並恢復完整 project workspace。
- Download Complete Project：單一主要下載流程輸出 PNG、`project-state.json` 與 `processed/`。
- Latest Processed Image Restore：匯入後不需重新 Import Processed Folder，即可恢復 approved processed assets。

### Behavior

- Project Save = Workspace Save。
- Review Workspace Save 的 latest processed image 會被 single-state / project.zip 保存。
- `project-state.json` 的 `processedAssets` 只保存 `filename`，不保存 processed image `dataUrl`。
- `project.zip` 使用 `processed/` 保存 latest processed image。
- 匯入 single-state / project.zip 後會重建 runtime `processedAssetIndex`。
- Main Canvas、Thumbnail、Batch 透過既有 Resolver / Render Context 使用 restored processed assets。

### Boundary

- 不修改 Approved Asset Resolver API。
- 不修改 Canvas / Render Engine。
- 不修改 Review Workspace UX / Crop / Eraser。
- 不修改 Thumbnail / Batch 架構。
- 不修改 Photoshop Pipeline。
- 不修改 `layoutStates` schema。

## v0.4.2 - 2026-07-09

### Added

- Review Workspace UX Polish。
- Auto Next after `Approve` / `Needs Rerun`.
- Multi-pass Review：`All Assets` / `Needs Rerun Only`.
- Review Progress Header with filtered progress and decision counts.
- Smart Entry for reopening Review Workspace.
- Keyboard Shortcuts for review navigation and decisions.
- Runtime-only Decision Guard：`Undo Last Decision`.
- Remove Drag Tool；Pan 改為 Space temporary pan。

### Boundary

- 不修改 Project State schema。
- 不修改 Asset Pipeline schema。
- 不修改 Approved Asset Resolver API。
- 不修改 Render Engine / Canvas / Thumbnail / Batch。
- 不修改 Photoshop Pipeline。


## Photoshop Rerun Automation - 2026-07-09

### Completed

- Needs Rerun Collection derived from `assetPipelineState.assets` with `status === needs_rerun`.
- `Run Photoshop Rerun (N)` button; disabled when `N=0`.
- `photoshop-rerun-manifest.json` export for needs_rerun assets only.
- Import Processed Folder returns to Review Workspace.
- Latest Processed overwrites Previous Processed; original asset remains preserved.
- Legacy `rejected` Project State imports migrate to `needs_rerun`.

### Boundary

- No queue array schema.
- No Project State root schema change.
- No Photoshop Runner / JSX core change.
- No Main Canvas / Thumbnail / Batch update after rerun import.
- Only `approved` assets enter Approved Asset Resolver and Render Pipeline.

## Review Workspace（Crop / Eraser） - 2026-07-09

### Completed

- Full-screen Review Workspace
- Original / Processed View
- Zoom / Pan
- Crop
- Eraser
- Save Runtime Processed Asset
- Unsaved Changes Guard
- Save Feedback
- Runtime-only Save Architecture

### Boundary

- Save 只更新 Runtime Processed Asset。
- 不修改 Canvas / Thumbnail / Batch。
- 不修改 Approved Asset Resolver API。
- 不修改 Project State schema。
- 不修改 Photoshop Pipeline。

## v0.3.6 - 2026-07-08

### Added

- Smart Layout Propagation
- Per-Job Master Layout
- Runtime-only Master Layout
- Products Zone Auto Fit
- First-time Propagation Dialog
- Update Master Layout
- Apply Master Layout

### Behavior

- 每個 Job 擁有自己的 Master Layout。
- Master Layout 為 runtime-only。
- Master Layout 不寫入 Project State。
- Master Layout 不寫入 layoutStates。
- 每個尺寸第一次建立 layout 時，可選擇：
  - 套用
  - 預設
- Propagation 後建立 target size 自己的 layoutState。
- 各尺寸之後永久獨立。
- 更新 Master Layout 不會自動同步任何已存在的 layoutState。

## v0.3.5 - 2026-07-07

### Project State Completion

- Project State v4 已完成。
- `project-state.json` / `single-state.json` 會保存 `assetPipelineState` metadata。
- Review decision 可恢復：`approved` / `needs_rerun`；legacy `rejected` 匯入時會 migration 為 `needs_rerun`。
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

## Roadmap Notes（未版本化，非 Release）

此區塊記錄 Roadmap 調整決策，不代表任何 Release 或產品功能完成，不建立新版本號，不影響 v0.4.5 既有完成內容。

- 2026-07-11：Roadmap 正式拆分「Photoshop Automation」為「AI Workflow」的必要前置 Phase。目前 Active Phase 為 Photoshop Automation（Proposal 階段）；AI Workflow 狀態調整為 Draft / Paused pending Photoshop Automation，暫停 Proposal Revision / Audit。
- 2026-07-11：Extension System 已從目前 Roadmap 移除（不在 Completed / Current / Future / Next Planned Phase Order 中）。原因：目前沒有新增素材審閱工具的產品需求，Review Workspace 現有的核准、重新去背、裁切、橡皮擦已足夠目前使用。未來若有明確產品需求，將由 Jamie 另外重新提出 Proposal，不預留 Phase 位置。
- 2026-07-11：確認唯一正確的 Photoshop 使用前提：使用者已安裝 Photoshop，並在使用控制台前自行開啟；系統不自動安裝、啟動或關閉 Photoshop；Photoshop 開啟後系統執行 Ready Check，通過後使用者不需要再操作 Photoshop。取代先前「使用者完全不需要知道 Photoshop 的存在」的用詞。
- 2026-07-11：確認 Photoshop Automation 與 AI Workflow 責任不重疊：Photoshop Automation 只負責 Photoshop 端能力（Ready Contract、接收 Manifest、批次去背、Progress / Completion / Failure Contract）；AI Workflow 負責 Control Center 端 Orchestration（建立並送出 Manifest、Processing Mode、讀取狀態、自動 Import、自動開啟 Review Workspace）。
- 2026-07-12：Photoshop Automation 與 AI Workflow 完成 Final Sign-off（功能 Commit、文件 Commit、Tag `v0.5.0`），正式列入 Locked Completed Phases。Active Phase 轉為 **Render Context & Export Workflow（Proposal 階段）**，branch 由 `feature/photoshop-automation` 切換為 `feature/render-context-export-workflow`；Roadmap 順序更新為 Photoshop Automation（Completed）→ AI Workflow（Completed）→ Render Context & Export Workflow（Current）→ QR Code（Next）。Windows Validation（Waiting for Windows Validation Environment）與 Production Deployment（Not Started）維持獨立於此順序之外，不是 Current 或 Next，不得描述為緊接彼此之後。
- 2026-07-12：Render Context & Export Workflow 完成 Batch Render 輸出 placement／template 修正並完成 Final Sign-off（功能 Commit `2ac6546`、文件 Commit `7163db8`、Tag `v0.5.1`，暫時指向文件 Commit，之後將由 Jamie 重新建立到最新文件 Commit），正式列入 Locked Completed Phases。Active Phase 轉為 **None（Waiting for next Proposal）**；branch 仍為 `feature/render-context-export-workflow`；Roadmap 順序更新為 Photoshop Automation（Completed）→ AI Workflow（Completed）→ Render Context & Export Workflow（Completed）→ QR Code（Next，Not Started，尚未建立 Proposal）。Windows Validation（Waiting for Windows Validation Environment）與 Production Deployment（Not Started）維持獨立於此順序之外，不是 Current 或 Next，不得描述為緊接彼此之後。
