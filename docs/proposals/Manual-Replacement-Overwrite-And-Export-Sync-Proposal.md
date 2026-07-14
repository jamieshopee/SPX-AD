# Manual Replacement Overwrite & Export Sync — Product Proposal

Version: 2026-07-14-freeze-04
Status: Bug Fix A Implementation Proposal Revised（v2）；Bug Fix B／C 設計保留、尚未重新實作

## 0. Revision History（重要，先讀這節）

- **freeze-03（含之前）**：Bug Fix A／B／C 皆已 Coding 並通過 Claude 自行的實機驗證。
- **Jamie Manual Validation 發現嚴重迴歸**：實測「置換單一格商品圖」後，(1) 其他未被替換的格子顯示回「非核准去背版本」的圖；(2) 調整任一商品位置時，三張圖的位置全部錯亂。**已將 `js/bn-editor-plugin.js`、`src/app.js` 完全復原到 Commit `c2fd29e`（Bug Fix A／B／C 三個修正的程式碼一行都沒有殘留）**，回到修正前的乾淨基準點重新查起。
- **根因**：追查後確認問題出在 Bug Fix A 原本的設計——用「清空 `window._bnProducts` 全部、把沒被替換的既有商品也一起塞回清單重建」的方式（`fromExisting` 標記），這會導致沒被替換的商品也被重新 `bn-product-remove`＋`bn-product-add`、重新產生 id。Bug Fix B／C 的設計本身沒有被證實有問題（尚未在乾淨基準點上重新驗證），但因為整批復原，須重新從 Bug Fix A 開始，確認安全後才逐一回頭做 B／C。
- **本輪（freeze-04）**：只重新設計 Bug Fix A，採用完全不同、風險更低的做法（見第 6.1 節），**尚未 Coding**。Bug Fix B／C 的 Root Cause／Fix Direction（第 5、6 節對應段落）維持先前確認的內容不變，作為之後接續處理的參考，但要等 Bug Fix A 安全修好、驗證通過後才會回頭重新走一次 Coding。

## 1. Status

本文件記錄三個經 Root Cause 調查確認、範圍已收斂的 Bug Fix，屬於同一輪修正（右側欄手動置換素材相關）：

- Bug Fix A：三品商品圖右側欄手動置換會覆蓋其他既有商品圖。**已依 v2 設計 Coding 完成，Node 端邏輯驗證通過，Jamie Manual Validation 確認成功（替換其中一格，其餘商品不受影響）。尚未 Code Commit。**
- Bug Fix B：`cloneJobForExport()` 匯出資料時，商品圖／一人一品／Logo 手動置換的內容抓不到，仍匯出置換前的舊檔案（下載單張暫存、下載完整專案皆受影響，因為兩者共用同一個函式）。**設計維持不變，尚未重新 Coding（等 Bug Fix A 完成）。**
- Bug Fix C：手動置換內容只存在畫面即時狀態，從未寫回工單本身資料；切換尺寸（`selectTemplate`）或切換工單（`selectJob`）時，畫面狀態會被清空並改用工單原本資料重新載入，導致手動置換的內容連同對應的 Master Layout 位置/大小一起消失、顯示回置換前的原圖。**設計維持不變，尚未重新 Coding（等 Bug Fix A 完成）。**

「下載完整專案卡住無法下載」是另一個獨立、已確認根因的 Bug（`batchRender()` 打包 ZIP 段落缺少 try/catch），Jamie 決定優先順序為：先修本文件涵蓋的問題，「下載卡住」延後處理，另立 Proposal。

## 2. Background

Jamie 在測試「去背失敗獨立分類」時，於控制台右側欄實際操作發現：

1. 三品模式手動上傳一張商品圖替換其中一格，會直接把另外兩格既有商品圖洗掉（Bug Fix A）。
2. 進一步討論下載完整專案時發現：即使置換不被洗掉，手動置換後的圖片內容在下載/匯出時也抓不到，匯出的還是舊圖（Bug Fix B）。一人一品與 Logo 手動置換也一樣會發生；「下載單張暫存」與「下載完整專案」共用同一段程式碼，兩種下載都受影響。
3. Bug Fix A／B 完成 Coding 並通過實機驗證後，Jamie 實際測試置換功能本身（成功，位置正確），但接著測試「切換尺寸、套用 Master Layout（Jamie 稱『公版』）」時發現：畫面顯示回置換前的原圖，且位置/大小/比例跑掉。追查確認這是更根本的問題（Bug Fix C）：手動置換的內容只存在 Canvas 執行期狀態，從未寫回工單本身的 `productFilenames`／`logoFilenames`，只要切換尺寸或切換工單，就會被清空重載為舊內容。Bug Fix B 修正的「下載時讀取即時內容」在這個情境下已經來不及——切換尺寸那一刻，即時內容就已經被清空重載成舊圖了，下載那邊修得再對也沒用。

## 3. Goals

- 三品模式：手動上傳/替換其中一格商品圖時，不影響、不清除其他未被替換的既有商品圖。（Bug Fix A）
- 商品圖／一人一品／Logo 手動置換後，「下載單張暫存」與「下載完整專案」都能正確匯出置換後的最新內容，不再誤用置換前的舊檔案。（Bug Fix B）
- 商品圖／一人一品／Logo 手動置換後，切換尺寸（版位/模板）或切換工單，仍能保留置換後的內容，不會被清空重載回置換前的原圖。（Bug Fix C）

## 4. Non-Goals（本輪不做）

- 不修正「下載完整專案卡住無法下載」（`batchRender()` 缺 try/catch）——已確認是獨立問題，另立 Proposal 處理。
- 不新增「一人一品可上下移動」功能——這是功能需求，不是 Bug，另外排入待辦。
- 不重新設計右側欄上傳 UI、商品圖 Slot 標示規則（01/02/03、_人/_品 檔名規則）、Logo 編輯功能。
- 不修改 Review Workspace、Photoshop Automation、AI Workflow 任何既有邏輯（本輪修正範圍完全在 Control Center 的 Main Canvas 素材編輯與 Project State 匯出）。
- 不修改 `applyWithOrder()`（三品套用核心邏輯）、`exportProjectZip()`（下載暫存 ZIP 用的既有函式，已經有正確的 try/catch，不受影響也不需要修改）本身的行為，只調整呼叫端組資料的方式。
- **Bug Fix C 不修改 `layoutStates`、Master Layout（`captureProductMasterLayout`／`propagateProductMasterLayout`）、「未套用 Master Layout 時預設用原本位置排序」的既有規則**——這些機制皆以「第幾格（position）」與「版位/模板 key」為依據，與檔名無關；已查證套用位置/大小的程式碼路徑完全不比對檔名。Bug Fix C 只改變「這一格載入哪個檔案」，不改變「這一格套用什麼位置/大小」。
- Bug Fix C 不修改 `selectPlacement()`／`selectTemplate()`／`selectJob()` 既有的其他行為（Ready Check、版位/模板/工單切換、Thumbnail、Style 等），只在既有的「離開前同步」時機點新增一個獨立的呼叫。

## 5. Root Cause（Proposal Audit 確認）

### Bug Fix A：三品覆蓋（v2，freeze-04 重新確認）

`js/bn-editor-plugin.js`：

- `_slotted`／`_unslotted`（模組層級變數，追蹤右側欄上傳的商品圖）只會被「這次上傳的新檔案」填入，從未被目前實際顯示的 `window._bnProducts` 回填過。
- `handleDirectProdFiles()` 組出的 `ordered` 清單，因此只包含這次新上傳的檔案。
- `applyWithOrder()`（843 行）呼叫時，會先**無條件把 `window._bnProducts` 全部商品都廣播移除、清空、整批重建**（847-849 行：`oldIds=window._bnProducts.map(id); oldIds.forEach(broadcast remove); window._bnProducts=[];`）——若 `ordered` 只有 1 筆新上傳，另外 2 筆既有商品的整個 DOM box（含 id）都會被移除、重建，不只是資料被清掉。

**v1 設計（已證實有問題，不採用）**：原本打算讓 `handleDirectProdFiles()` 把沒被替換的既有商品也塞進 `ordered` 清單（標記 `fromExisting`），讓它們跟著一起「重建」。問題：這些既有商品雖然沒有被重新 `autoTrim`，但仍然會被無條件執行 `bn-product-remove`＋`bn-product-add`（847-849、886 行），等於連同新上傳的商品一起，把全部商品的 DOM box 都移除又重建，id 也會全部重新產生（877 行 `var id='p'+Date.now()+'_'+i;`，對 `fromExisting` 的項目也一樣執行）。Jamie 實測發現這會導致 (1) 圖片顯示不是核准去背版本、(2) 位置調整全部錯亂。

**v2 設計改用完全不同的做法**：不讓既有商品進入 `ordered` 清單，而是直接修改 `applyWithOrder()` 的「清除舊商品」這一步，改成**只清除這次真的有新圖上傳、要被取代的那幾格**，其他既有商品的 DOM box／id 完全不觸碰（不移除、不重建、不重新廣播）。

Audit 確認的關鍵證據：

1. **既有「移除」按鈕的做法可以參考**（`js/bn-editor-plugin.js` 約 944-951 行）：目前「移除」按鈕本來就是「只針對這一個商品」操作——只從 `window._bnProducts` 篩掉這一筆、只對這一個 id 廣播 `bn-product-remove`，完全不去動其他商品，證明這種「只動一個、其他完全不碰」的做法在這個架構裡是既有、安全的模式。
2. **`position` 是判斷「這一格是哪一格」的正確依據，不是 `_slot`**：`js/asset-classifier.js` 第 21 行的 `classifyProducts()`（CSV／工單載入時 `buildProductPayloads()` 會呼叫）內部同樣呼叫 `slotUtils.detectProductPosition(filename)`——跟手動上傳用的是同一個判斷函式，只是套用在不同檔名上。所以 CSV 載入的商品 `_slot` 也會被正確判斷（只要原始檔名有 `_主品`／`_左配品`／`_右配品` 慣例），不是 null；`_slot` 真正會是 null 的情況是「檔名沒有帶編號/角色標籤的未編號上傳」，這時候真正決定「這是哪一格」的是最終分配的 `position`，不是原始判斷值 `_slot`。因此比對「這次上傳要取代哪一格既有商品」要用 `position`。
3. **`applyWithOrder()` 在整份程式碼裡只有一個呼叫點**（`handleDirectProdFiles()` 第 698 行），確認修改它的「清除」邏輯不會影響其他未知的呼叫情境。
4. **檔名慣例本身不需要改動**：Jamie 若替換圖片時使用跟原檔一模一樣的檔名（例如 `TVBN-A-1_PRODUCT_02_左配品.png`），因為檔名本身已經帶有正確的角色標籤，`detectProductPosition()` 判斷出的 `position` 會跟原本那張圖一致，v2 設計會自動比對到、正確取代那一格，不需要另外新增「比對檔名字串完全相同」的機制。

### Bug Fix B：匯出抓不到手動置換

`src/app.js` 的 `cloneJobForExport()`（約 3580-3630 行）：

- 只有當工單的 `logoFilenames`／`productFilenames` 當下是**空陣列**時，才會去讀取 Canvas 當下即時內容（`window._bnLogos`／`window._bnProducts`／`window._bnPerson`／`window._bnSingleProd`）並內嵌進匯出資料。
- 正常工單透過 CSV 匯入時，這些欄位一開始就不是空的，所以這段「讀取即時內容」的邏輯幾乎不會被觸發；匯出時改用 `job.productFilenames`／`job.logoFilenames`（原始檔名）透過 `getAssetFile()` 去讀取原始選定資料夾裡的檔案——手動置換的內容因為從未寫回這些檔名或寫進 `assetIndex`，永遠抓不到。
- 這段邏輯只套用在**目前正在畫面上開啟編輯的工單**（`if (job.id !== activeJobId) return copy;`），其他未開啟的工單不受影響、也不在本次修正範圍內（原本就是讀工單自己儲存的資料，行為不變）。

Audit 確認：`buildProjectState()`（進而 `cloneJobForExport()`）是「下載單張暫存」（`buildProjectState([job], 'single')`）與「下載完整專案」（`exportProjectState()` → `buildProjectState(validJobs, 'project')`）共用的唯一實作，兩種下載會同時被本次修正影響（同時修好，不是本次刻意擴大範圍，只是如實反映既有程式碼共用的事實）。

### Bug Fix C：手動置換內容切換尺寸/工單後消失

`src/app.js`：

- `selectTemplate()`（約 3144-3146 行）與 `selectJob()`（約 2278-2282 行）在切換尺寸/版位或切換工單時，皆會執行 `window._bnProducts = []; window._bnLogos = []; window._bnPerson = null; window._bnSingleProd = null;`，把 Canvas 執行期狀態整個清空，之後改由 `applyProductsToCanvas()` 依工單儲存的 `job.productFilenames`／`job.logoFilenames`（原始檔名）重新載入畫面。
- 手動置換的內容因為（在 Bug Fix C 修正前）從未寫回 `job.productFilenames`／`job.logoFilenames` 或登記進 `assetIndex`，只存在於即將被清空的 `window._bnProducts` 等變數，所以切換尺寸或切換工單當下就會消失，重新載入回置換前的原圖；對應的 Master Layout 位置/大小是依照置換後圖片的比例計算，套用到重新載入的原圖上會對不上，造成「位置/大小/比例跑掉」。
- Bug Fix B（`cloneJobForExport()`）修正的「下載時讀取即時內容」在這個情境下已經來不及：切換尺寸的當下，即時內容就已經被清空重載成舊圖，下載時讀到的「即時內容」其實已經是重載後的舊圖，不是使用者原本置換的那張。

Audit 確認（回應 Jamie 提出的疑慮）：`layoutStates`／Master Layout（`captureProductMasterLayout`／`propagateProductMasterLayout`）與「未套用 Master Layout 時預設用原本位置排序」的邏輯，皆以商品「第幾格（position）」與版位/模板 key 為依據，程式碼中找不到任何依賴檔名比對的邏輯；Bug Fix C 只改變「這一格載入哪個檔案」，不改變「這一格套用什麼位置/大小」，不影響 Master Layout 或預設排序行為。

**第二次 Audit（回應 Jamie 對「套公版／不套公版」既有流程的提醒，重新查證，不假設）**：追到 `selectJob()`（約 2277-2320 行）與 `selectTemplate()` 對應段落的完整執行順序，確認實際發生的三個步驟依序是：

1. 清空 `window._bnProducts`（2278 行）。
2. 重新載入 Canvas，呼叫 `applyProductsToCanvas(job.productFilenames)`（約 2303 行）——**這一步決定「畫面上顯示哪張圖」**，讀的是工單自己存的 `productFilenames`，跟公版無關。
3. 圖片載入完成後，才呼叫 `resolveSmartProductLayoutForMainCanvas()`（約 2308 行，內部呼叫 `askSmartLayoutPropagationChoice()` 詢問是否套用公版）——**這一步只決定位置/大小怎麼排**，不涉及顯示哪張圖片。

「顯示哪張圖」（步驟 2）與「套不套公版、位置怎麼排」（步驟 3）是完全分開、依序執行、互不干擾的兩個步驟。Bug Fix C 的同步時機點（見下方，位於步驟 1 之前）只影響步驟 2 讀到的 `productFilenames` 內容，不影響步驟 3 的公版選擇流程；套公版／不套公版的既有行為（套公版整組帶入、可各自調整；不套公版用預設三品比例排放）維持不變。

`selectPlacement()`／`selectTemplate()`／`selectJob()` 三者皆已有「離開前同步」的既有呼叫模式（`await syncActiveLayoutState()`，並透過 `options.skipSync` 避免連鎖呼叫時重複同步，執行時機在上述步驟 1 清空之前），可作為新增「同步商品/Logo 即時內容回工單」的既有掛載點，不需要新增額外的呼叫時機。

## 6. Confirmed Fix Direction（尚未 Coding，僅供 Freeze 存檔）

**Bug Fix A（v2）**：不修改 `handleDirectProdFiles()` 組 `ordered` 清單的邏輯（維持只包含這次上傳的新檔案，不塞入既有商品）。改為修改 `applyWithOrder()` 內「清除舊商品」那一步：從「無條件清空 `window._bnProducts` 全部」改成「只清除 `ordered` 清單裡有對應到的那幾格既有商品」，其他既有商品（DOM box、id、畫面顯示）完全不觸碰，比照既有「移除」按鈕只針對單一商品操作的做法。同時把 `sizeScale`／`zOrder` 的計算依據，從「這次清單裡的第幾筆（迴圈索引）」改為「這一格實際的位置編號（`position`）」，避免只替換部分格子時大小比例套錯。不修改 `handleDirectProdFiles()`、不修改 slot 偵測規則（`detectProductPosition`）、不修改 `item.fromExisting` 這個既有分支（維持原樣，本次不會用到但也不刪除）。

**Bug Fix B**：`cloneJobForExport()` 內三處（Logo／三品／一人一品）判斷條件，從「原本是空陣列才讀取即時內容」改為「只要目前開啟編輯的工單、Canvas 上有內容，就一律讀取即時內容」，拿掉「必須原本是空的」這個限制，讓已置換的內容能覆蓋匯出資料。三處各自獨立修改，互不影響。

**Bug Fix C**：新增一個「有沒有手動置換過」的旗標，只在使用者真的透過右側欄上傳時才設定（`js/bn-editor-plugin.js` 三處：商品圖／人物圖／Logo 上傳成功時）；新增 `src/app.js` 的 `syncActiveProductAssets()` 函式，只在旗標有設定時才執行——沿用 Bug Fix B 已經寫好、測過的「產生正式檔名＋登記進 `assetIndex`」邏輯，套用到工單本身的 `productFilenames`／`logoFilenames`（不只是匯出用的副本），執行後清除旗標；在 `selectPlacement()`／`selectTemplate()`／`selectJob()` 既有呼叫 `syncActiveLayoutState()` 的地方，各自加一行呼叫這個新函式（同樣的 `skipSync` 判斷邏輯，避免連鎖呼叫時重複執行）。完全沒手動置換過的工單，旗標從未被設定，行為與修正前完全一致。

## 7. Locked Completed Phases Impact

本次為 Bug Fix，依 `docs/DOCUMENTATION.md` 的 Completed Phase Rule（Bug Fix 可重新開啟 Locked Completed Phase）重新開啟：

- **Project Persistence**（`buildProjectState()` / Project State 匯出邏輯 / `job.productFilenames`／`logoFilenames` 資料模型）
- **Render Context & Export Workflow**（`下載完整專案` / `batchRender()` 呼叫鏈路的一部分，雖然本次不修 `batchRender()` 本身，但共用 `cloneJobForExport()`）
- **Smart Layout Propagation**（Bug Fix C 新增的呼叫點位於 `selectPlacement()`／`selectTemplate()`／`selectJob()`，這幾個函式也是 Smart Layout Propagation 的呼叫路徑；本次不修改 Smart Layout Propagation 本身的擷取/套用邏輯，只在同一個既有「離開前同步」時機新增一個獨立呼叫）

不影響 Photoshop Automation、AI Workflow、Review Workspace、Review Workspace UI Upgrade 任何邏輯或 UI。

## 8. Boundaries（本次不修改）

- `applyWithOrder()` 核心套用邏輯（清空重建、autoTrim、autoShadow、sizeRatios）。
- `exportProjectZip()`（下載暫存用，已經有正確 try/catch，不受影響）。
- `batchRender()` 的 ZIP 打包／下載卡住問題（獨立 Proposal 處理）。
- Logo／商品圖上傳的 Slot 偵測規則（`detectProductPosition`、`detectLogoSlot`、檔名慣例）。
- Review Workspace、Photoshop Automation、AI Workflow、Project State schema 版本號。
- 一人一品上下移動（功能需求，不在本次範圍）。
- `layoutStates`、Master Layout（`captureProductMasterLayout`／`propagateProductMasterLayout`）、預設位置排序邏輯（Bug Fix C 明確不動，見第 5 節 Audit 確認）。
- `selectPlacement()`／`selectTemplate()`／`selectJob()` 既有的其他行為（Ready Check、版位/模板/工單切換、Thumbnail、Style），只新增一個獨立呼叫，不修改既有邏輯本身。

## 9. Proposal Audit Summary

- 技術可行性：可行，三處修正皆為既有函式呼叫端的資料組裝方式調整或新增獨立呼叫，不需新增資料結構（Bug Fix C 的旗標為單一 boolean，非新的資料模型）。
- Architecture / State Boundary：不影響 Canvas、`layoutStates`、Approved Asset Resolver、Project State schema 版本；Master Layout／預設位置排序邏輯已查證不依賴檔名，Bug Fix C 不影響其行為。
- Locked Completed Phases 影響：Project Persistence、Render Context & Export Workflow、Smart Layout Propagation（Bug Fix 允許重新開啟，見上；Smart Layout Propagation 本身邏輯不修改）。
- Scope creep 檢查：「下載卡住」與「一人一品上下移動」已明確排除，不在本次範圍；Bug Fix C 是回應 Jamie 實測發現的新問題，非額外擴大範圍臆測。
- Edge case 檢查：`window._bnProducts` 的 `.position` 欄位可靠性已確認（見第 5 節）；「下載單張暫存」同受影響已如實揭露，不隱藏；未手動置換過的工單，Bug Fix C 的旗標從未設定，行為不變。

## 10. Implementation Proposal

### 10.1 Bug Fix A（v2）：`js/bn-editor-plugin.js` — `applyWithOrder()`

`handleDirectProdFiles()` 完全不修改。只修改 `applyWithOrder()` 內部兩處：

**(1) 清除舊商品那一步**，從無條件清空全部，改成只清除 `orderedItems` 有對應到的那幾格：

```js
// 修改前：
var oldIds=window._bnProducts.map(function(p){return p.id;});
oldIds.forEach(function(id){broadcast({type:'bn-product-remove',id:id});});
window._bnProducts=[];

// 修改後：
/* 三品覆蓋 Bug Fix（v2）：只清除這次清單裡有對應到的格子，其他既有商品的
   DOM box／id 完全不動，比照既有「移除」按鈕只針對單一商品操作的做法
   （見 renderProdList 內 rmBtn 的 click handler）。 */
var replacedPositions = {};
orderedItems.forEach(function(item){
  var pos = item.position !== undefined ? item.position : null;
  if(pos !== null) replacedPositions[pos] = true;
});
var oldIdsToRemove = window._bnProducts
  .filter(function(p){ return replacedPositions[p.position !== undefined ? p.position : 0]; })
  .map(function(p){ return p.id; });
oldIdsToRemove.forEach(function(id){broadcast({type:'bn-product-remove',id:id});});
window._bnProducts = window._bnProducts.filter(function(p){
  return !replacedPositions[p.position !== undefined ? p.position : 0];
});
```

**(2) `sizeScale`／`zOrder` 的計算依據**，從迴圈索引 `i` 改成這一格實際的位置編號 `pos`（`pos` 本身的計算方式不變，只是提前用於 `sizeScale`／`zOrder`）：

```js
// 修改前：
var id='p'+Date.now()+'_'+i;
var sizeScale=sizeRatios?sizeRatios[i]||0.72:1;
var pos = item.position !== undefined ? item.position : i;
...
var prod = {..., sizeScale:sizeScale, position:pos, zOrder:i, ...};

// 修改後：
var id='p'+Date.now()+'_'+i;
var pos = item.position !== undefined ? item.position : i;
var sizeScale=sizeRatios?sizeRatios[pos]||0.72:1;
...
var prod = {..., sizeScale:sizeScale, position:pos, zOrder:pos, ...};
```

不修改 `handleDirectProdFiles()`、不修改 `_slotted`／`_unslotted` 既有的組裝/移除邏輯、不修改 slot 偵測規則（`detectProductPosition`）、不修改 `item.fromExisting` 這個既有分支（維持原樣不動，本次設計不會產生 `fromExisting:true` 的項目，但既有分支保留不刪除）、不修改 `broadcast` 訊息裡的 `index:i` 欄位（已確認接收端 `layout-runtime.js` 445 行 `position` 優先於 `index`，`position` 一定會明確帶入，`index` 不受影響）。

風險確認：沒被替換的既有商品，因為完全沒有被 `bn-product-remove`／`bn-product-add`，畫面上對應的 DOM box、id、圖片、使用者手動調整過的位置/大小狀態，全部原封不動保留，不會有 id 重新產生、不會有圖片重新載入的問題，因此不會影響到「核准去背圖片顯示」或「調整位置」這兩個既有功能。

### 10.2 Bug Fix B：`src/app.js` — `cloneJobForExport()`

三處判斷條件，拿掉「必須原本是空陣列」的限制，改為「只要 Canvas 上有內容就一律使用即時內容」；商品圖與一人一品維持既有的互斥關係（三品有內容時，人物/單品邏輯不執行，反之亦然，比照目前 UI 的互斥設計，避免同時寫入兩種來源造成衝突）：

```js
// 修改前：if (!copy.logoFilenames.length && window._bnLogos?.length) { ... }
// 修改後：
if (window._bnLogos?.length) { ...同樣邏輯，只是不再要求原本必須是空的... }

// 修改前：if (!copy.productFilenames.length && window._bnProducts?.length) { ... }
// 修改後：
if (window._bnProducts?.length) { ...同樣邏輯... }
// 修改前：if (!copy.productFilenames.length && (window._bnPerson || window._bnSingleProd)) { ... }
// 修改後（改為 else if，維持與三品的互斥，不重複判斷 copy.productFilenames.length）：
else if (window._bnPerson?.src || window._bnSingleProd?.src) { ...同樣邏輯... }
```

三段內部組裝 `_embeddedAssets`／檔名的邏輯本身不變，只調整外層判斷條件。`if (job.id !== activeJobId) return copy;` 這個「只套用在目前開啟編輯的工單」的既有邊界維持不變，不影響其他未開啟的工單。

### 10.3 影響範圍確認（Bug Fix A／B）

- `buildProjectState()` 的兩個呼叫者「下載單張暫存」與「下載完整專案」都會套用到 Bug Fix B，兩者都需要驗證。
- 對從未使用手動置換、`window._bnProducts` 內容與 `job.productFilenames` 原本就一致的工單，行為應等價於修正前（只是資料來源改為即時內容，內容相同），不應造成任何可觀察差異。

### 10.4 Bug Fix C：`js/bn-editor-plugin.js` ＋ `src/app.js`

**旗標**（`js/bn-editor-plugin.js`）：在三處手動上傳成功處新增 `window._bnManualAssetDirty = true;`：

- `handleDirectProdFiles()` 內，`await applyWithOrder(ordered, false);` 之後。
- `doLoadLogo()` 內，實際寫入 `window._bnLogos` 之後。
- `handlePersonProductFiles()` 內，`matched > 0`（確實有符合 `_人`／`_品` 檔名被處理）時。

**同步函式**（`src/app.js`，新增 `syncActiveProductAssets()`）：

```js
async function syncActiveProductAssets() {
  if (!window._bnManualAssetDirty) return;
  const job = activeJob();
  if (!job) return;
  const key = safeZipSegment(job.jobId || job.outputFilename || 'job');
  const labels = ['主品', '左配品', '右配品'];

  if (window._bnLogos?.length) {
    const names = [];
    for (let index = 0; index < window._bnLogos.length; index++) {
      const logo = window._bnLogos[index];
      const type = dataUrlMime(logo.src, 'image/png');
      const name = `${key}_LOGO_${String(index + 1).padStart(2, '0')}.${extFromMime(type)}`;
      indexMemoryAsset(name, await dataUrlToFile(logo.src, name, type));
      names.push(name);
    }
    job.logoFilenames = names;
  }

  if (window._bnProducts?.length) {
    const names = [];
    const sorted = window._bnProducts.slice().sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    for (const product of sorted) {
      const position = product.position ?? 0;
      const type = dataUrlMime(product.src, 'image/png');
      const name = `${key}_PRODUCT_${String(position + 1).padStart(2, '0')}_${labels[position] || '商品'}.${extFromMime(type)}`;
      indexMemoryAsset(name, await dataUrlToFile(product.src, name, type));
      names.push(name);
    }
    job.productFilenames = names;
  } else if (window._bnPerson?.src || window._bnSingleProd?.src) {
    const names = [];
    if (window._bnPerson?.src) {
      const type = dataUrlMime(window._bnPerson.src, 'image/png');
      const name = `${key}_PERSON_人.${extFromMime(type)}`;
      indexMemoryAsset(name, await dataUrlToFile(window._bnPerson.src, name, type));
      names.push(name);
    }
    if (window._bnSingleProd?.src) {
      const type = dataUrlMime(window._bnSingleProd.src, 'image/png');
      const name = `${key}_PRODUCT_品.${extFromMime(type)}`;
      indexMemoryAsset(name, await dataUrlToFile(window._bnSingleProd.src, name, type));
      names.push(name);
    }
    job.productFilenames = names;
  }
  window._bnManualAssetDirty = false;
}
```

沿用既有的 `dataUrlToFile()`（已存在，Project State 匯入時用來把 dataUrl 轉回 File）、`indexMemoryAsset()`（已存在，Project State 匯入時用來把記憶體內的檔案登記進 `assetIndex`，讓 `getAssetFile()` 之後查得到）、`dataUrlMime()`／`extFromMime()`（Bug Fix B 已經在用的既有函式）。全部是既有函式的重組合，沒有新增第二套機制。

**呼叫點**：在 `selectPlacement()`、`selectTemplate()`、`selectJob()` 內，緊接在既有的 `await syncActiveLayoutState();`（或其 `skipSync` 判斷）之後，加一行 `await syncActiveProductAssets();`，同樣尊重 `options.skipSync`，避免 `selectPlacement()` 呼叫 `selectTemplate(..., {skipSync:true})` 這種連鎖呼叫時重複執行。

**風險確認**：`window._bnManualAssetDirty` 未設定（也就是完全沒手動置換過）時，`syncActiveProductAssets()` 第一行就直接 return，不執行任何動作，工單資料完全不受影響。旗標只在三個明確的手動上傳成功點被設定，不會誤觸發。

### 10.5 影響範圍確認（Bug Fix C）

- 只影響「曾經手動置換過」的工單；未使用手動置換的工單，`job.productFilenames`／`logoFilenames` 維持原樣，不會被重新命名或轉檔。
- 不影響 `layoutStates`、Master Layout、預設位置排序（見第 5、8 節 Audit 確認）。
- Bug Fix B 修正的匯出邏輯（讀取 `window._bnProducts` 等即時內容）與 Bug Fix C 是互補關係：Bug Fix C 讓「切換尺寸/工單前」的即時內容正確寫回工單，Bug Fix B 讓「匯出當下」優先讀取即時內容（若尚未觸發過切換、即時內容還在的情況）；兩者疊加後，不論使用者是「置換後直接下載」還是「置換後先切換尺寸/工單再下載」，都能得到置換後的內容。

### 10.6 Validation 計畫

- Node 端邏輯驗證（Bug Fix A v2）：模擬 `window._bnProducts` 三品皆有既有內容，上傳 1 張新圖到其中一格，確認：(1) 結果三品皆存在、目標格是新內容、其餘兩格是原內容；(2) **其餘兩格的 id 與修正前完全相同**（沒有被重新產生）；(3) 只對目標格廣播 `bn-product-remove`／`bn-product-add`，其餘格子完全沒有被廣播移除或新增。另補「無編號新圖＋已滿三格」情境，確認不會超過 `MAX_PROD`。
- Browser Validation（Bug Fix A v2，比照 Jamie 實際發現迴歸的兩個情境，這次要明確驗證過才算過）：
  1. 三品皆為核准去背版本的真實素材，替換其中一格，確認**其餘兩格畫面顯示仍是核准去背版本**（不是原圖）。
  2. 替換其中一格後，**手動調整三張圖各自的位置／大小**，確認三張圖的位置對應正確、沒有錯亂。
- Node 端邏輯驗證（Bug Fix B）：模擬 `cloneJobForExport`，工單原本已有 `productFilenames`／`logoFilenames`，且即時內容與原檔名不同，確認匯出結果採用新內容。
- Browser Validation（Claude in Chrome，真實點擊）：
  1. 開啟一個既有三品工單，右側欄手動替換其中一格，確認畫面上另外兩格未消失（Bug Fix A，已完成，見上方驗證記錄）。
  2. 對同一工單分別執行「下載單張暫存」與「下載完整專案」，確認置換後的圖片被正確包含（Bug Fix B，已完成，見上方驗證記錄）。
  3.（Bug Fix C 新增）手動置換其中一格後，切換到另一個尺寸／版位，確認畫面顯示的仍是置換後的內容，位置/大小正常（不論是否套用 Master Layout）；再切換回原尺寸，確認也維持正確。
  4.（Bug Fix C 新增）手動置換後，切換到另一個工單、再切回來，確認置換內容仍保留。
  5.（Bug Fix C 新增）完全沒有手動置換過的工單，切換尺寸/工單前後，確認 `job.productFilenames`／`logoFilenames` 沒有被改名（regression）。
  6. 確認未使用手動置換的其他工單，匯出結果不受影響（regression）。
- 全部驗證通過後才交給 Jamie 做 Manual Validation。

### 10.7 Next Steps

- Implementation Proposal 確認後開始 Bug Fix C 的 Coding（Bug Fix A／B 已完成）。
- Coding 完成後依序：Node 驗證 → Browser Validation → 回報 Jamie 做 Manual Validation → Code Commit → Documentation Update → Documentation Validation → Docs Commit。
